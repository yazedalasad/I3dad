// screens/AdaptiveTest/TestResultsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

// ✅ existing radar component
import RadarChart from '../../components/AdaptiveTest/RadarChart';

export default function TestResultsScreen({ navigateTo, sessionId, language = 'ar' }) {
  const { studentData } = useAuth();
  const { t, i18n } = useTranslation();

  // Sync i18n language with prop
  useEffect(() => {
    const nextLang = String(language).toLowerCase() === 'he' ? 'he' : 'ar';
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const isArabic = String(i18n.language).toLowerCase() !== 'he';

  const tt = (key, fallback) => {
    const v = t(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // test_session_subjects rows with subject info

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        if (!studentData?.id) {
          Alert.alert(tt('errors.title', isArabic ? 'خطأ' : 'שגיאה'), tt('errors.somethingWrong', isArabic ? 'لم يتم العثور على الطالب' : 'לא נמצא תלמיד'));
          return;
        }

        if (!sessionId) {
          Alert.alert(
            tt('errors.title', isArabic ? 'خطأ' : 'שגיאה'),
            tt(
              'results.missingSessionId',
              isArabic
                ? 'لا يوجد sessionId لعرض النتائج. تأكد من تمريره عند إنهاء الاختبار.'
                : 'אין sessionId להצגת התוצאות. ודא/י שהוא נשלח בסיום המבחן.'
            )
          );
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
          Alert.alert(
            tt('errors.title', isArabic ? 'خطأ' : 'שגיאה'),
            tt('results.loadSubjectsFailed', isArabic ? 'فشل تحميل نتائج المواد' : 'טעינת תוצאות מקצועות נכשלה')
          );
          return;
        }

        if (!mounted) return;
        setRows(data || []);
      } catch (e) {
        console.log('TestResultsScreen error:', e?.message || e);
        Alert.alert(tt('errors.title', isArabic ? 'خطأ' : 'שגיאה'), tt('errors.somethingWrong', isArabic ? 'حدث خطأ غير متوقع.' : 'אירעה שגיאה לא צפויה.'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentData?.id, sessionId, isArabic]);

  const subjectResults = useMemo(() => {
    const list = (rows || []).map((r, idx) => {
      const answered = Number(r?.questions_answered || 0);
      const correct = Number(r?.correct_answers || 0);
      const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

      const s = r?.subjects;
      const name =
        (isArabic ? s?.name_ar : s?.name_he) ||
        s?.name_en ||
        s?.name_he ||
        s?.name_ar ||
        (isArabic ? `المادة ${idx + 1}` : `מקצוע ${idx + 1}`);

      return {
        subjectId: r.subject_id,
        subjectName: name,
        answered,
        correct,
        accuracy,
      };
    });

    // stable order
    list.sort((a, b) => a.subjectName.localeCompare(b.subjectName, isArabic ? 'ar' : 'he'));
    return list;
  }, [rows, isArabic]);

  const overallScore = useMemo(() => {
    if (!subjectResults.length) return 0;
    const sum = subjectResults.reduce((acc, r) => acc + (r.accuracy || 0), 0);
    return Math.round(sum / subjectResults.length);
  }, [subjectResults]);

  const getAbilityLevel = (score) => {
    if (isArabic) {
      if (score >= 85) return 'ممتاز';
      if (score >= 70) return 'جيد جدًا';
      if (score >= 55) return 'جيد';
      if (score >= 40) return 'مقبول';
      return 'ضعيف';
    }
    // Hebrew fallbacks (you can move to i18n later)
    if (score >= 85) return 'מצוין';
    if (score >= 70) return 'טוב מאוד';
    if (score >= 55) return 'טוב';
    if (score >= 40) return 'סביר';
    return 'חלש';
  };

  const level = getAbilityLevel(overallScore);

  const radarLabels = useMemo(() => subjectResults.map((r) => r.subjectName), [subjectResults]);
  const radarValues = useMemo(() => subjectResults.map((r) => r.accuracy), [subjectResults]);

  const goToReview = () => {
    if (!sessionId) {
      Alert.alert(
        tt('errors.title', isArabic ? 'خطأ' : 'שגיאה'),
        tt(
          'results.noSessionForReview',
          isArabic ? 'لا يوجد sessionId لعرض مراجعة الإجابات.' : 'אין sessionId להצגת סקירת תשובות.'
        )
      );
      return;
    }

    navigateTo('reviewAnswers', { sessionId, language: i18n.language });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>{tt('common.loading', isArabic ? 'جاري التحميل…' : 'טוען...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
        <Text style={styles.heroTitle}>{tt('results.title', isArabic ? 'نتائج الاختبار' : 'תוצאות מבחן')}</Text>

        <Text style={styles.heroSubtitle}>
          {tt('results.yourLevel', isArabic ? 'مستواك' : 'הרמה שלך')}: {level}
        </Text>

        <Text style={styles.heroSmall}>
          {tt('totalExam.score', isArabic ? 'النتيجة' : 'ציון')}: {overallScore}%
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {tt('results.strengths', isArabic ? 'نقاط القوة' : 'חוזקות')} {isArabic ? 'حسب المادة' : 'לפי מקצוע'}
        </Text>

        {subjectResults.length === 0 ? (
          <Text style={styles.muted}>
            {tt('results.noSubjects', isArabic ? 'لا توجد نتائج مواد لهذه الجلسة.' : 'אין תוצאות מקצועות לסשן הזה.')}
          </Text>
        ) : (
          <View style={styles.radarBox}>
            {/* Your RadarChart might use props: labels/values OR data. Keeping your original usage */}
            <RadarChart labels={radarLabels} values={radarValues} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{tt('results.details', isArabic ? 'تفصيل سريع' : 'פירוט מהיר')}</Text>

        {subjectResults.map((r) => (
          <View key={r.subjectId} style={styles.row}>
            <Text style={styles.rowName}>{r.subjectName}</Text>
            <Text style={styles.rowValue}>
              {r.accuracy}% ({r.correct}/{r.answered})
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.reviewBtn} onPress={goToReview}>
        <Text style={styles.reviewBtnText}>
          {tt('results.review', isArabic ? 'مراجعة' : 'סקירה')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('adaptiveTest')}>
        <Text style={styles.backBtnText}>{tt('common.back', isArabic ? 'رجوع' : 'חזרה')}</Text>
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

  reviewBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F5B301',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: { color: '#142B63', fontWeight: '900' },

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
