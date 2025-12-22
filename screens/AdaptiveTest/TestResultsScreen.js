import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ✅ use your existing radar component
import RadarChart from '../../components/AdaptiveTest/RadarChart';

export default function TestResultsScreen({ navigateTo, sessionId }) {
  const { studentData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // test_session_subjects rows with subject info

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        if (!studentData?.id) {
          Alert.alert('خطأ', 'لم يتم العثور على الطالب');
          return;
        }

        if (!sessionId) {
          Alert.alert('خطأ', 'لا يوجد sessionId لعرض النتائج. تأكد من تمريره عند إنهاء الاختبار.');
          return;
        }

        // ✅ Load per-subject results for this session
        const { data, error } = await supabase
          .from('test_session_subjects')
          .select(
            `
            subject_id,
            questions_answered,
            correct_answers,
            is_complete,
            metadata,
            subjects:subjects (
              id,
              name_ar,
              name_en,
              name_he
            )
          `
          )
          .eq('session_id', sessionId);

        if (error) {
          console.log('Results query error:', error);
          Alert.alert('خطأ', 'فشل تحميل نتائج المواد');
          return;
        }

        if (!mounted) return;
        setRows(data || []);
      } catch (e) {
        console.log('TestResultsScreen error:', e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentData?.id, sessionId]);

  const subjectResults = useMemo(() => {
    const list = (rows || []).map((r, idx) => {
      const answered = Number(r?.questions_answered || 0);
      const correct = Number(r?.correct_answers || 0);
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

      const s = r?.subjects;
      const name =
        s?.name_ar ||
        s?.name_en ||
        s?.name_he ||
        `المادة ${idx + 1}`;

      return {
        subjectId: r.subject_id,
        subjectName: name,
        answered,
        correct,
        accuracy,
      };
    });

    // Optional: keep stable order (by name)
    list.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'ar'));
    return list;
  }, [rows]);

  const overallScore = useMemo(() => {
    if (!subjectResults.length) return 0;
    const sum = subjectResults.reduce((acc, r) => acc + (r.accuracy || 0), 0);
    return Math.round(sum / subjectResults.length);
  }, [subjectResults]);

  const getAbilityLevel = (score) => {
    if (score >= 85) return 'ممتاز';
    if (score >= 70) return 'جيد جدًا';
    if (score >= 55) return 'جيد';
    if (score >= 40) return 'مقبول';
    return 'ضعيف';
  };

  const level = getAbilityLevel(overallScore);

  const radarLabels = useMemo(
    () => subjectResults.map((r) => r.subjectName),
    [subjectResults]
  );

  const radarValues = useMemo(
    () => subjectResults.map((r) => r.accuracy),
    [subjectResults]
  );

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
        <Text style={styles.heroSmall}>المعدل: {overallScore}%</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>قوة الطالب حسب المادة</Text>

        {subjectResults.length === 0 ? (
          <Text style={styles.muted}>لا توجد نتائج مواد لهذه الجلسة.</Text>
        ) : (
          <View style={styles.radarBox}>
            {/* ✅ Hexagon chart */}
            <RadarChart labels={radarLabels} values={radarValues} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>تفصيل سريع</Text>
        {subjectResults.map((r) => (
          <View key={r.subjectId} style={styles.row}>
            <Text style={styles.rowName}>{r.subjectName}</Text>
            <Text style={styles.rowValue}>
              {r.accuracy}% ({r.correct}/{r.answered})
            </Text>
          </View>
        ))}
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
  heroSmall: { color: '#DDE7FF', fontWeight: '800', marginTop: 6 },

  section: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
  },
  sectionTitle: { fontWeight: '900', color: '#102A68' },
  muted: { marginTop: 10, color: '#546A99', fontWeight: '700' },

  radarBox: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F6F8FF',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowName: { color: '#102A68', fontWeight: '900' },
  rowValue: { color: '#546A99', fontWeight: '900' },

  backBtn: {
    margin: 16,
    backgroundColor: '#1E4FBF',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '900' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { color: '#41547F', fontWeight: '900' },
});
