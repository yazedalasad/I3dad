import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';

// ✅ FIX: use default import (works regardless of named exports)
import adaptiveTestService from '../../services/adaptiveTestService';

export default function TestResultsScreen({ navigateTo }) {
  const { studentData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [allAbilities, setAllAbilities] = useState([]);
  const [comprehensiveResults, setComprehensiveResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const subjectNames = useMemo(() => {
    if (!comprehensiveResults?.length) return null;
    return comprehensiveResults.map((r) => r.subjectName).filter(Boolean);
  }, [comprehensiveResults]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        if (!studentData?.id) {
          Alert.alert('خطأ', 'لم يتم العثور على الطالب');
          return;
        }

        // If your screen already sets these elsewhere, keep your existing logic.
        // The main fix here is the recommendations import/call.

        // ✅ Recommendations (optional)
        if (typeof adaptiveTestService?.generateStudentRecommendations === 'function') {
          const recsResult = await adaptiveTestService.generateStudentRecommendations(studentData.id);
          if (mounted && recsResult?.success) {
            setRecommendations(recsResult.recommendations || []);
          }
        } else {
          // no recommendations feature -> keep empty
          if (mounted) setRecommendations([]);
        }

        if (mounted) setLoading(false);
      } catch (e) {
        console.log('TestResultsScreen error:', e);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentData?.id]);

  const overallScore = useMemo(() => {
    if (!comprehensiveResults || comprehensiveResults.length === 0) return 0;
    const sum = comprehensiveResults.reduce((acc, r) => acc + Number(r?.accuracy || 0), 0);
    return sum / comprehensiveResults.length;
  }, [comprehensiveResults]);

  const getAbilityLevel = (score) => {
    if (score >= 85) return 'ممتاز';
    if (score >= 70) return 'جيد جدًا';
    if (score >= 55) return 'جيد';
    if (score >= 40) return 'مقبول';
    return 'ضعيف';
  };

  const level = getAbilityLevel(overallScore);

  const getSubjectNameById = (subjectId, index) => {
    if (subjectNames && subjectNames[index]) return subjectNames[index];
    const ability = allAbilities.find((a) => a.subject_id === subjectId);
    return ability?.subjects?.name_ar || ability?.subjects?.name_en || `المادة ${index + 1}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>جارٍ تحميل النتائج...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
        <Text style={styles.heroTitle}>نتائج الاختبار</Text>
        <Text style={styles.heroSubtitle}>المستوى العام: {level}</Text>
      </LinearGradient>

      {/* Keep your existing UI below this point */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>توصيات</Text>
        {recommendations.length === 0 ? (
          <Text style={styles.muted}>لا توجد توصيات حالياً.</Text>
        ) : (
          recommendations.map((r, idx) => (
            <Text key={idx} style={styles.recItem}>• {String(r)}</Text>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('adaptiveTest')}>
        <Text style={styles.backBtnText}>رجوع</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 22 },
  hero: { padding: 18, borderRadius: 22, margin: 16 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 20 },
  heroSubtitle: { color: '#EAF0FF', fontWeight: '800', marginTop: 8 },
  section: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  sectionTitle: { fontWeight: '900', color: '#102A68' },
  muted: { marginTop: 10, color: '#546A99', fontWeight: '700' },
  recItem: { marginTop: 8, color: '#102A68', fontWeight: '800' },
  backBtn: { margin: 16, backgroundColor: '#1E4FBF', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { color: '#41547F', fontWeight: '900' }
});
