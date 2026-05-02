import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getCurrentPrincipal } from '../../services/principalExperienceService';
import { getSchoolStrengthsWeaknesses } from '../../services/schoolAnalyticsService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', danger: '#E74C3C' };

export default function SchoolStrengthsWeaknessesScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ strengths: [], weaknesses: [] });
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const principal = await getCurrentPrincipal();
      setData(await getSchoolStrengthsWeaknesses(principal.school_id));
    } catch (err) {
      setError(err?.message || 'تعذر تحميل نقاط القوة والضعف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  if (loading) return <Center text="جارٍ تحليل المجالات..." />;
  if (error) return <Center text={error} retry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>نقاط القوة والضعف</Text>
        <Text style={styles.subtitle}>تحليل المجالات القوية والضعيفة لطلاب المدرسة</Text>
        <Panel title="نقاط القوة" rows={data.strengths} color={colors.success} empty="لا توجد بيانات قوة بعد" />
        <Panel title="تحتاج متابعة" rows={data.weaknesses} color={colors.danger} empty="لا توجد بيانات ضعف بعد" />
      </ScrollView>
      <PrincipalTabs active="analytics" navigateTo={navigateTo} />
    </View>
  );
}

function Panel({ title, rows, color, empty }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length ? rows.map((row) => <Bar key={row.label} item={{ label: row.label, score: row.abilityAverage }} color={color} />) : <Text style={styles.emptyText}>{empty}</Text>}
    </View>
  );
}

function Bar({ item, color }) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barMeta}><Text style={styles.score}>{item.score}%</Text><Text style={styles.label}>{item.label}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, item.score)}%`, backgroundColor: color }]} /></View>
    </View>
  );
}

function Center({ text, retry }) {
  return <View style={styles.center}><ActivityIndicator color={retry ? 'transparent' : colors.primary} /><Text style={styles.centerText}>{text}</Text>{retry && <TouchableOpacity style={styles.retryButton} onPress={retry}><Text style={styles.retryText}>إعادة المحاولة</Text></TouchableOpacity>}</View>;
}

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
  card: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  sectionTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  barRow: { marginTop: 13 },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  score: { color: colors.secondary, fontWeight: '900' },
  track: { marginTop: 7, height: 8, borderRadius: 999, backgroundColor: '#E9EEFF', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  emptyText: { color: colors.secondary, fontWeight: '800', textAlign: 'center', paddingVertical: 18 },
});
