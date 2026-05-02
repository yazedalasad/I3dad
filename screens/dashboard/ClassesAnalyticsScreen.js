import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getCurrentPrincipal } from '../../services/principalExperienceService';
import { getSchoolClassesAnalytics } from '../../services/schoolAnalyticsService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', warning: '#F59E0B' };

export default function ClassesAnalyticsScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const principal = await getCurrentPrincipal();
      setRows(await getSchoolClassesAnalytics(principal.school_id, { language: 'ar' }));
    } catch (err) {
      setError(err?.message || 'تعذر تحميل تحليلات الصفوف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Center text="جارٍ تحميل تحليلات الصفوف..." />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header navigateTo={navigateTo} title="تحليلات الصفوف" subtitle="مقارنة أداء الصفوف ونسب الإكمال والاهتمامات" />
        {!rows.length ? (
          <Empty text="لم يبدأ الطلاب الاختبارات بعد" />
        ) : (
          rows.map((row) => (
            <View key={`${row.grade}-${row.classSection}`} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.iconCircle}><FontAwesome name="bar-chart" size={16} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{row.classLabel}</Text>
                  <Text style={styles.meta}>{row.studentsCount} طالب</Text>
                </View>
              </View>
              <Metric label="نسبة الإكمال" value={`${row.completionRate}%`} color={colors.success} />
              <Metric label="متوسط القوة" value={`${row.averageStrength}%`} color={colors.primary} />
              <Text style={styles.recommendation}>أعلى توصية: {row.topRecommendation}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <PrincipalTabs active="analytics" navigateTo={navigateTo} />
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

function Metric({ label, value, color }) {
  const width = `${Math.max(4, Number.parseInt(value, 10) || 0)}%`;
  return (
    <View style={styles.metricBlock}>
      <View style={styles.metricTop}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>
    </View>
  );
}

function Center({ text }) {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{text}</Text></View>;
}

function ErrorState({ text, onRetry }) {
  return <View style={styles.center}><Text style={styles.errorTitle}>تعذر تحميل البيانات</Text><Text style={styles.centerText}>{text}</Text><TouchableOpacity style={styles.retryButton} onPress={onRetry}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity></View>;
}

function Empty({ text }) {
  return <View style={styles.empty}><FontAwesome name="bar-chart" size={24} color={colors.secondary} /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900' },
  retryButton: { marginTop: 16, borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  header: { alignItems: 'flex-end' },
  backButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  iconCircle: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  meta: { marginTop: 3, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  metricBlock: { marginTop: 14 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { color: colors.dark, fontWeight: '900' },
  metricValue: { color: colors.secondary, fontWeight: '900' },
  track: { marginTop: 7, height: 8, borderRadius: 999, backgroundColor: '#E9EEFF', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  recommendation: { marginTop: 12, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
});
