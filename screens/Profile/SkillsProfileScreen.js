import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import RadarChart from '../../components/AdaptiveTest/RadarChart';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentSkillsProfile } from '../../services/skillsProfileService';

export default function SkillsProfileScreen({ navigateTo }) {
  const { studentData } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const isRtl = ['ar', 'he'].some((lang) => String(i18n.language || '').toLowerCase().startsWith(lang));
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const copy = isHebrew
    ? {
        title: 'פרופיל מיומנויות',
        subtitle: 'עקבו אחרי יכולות מעבר למקצועות וחברו אותן למסלולים עתידיים.',
        overview: 'מבט על המיומנויות המובילות',
        details: 'פירוט ציוני המיומנויות',
        openRecommendations: 'פתחו המלצות',
      }
    : {
        title: 'ملف المهارات',
        subtitle: 'تابع القدرات التي تتجاوز المواد الدراسية واربطها بالتخصصات المستقبلية.',
        overview: 'نظرة عامة على المهارات الأعلى',
        details: 'تفصيل درجات المهارات',
        openRecommendations: 'افتح التوصيات',
      };

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!studentData?.id) {
        setLoading(false);
        return;
      }

      const result = await getStudentSkillsProfile(studentData.id, {
        language: i18n.language,
      });

      if (cancelled) return;
      setProfile(result?.success ? result.data : null);
      setLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [studentData?.id, i18n.language]);

  const topSix = useMemo(() => (profile?.skills || []).slice().sort((a, b) => b.score - a.score).slice(0, 6), [profile?.skills]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('profile')}>
          <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, isRtl && styles.rtlText]}>{copy.title}</Text>
          <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{copy.subtitle}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>{copy.overview}</Text>
        <View style={styles.chartWrap}>
          <RadarChart
            labels={topSix.map((item) => item.label)}
            values={topSix.map((item) => item.score)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>{copy.details}</Text>
        {(profile?.skills || []).map((skill) => (
          <View key={skill.key} style={styles.skillRow}>
            <View style={styles.skillText}>
              <Text style={[styles.skillName, isRtl && styles.rtlText]}>{skill.label}</Text>
              <Text style={[styles.skillScore, isRtl && styles.rtlText]}>{skill.score}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${skill.score}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigateTo?.('recommendations')}
      >
        <Text style={styles.primaryBtnText}>{copy.openRecommendations}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerRtl: { flexDirection: 'row-reverse' },
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
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  chartWrap: { marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  skillRow: { marginTop: 12 },
  skillText: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  skillName: { color: '#0f172a', fontWeight: '800', flex: 1 },
  skillScore: { color: '#2563eb', fontWeight: '900' },
  track: {
    marginTop: 8,
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 999 },
  primaryBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  rtlText: { textAlign: 'right' },
});
