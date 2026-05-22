import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getCurrentPrincipal } from '../../services/principalExperienceService';
import { getSchoolAssessmentsTracking } from '../../services/schoolAnalyticsService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', warning: '#F59E0B', danger: '#E74C3C' };

function label(status) {
  if (status === 'completed') return { text: 'مكتمل', color: colors.success, bg: '#EAFBF1' };
  if (status === 'in_progress') return { text: 'قيد التنفيذ', color: colors.primary, bg: '#EEF4FF' };
  return { text: 'غير مكتمل', color: colors.warning, bg: '#FFF7E8' };
}

export default function AssessmentsTrackingScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const principal = await getCurrentPrincipal();
      setRows(await getSchoolAssessmentsTracking(principal.school_id));
    } catch (err) {
      setError(err?.message || 'تعذر تحميل تتبع الاختبارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Center text="جارٍ تحميل الاختبارات..." />;
  if (error) return <Center text={error} retry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>تتبع الاختبارات</Text>
        <Text style={styles.subtitle}>معرفة من بدأ ومن أكمل الاختبار داخل مدرستك</Text>
        {!rows.length ? (
          <Empty text="لم يبدأ الطلاب الاختبارات بعد" />
        ) : rows.map((row) => {
          const status = label(row.status);
          const name = `${row.student?.first_name || ''} ${row.student?.last_name || ''}`.trim() || 'طالب';
          return (
            <View key={row.id} style={styles.card}>
              <View style={styles.rowTop}>
                <View style={[styles.statusChip, { backgroundColor: status.bg }]}><Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text></View>
                <Text style={styles.cardTitle}>{name}</Text>
              </View>
              <Text style={styles.meta}>الصف: {row.student?.grade || '-'}</Text>
              <Text style={styles.meta}>بدأ: {row.started_at ? new Date(row.started_at).toLocaleString('ar') : '-'}</Text>
              <Text style={styles.meta}>المدة: {row.total_time_seconds || 0} ثانية</Text>
            </View>
          );
        })}
      </ScrollView>
      <PrincipalTabs active="analytics" navigateTo={navigateTo} />
    </View>
  );
}

function Center({ text, retry }) {
  return <View style={styles.center}><ActivityIndicator color={retry ? 'transparent' : colors.primary} /><Text style={styles.centerText}>{text}</Text>{retry && <TouchableOpacity style={styles.retryButton} onPress={retry}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>}</View>;
}
function Empty({ text }) { return <View style={styles.empty}><FontAwesome name="tasks" size={24} color={colors.secondary} /><Text style={styles.emptyText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 16, fontWeight: '900' },
  meta: { marginTop: 7, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
});
