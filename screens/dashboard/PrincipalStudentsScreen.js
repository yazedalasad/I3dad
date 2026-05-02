import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getPrincipalStudentRows } from '../../services/principalExperienceService';

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

const grades = ['all', '9', '10', '11', '12'];
const statuses = ['all', 'completed', 'not_completed'];

export default function PrincipalStudentsScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [principal, setPrincipal] = useState(null);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [status, setStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPrincipalStudentRows();
      setPrincipal(result.principal);
      setRows(result.rows);
    } catch (err) {
      setError(err?.message || 'تعذر تحميل الطلاب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((student) => {
      if (q) {
        const haystack = `${student.full_name} ${student.student_id || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (grade !== 'all' && String(student.grade) !== grade) return false;
      if (status !== 'all' && student.completion_status !== status) return false;
      return true;
    });
  }, [grade, query, rows, status]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.centerText}>جارٍ تحميل طلاب المدرسة...</Text>
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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Header navigateTo={navigateTo} title="طلاب المدرسة" subtitle={principal?.school_name || 'مدرستك'} />

        <View style={styles.searchCard}>
          <View style={styles.searchBox}>
            <FontAwesome name="search" size={15} color={colors.secondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث عن طالب..."
              placeholderTextColor="#8EA0C8"
              style={styles.searchInput}
              textAlign="right"
            />
          </View>
          <ChipGroup
            items={grades.map((item) => ({ value: item, label: item === 'all' ? 'كل الصفوف' : `صف ${item}` }))}
            value={grade}
            onChange={setGrade}
          />
          <ChipGroup
            items={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'completed', label: 'مكتمل' },
              { value: 'not_completed', label: 'غير مكتمل' },
            ]}
            value={status}
            onChange={setStatus}
          />
        </View>

        {!rows.length ? (
          <Empty text="لا يوجد طلاب مرتبطون بهذه المدرسة حتى الآن" />
        ) : !filtered.length ? (
          <Empty text="لا يوجد طلاب مطابقون للبحث أو الفلاتر" />
        ) : (
          filtered.map((student) => (
            <StudentCard key={student.id} student={student} navigateTo={navigateTo} />
          ))
        )}
      </ScrollView>
      <PrincipalTabs active="students" navigateTo={navigateTo} />
    </View>
  );
}

function Header({ navigateTo, title, subtitle }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
        <FontAwesome name="chevron-right" size={13} color={colors.primary} />
        <Text style={styles.backText}>رجوع</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function ChipGroup({ items, value, onChange }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.value}
          style={[styles.chip, value === item.value && styles.chipActive]}
          onPress={() => onChange(item.value)}
        >
          <Text style={[styles.chipText, value === item.value && styles.chipTextActive]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StudentCard({ student, navigateTo }) {
  const completed = student.completion_status === 'completed';
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentTop}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{student.full_name}</Text>
          <Text style={styles.studentMeta}>{student.class_label}</Text>
        </View>
        <View style={[styles.statusChip, completed ? styles.statusDone : styles.statusPending]}>
          <Text style={[styles.statusText, completed ? styles.statusDoneText : styles.statusPendingText]}>
            {completed ? 'مكتمل' : 'غير مكتمل'}
          </Text>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <Metric label="متوسط الأداء" value={`${student.average_score}%`} />
        <Metric label="آخر اختبار" value={student.last_test_date ? new Date(student.last_test_date).toLocaleDateString('ar') : '-'} />
      </View>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={() => navigateTo?.('principalStudentDetails', { studentId: student.id })}
      >
        <Text style={styles.detailsText}>عرض التفاصيل</Text>
        <FontAwesome name="arrow-left" size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={styles.empty}>
      <FontAwesome name="users" size={24} color={colors.secondary} />
      <Text style={styles.emptyText}>{text}</Text>
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
  header: { alignItems: 'flex-end' },
  backButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  searchCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 13 },
  searchBox: { minHeight: 48, borderRadius: 16, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.dark, fontWeight: '800' },
  chips: { marginTop: 10, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.secondary, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: '#fff' },
  studentCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14 },
  studentTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  studentName: { color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  studentMeta: { marginTop: 3, color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusDone: { backgroundColor: '#EAFBF1' },
  statusPending: { backgroundColor: '#FFF7E8' },
  statusText: { fontSize: 11, fontWeight: '900' },
  statusDoneText: { color: '#16864A' },
  statusPendingText: { color: '#9A5B00' },
  metricsRow: { marginTop: 12, flexDirection: 'row-reverse', gap: 10 },
  metric: { flex: 1, borderRadius: 15, backgroundColor: '#F8FAFF', padding: 10, alignItems: 'flex-end' },
  metricValue: { color: colors.dark, fontWeight: '900' },
  metricLabel: { marginTop: 3, color: colors.secondary, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  detailsButton: { marginTop: 12, minHeight: 43, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  detailsText: { color: '#fff', fontWeight: '900' },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
});
