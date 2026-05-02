import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getPrincipalStudentRows } from '../../services/principalExperienceService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF' };

export default function PrincipalReportsScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const result = await getPrincipalStudentRows();
      if (!mounted) return;
      setPrincipal(result.principal);
      setRows(result.rows.filter((row) => row.latestSession || row.average_score > 0));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>جارٍ تحميل التقارير...</Text></View>;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>تقارير الطلاب</Text>
        <Text style={styles.subtitle}>{principal?.school_name || 'مدرستك'}</Text>
        {!rows.length ? (
          <View style={styles.empty}><FontAwesome name="file-text-o" size={26} color={colors.secondary} /><Text style={styles.emptyText}>لم يتم إنشاء تقارير بعد</Text></View>
        ) : rows.map((row) => (
          <TouchableOpacity key={row.id} style={styles.card} onPress={() => navigateTo?.('principalStudentDetails', { studentId: row.id })}>
            <View style={styles.icon}><FontAwesome name="file-text-o" size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{row.full_name}</Text>
              <Text style={styles.meta}>{row.class_label} · متوسط الأداء {row.average_score}%</Text>
            </View>
            <FontAwesome name="chevron-left" size={13} color={colors.secondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <PrincipalTabs active="reports" navigateTo={navigateTo} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  meta: { marginTop: 4, color: colors.secondary, fontWeight: '800', fontSize: 12, textAlign: 'right' },
});
