import { Ionicons } from '@expo/vector-icons';
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
import QuestionCard from './QuestionCard';

export default function ReviewAnswersScreen({ navigateTo, sessionId, language = 'ar' }) {
  const { studentData } = useAuth();

  // ✅ IMPORTANT: use the AdaptiveTest component namespace
  const { t, i18n } = useTranslation('componentsAdaptiveTest');

  // Optional: sync language with prop (so component works standalone too)
  useEffect(() => {
    const nextLang = String(language).toLowerCase().startsWith('he') ? 'he' : 'ar';
    if (String(i18n.language).toLowerCase() !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const isArabic = String(i18n.language).toLowerCase() !== 'he';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // [{ response, question }]

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        if (!studentData?.id) {
          Alert.alert(
            t('generic.error', isArabic ? 'خطأ' : 'שגיאה'),
            isArabic ? 'لم يتم العثور على الطالب' : 'לא נמצא תלמיד'
          );
          return;
        }

        if (!sessionId) {
          Alert.alert(
            t('generic.error', isArabic ? 'خطأ' : 'שגיאה'),
            isArabic ? 'لا يوجد sessionId لعرض مراجعة الإجابات.' : 'אין sessionId להצגת סקירת תשובות.'
          );
          return;
        }

        const { data, error } = await supabase
          .from('student_responses')
          .select(
            `
            id,
            session_id,
            question_id,
            student_id,
            selected_answer,
            is_correct,
            time_taken_seconds,
            question_order,
            created_at,
            questions:questions (
              *
            )
          `
          )
          .eq('session_id', sessionId)
          .order('question_order', { ascending: true });

        if (error) {
          console.log('Review answers query error:', error);
          Alert.alert(
            t('generic.error', isArabic ? 'خطأ' : 'שגיאה'),
            isArabic ? 'فشل تحميل مراجعة الإجابات.' : 'טעינת סקירת התשובות נכשלה.'
          );
          return;
        }

        if (!mounted) return;

        const normalized =
          (data || [])
            .map((r) => {
              const q = r?.questions || null;
              if (!q) return null;

              const question = { ...q, question_order: r.question_order };

              return {
                response: {
                  id: r.id,
                  questionId: r.question_id,
                  selectedAnswer: r.selected_answer,
                  isCorrect: !!r.is_correct,
                  timeTakenSeconds: r.time_taken_seconds,
                  order: r.question_order,
                },
                question,
              };
            })
            .filter(Boolean) || [];

        setItems(normalized);
      } catch (e) {
        console.log('ReviewAnswers error:', e?.message || e);
        Alert.alert(
          t('generic.error', isArabic ? 'خطأ' : 'שגיאה'),
          t('generic.unknownError', isArabic ? 'حدث خطأ غير متوقع.' : 'אירעה שגיאה לא צפויה.')
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentData?.id, sessionId, i18n.language]);

  const summary = useMemo(() => {
    const total = items.length;
    const correct = items.reduce((acc, it) => acc + (it?.response?.isCorrect ? 1 : 0), 0);
    const wrong = Math.max(0, total - correct);
    return { total, correct, wrong };
  }, [items]);

  const goBack = () => {
    navigateTo?.('testResults', { sessionId, language: i18n.language });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>{t('review.loading')}</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
          <Text style={styles.heroTitle}>{t('review.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('review.empty')}</Text>
        </LinearGradient>

        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>{t('generic.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>{t('review.title')}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>
                {t('review.correct')}: {summary.correct}
              </Text>
            </View>

            <View style={styles.badge}>
              <Ionicons name="close-circle" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>
                {t('review.wrong')}: {summary.wrong}
              </Text>
            </View>

            <View style={styles.badge}>
              <Ionicons name="list" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>
                {t('review.total')}: {summary.total}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroHint}>{t('review.hint')}</Text>
      </LinearGradient>

      {items.map((it) => (
        <View key={it.response.id} style={styles.cardWrap}>
          <QuestionCard
            question={it.question}
            selectedAnswer={it.response.selectedAnswer}
            disabled
            language={i18n.language}
            timeRemaining={null}
            maxTime={0}
            showFeedback
            isCorrect={it.response.isCorrect}
          />

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color="#546A99" />
              <Text style={styles.metaText}>
                {Number.isFinite(Number(it.response.timeTakenSeconds))
                  ? `${it.response.timeTakenSeconds}s`
                  : '—'}
              </Text>
            </View>

            <View
              style={[
                styles.resultChip,
                it.response.isCorrect ? styles.correctChip : styles.wrongChip,
              ]}
            >
              <Ionicons name={it.response.isCorrect ? 'checkmark' : 'close'} size={14} color="#fff" />
              <Text style={styles.resultText}>
                {it.response.isCorrect ? t('review.correct') : t('review.wrong')}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <Text style={styles.backBtnText}>{t('generic.backToResults')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 22 },

  hero: { padding: 18, borderRadius: 22, margin: 16 },
  heroTop: { gap: 10 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 20 },
  heroSubtitle: { color: '#EAF0FF', fontWeight: '800', marginTop: 8 },
  heroHint: { marginTop: 12, color: '#DDE7FF', fontWeight: '700', lineHeight: 20 },

  badgeRow: { flexDirection: 'row-reverse', gap: 10, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  badgeText: { color: '#EAF0FF', fontWeight: '900' },

  cardWrap: { marginBottom: 8 },

  metaRow: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  metaText: { color: '#546A99', fontWeight: '900' },

  resultChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  correctChip: { backgroundColor: '#2ecc71' },
  wrongChip: { backgroundColor: '#e74c3c' },
  resultText: { color: '#fff', fontWeight: '900' },

  backBtn: {
    marginHorizontal: 16,
    marginTop: 16,
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
