import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { getSchoolMajorsAnalytics } from '../../services/schoolAnalyticsService';

export default function MajorsAnalyticsScreen({ navigateTo }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: principal } = await supabase
        .from('principals')
        .select('school_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      const result = principal?.school_id ? await getSchoolMajorsAnalytics(principal.school_id, { language: 'ar' }) : [];
      if (cancelled) return;
      setRows(result);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const copy = isHebrew
    ? { back: 'חזרה', title: 'ניתוח תחומי לימוד', subtitle: 'ראו את התחומים המומלצים ביותר ברחבי בית הספר.' }
    : { back: 'رجوع', title: 'تحليل التخصصات', subtitle: 'شاهد أكثر التخصصات المقترحة على مستوى المدرسة.' };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('principalDashboard')}>
        <FontAwesome name="arrow-left" size={15} color="#1d4ed8" />
        <Text style={styles.backText}>{copy.back}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      {rows.map((row, index) => (
        <View key={row.majorName} style={styles.card}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Text style={styles.cardTitle}>{row.majorName}</Text>
          <Text style={styles.meta}>Students: {row.studentsCount}</Text>
          <Text style={styles.meta}>Average match: {row.averageMatch}%</Text>
          <Text style={styles.meta}>Top grade: {row.topGrade}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f6fb' },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f6fb' },
  backBtn: { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  backText: { color: '#1d4ed8', fontWeight: '900' },
  title: { marginTop: 14, color: '#0f172a', fontWeight: '900', fontSize: 24 },
  subtitle: { marginTop: 6, color: '#64748b', fontWeight: '700' },
  card: { marginTop: 14, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  rank: { color: '#16a34a', fontWeight: '900' },
  cardTitle: { marginTop: 4, color: '#0f172a', fontWeight: '900', fontSize: 16 },
  meta: { marginTop: 6, color: '#334155', fontWeight: '700' },
});
