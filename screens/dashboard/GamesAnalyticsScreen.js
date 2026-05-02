import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { getSchoolGamesAnalytics } from '../../services/schoolAnalyticsService';

const GAME_LABELS = {
  doctor_soroka: 'لعبة الطبيب بالعبرية',
  physics_lab: 'لعبة الفيزياء بالإنجليزية',
  arabic_poet_puzzle: 'لعبة الكلمات العربية',
};

export default function GamesAnalyticsScreen({ navigateTo }) {
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

      const result = principal?.school_id ? await getSchoolGamesAnalytics(principal.school_id) : [];
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
    ? { back: 'חזרה', title: 'ניתוח משחקים' }
    : { back: 'رجوع', title: 'تحليل الألعاب' };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('principalDashboard')}>
        <FontAwesome name="arrow-left" size={15} color="#1d4ed8" />
        <Text style={styles.backText}>{copy.back}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{copy.title}</Text>

      {rows.map((row) => (
        <View key={row.gameId} style={styles.card}>
          <Text style={styles.cardTitle}>{GAME_LABELS[row.gameId] || row.gameId}</Text>
          <Text style={styles.meta}>Players: {row.plays}</Text>
          <Text style={styles.meta}>Average score: {row.averageScore}%</Text>
          <Text style={styles.meta}>Average engagement: {row.averageEngagement}%</Text>
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
  card: { marginTop: 14, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  meta: { marginTop: 6, color: '#334155', fontWeight: '700' },
});
