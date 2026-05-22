import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getPrincipalStudentDetails } from '../../services/principalExperienceService';

const colors = {
  bg: '#F6F8FF',
  primary: '#1E4FBF',
  dark: '#102A68',
  secondary: '#546A99',
  border: '#E5ECFF',
  success: '#2ECC71',
  warning: '#F59E0B',
  danger: '#E74C3C',
};

export default function StudentReportDetailsScreen({ navigateTo, route = { params: {} } }) {
  const studentId = route?.params?.studentId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (!studentId) throw new Error('لم يتم اختيار طالب.');
      setData(await getPrincipalStudentDetails(studentId));
    } catch (err) {
      setError(err?.message || 'تعذر تحميل تفاصيل الطالب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [studentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.centerText}>جارٍ تحميل تقرير الطالب...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>تعذر تحميل البيانات</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { student, latestSession, strengths, weaknesses, interests } = data;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalStudents')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>رجوع للطلاب</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <FontAwesome name="user" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>{student.full_name}</Text>
          <Text style={styles.subtitle}>{student.class_label} · {student.school_name || 'المدرسة'}</Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusText}>حالة الاختبار: {latestSession?.status === 'completed' ? 'مكتمل' : latestSession?.status === 'in_progress' ? 'قيد التنفيذ' : 'غير مكتمل'}</Text>
          </View>
        </View>

        <Section title="ملخص الطالب">
          <Info label="رقم الطالب" value={student.student_id || '-'} />
          <Info label="آخر اختبار" value={latestSession?.started_at ? new Date(latestSession.started_at).toLocaleDateString('ar') : '-'} />
          <Info label="وقت الاختبار" value={latestSession?.total_time_seconds ? `${latestSession.total_time_seconds} ثانية` : '-'} />
        </Section>

        <Section title="النتائج حسب المجالات">
          <MiniRadar title="نقاط القوة" rows={strengths} color={colors.success} empty="لا توجد نتائج قوة بعد" />
          <MiniRadar title="نقاط تحتاج متابعة" rows={weaknesses} color={colors.danger} empty="لا توجد بيانات ضعف بعد" />
        </Section>

        <Section title="الاهتمامات والتوصيات">
          {interests.length ? interests.map((item) => <Bar key={item.label} item={item} color={colors.primary} />) : <Text style={styles.emptyText}>لا توجد اهتمامات مسجلة بعد</Text>}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>ملاحظة متابعة</Text>
            <Text style={styles.noteText}>هذه الشاشة للعرض فقط. لا يتم تعديل بيانات الطالب الأساسية من حساب المدير.</Text>
          </View>
        </Section>
      </ScrollView>
      <PrincipalTabs active="reports" navigateTo={navigateTo} />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function MiniRadar({ title, rows, color, empty }) {
  return (
    <View style={styles.radarBlock}>
      <Text style={styles.radarTitle}>{title}</Text>
      {rows.length ? rows.map((item) => <Bar key={item.label} item={item} color={color} />) : <Text style={styles.emptyText}>{empty}</Text>}
    </View>
  );
}

function Bar({ item, color }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barMeta}>
        <Text style={styles.barScore}>{item.score}%</Text>
        <Text style={styles.barLabel}>{item.label}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(4, item.score)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  retryButton: { marginTop: 16, borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  hero: { marginTop: 14, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18, alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 12, color: colors.dark, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { marginTop: 4, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  statusChip: { marginTop: 12, borderRadius: 999, backgroundColor: '#EEF4FF', paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { color: colors.primary, fontWeight: '900', fontSize: 17 },
  card: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  sectionTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F4FF' },
  infoLabel: { color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  infoValue: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'left' },
  radarBlock: { marginTop: 6 },
  radarTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  barRow: { marginTop: 10 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  barLabel: { flex: 1, color: colors.dark, fontWeight: '800', textAlign: 'right' },
  barScore: { color: colors.secondary, fontWeight: '900' },
  barTrack: { marginTop: 6, height: 8, borderRadius: 999, backgroundColor: '#E9EEFF', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  noteBox: { marginTop: 14, borderRadius: 16, backgroundColor: '#FFF7E8', borderWidth: 1, borderColor: '#FDE7BC', padding: 12 },
  noteTitle: { color: '#9A5B00', fontWeight: '900', textAlign: 'right' },
  noteText: { marginTop: 5, color: '#9A5B00', fontWeight: '800', lineHeight: 20, textAlign: 'right' },
  emptyText: { color: colors.secondary, fontWeight: '800', textAlign: 'center', paddingVertical: 12 },
});
