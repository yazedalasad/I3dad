import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../config/supabase';

const exportCards = [
  { key: 'school-pdf', title: 'School CSV', subtitle: 'Complete school-level summary for the principal.' },
  { key: 'class-pdf', title: 'Class CSV', subtitle: 'Export classes with key strengths and gaps.' },
  { key: 'excel', title: 'Excel Export', subtitle: 'Structured table for students, majors, and completion.' },
  { key: 'major-report', title: 'Major CSV', subtitle: 'Group students by best-fit specialization.' },
];

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ].join('\n');
}

function downloadCsv(filename, csv) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('CSV export is currently available from the web dashboard.');
  }

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function loadExportRows(type) {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, email, grade, class_section, school_name, school_id, created_at')
    .limit(1000);
  if (studentsError) throw studentsError;

  const studentIds = (students || []).map((student) => student.id).filter(Boolean);
  const sessionsResult = studentIds.length
    ? await supabase
        .from('test_sessions')
        .select('student_id, status, final_score, completed_at, started_at')
        .in('student_id', studentIds)
        .limit(2000)
    : { data: [], error: null };
  if (sessionsResult.error) throw sessionsResult.error;

  const sessionsByStudent = new Map();
  (sessionsResult.data || []).forEach((session) => {
    if (!sessionsByStudent.has(session.student_id)) sessionsByStudent.set(session.student_id, []);
    sessionsByStudent.get(session.student_id).push(session);
  });

  const baseRows = (students || []).map((student) => {
    const sessions = sessionsByStudent.get(student.id) || [];
    const completed = sessions.filter((session) => session.status === 'completed');
    const latest = sessions.slice().sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))[0] || null;
    const avgScore = completed.length
      ? Math.round(completed.reduce((sum, session) => sum + Number(session.final_score || 0), 0) / completed.length)
      : '';
    return {
      student_id: student.student_id || '',
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email || '',
      email: student.email || '',
      school_name: student.school_name || '',
      grade: student.grade || '',
      class_section: student.class_section || '',
      completed_tests: completed.length,
      latest_status: latest?.status || 'not_started',
      average_score: avgScore,
      created_at: student.created_at || '',
    };
  });

  if (type !== 'major-report') return baseRows;

  const signalsResult = studentIds.length
    ? await supabase
        .from('student_career_signals')
        .select('student_id, degree_code, career_signal')
        .in('student_id', studentIds)
        .limit(2000)
    : { data: [], error: null };
  const signals = signalsResult.error ? [] : signalsResult.data || [];
  const bestSignalByStudent = new Map();
  signals.forEach((signal) => {
    const current = bestSignalByStudent.get(signal.student_id);
    if (!current || Number(signal.career_signal || 0) > Number(current.career_signal || 0)) {
      bestSignalByStudent.set(signal.student_id, signal);
    }
  });

  return baseRows.map((row, index) => {
    const student = students[index];
    const signal = bestSignalByStudent.get(student?.id);
    return {
      ...row,
      best_major_code: signal?.degree_code || '',
      game_career_signal: signal?.career_signal || '',
    };
  });
}

export default function ExportReportsScreen({ navigateTo }) {
  const { i18n } = useTranslation();
  const [exportingKey, setExportingKey] = useState(null);
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const copy = isHebrew
    ? {
        title: 'ייצוא דוחות',
        subtitle: 'הכינו סיכומי בית ספר, כיתה ומסלולי התמחות להורדה או להצגה.',
        export: 'ייצוא',
        exporting: 'מייצא...',
        successTitle: 'הייצוא מוכן',
        successBody: 'קובץ CSV הורד למחשב.',
        emptyTitle: 'אין נתונים',
        emptyBody: 'לא נמצאו נתונים לייצוא כרגע.',
      }
    : {
        title: 'تصدير التقارير',
        subtitle: 'جهّز تقارير المدرسة، الصفوف، والتخصصات للعرض أو التنزيل.',
        export: 'تصدير',
        exporting: 'جاري التصدير...',
        successTitle: 'تم تجهيز التصدير',
        successBody: 'تم تنزيل ملف CSV على الجهاز.',
        emptyTitle: 'لا توجد بيانات',
        emptyBody: 'لا توجد بيانات متاحة للتصدير حالياً.',
      };
  const handleExport = async (card) => {
    try {
      setExportingKey(card.key);
      const rows = await loadExportRows(card.key);
      if (!rows.length) {
        Alert.alert(copy.emptyTitle, copy.emptyBody);
        return;
      }

      downloadCsv(`i3dad-${card.key}-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(rows));
      Alert.alert(copy.successTitle, copy.successBody);
    } catch (error) {
      Alert.alert(copy.emptyTitle, error?.message || copy.emptyBody);
    } finally {
      setExportingKey(null);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('adminDashboard')}>
          <FontAwesome name="arrow-left" size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
      </View>

      {exportCards.map((card) => (
        <View key={card.key} style={styles.card}>
          <View style={styles.cardLead}>
            <View style={styles.iconWrap}>
              <FontAwesome name="file-text" size={18} color="#1d4ed8" />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, exportingKey === card.key && styles.actionBtnDisabled]}
            onPress={() => handleExport(card)}
            disabled={!!exportingKey}
          >
            {exportingKey === card.key ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>{copy.export}</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, color: '#475569', lineHeight: 20, fontWeight: '700' },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardLead: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  cardSubtitle: { marginTop: 4, color: '#64748b', fontWeight: '700', lineHeight: 18 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { color: '#fff', fontWeight: '900' },
});
