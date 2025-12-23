import { Ionicons } from '@expo/vector-icons';
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

import QuestionCard from '../../components/AdaptiveTest/QuestionCard';

export default function ReviewAnswersScreen({ navigateTo, sessionId, language = 'ar' }) {
  const { studentData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // [{ response, question }]

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
          Alert.alert('خطأ', 'لا يوجد sessionId لعرض مراجعة الإجابات.');
          return;
        }

        // ✅ Load all responses for this session + join questions
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
          Alert.alert('خطأ', 'فشل تحميل مراجعة الإجابات.');
          return;
        }

        if (!mounted) return;

        const normalized =
          (data || [])
            .map((r) => {
              const q = r?.questions || null;
              if (!q) return null;

              // Inject order so QuestionCard can display it
              const question = {
                ...q,
                question_order: r.question_order,
              };

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
        console.log('ReviewAnswersScreen error:', e?.message || e);
        Alert.alert('خطأ', 'حدث خطأ أثناء تحميل المراجعة.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentData?.id, sessionId]);

  const summary = useMemo(() => {
    const total = items.length;
    const correct = items.reduce((acc, it) => acc + (it?.response?.isCorrect ? 1 : 0), 0);
    const wrong = Math.max(0, total - correct);
    return { total, correct, wrong };
  }, [items]);

  const goBack = () => {
    // Go back to results (or any screen you prefer)
    navigateTo?.('testResults', { sessionId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>جارٍ تحميل مراجعة الإجابات...</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.page}>
        <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
          <Text style={styles.heroTitle}>مراجعة الإجابات</Text>
          <Text style={styles.heroSubtitle}>لا توجد إجابات لهذه الجلسة.</Text>
        </LinearGradient>

        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>مراجعة الإجابات</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>صحيح: {summary.correct}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="close-circle" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>خطأ: {summary.wrong}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="list" size={16} color="#EAF0FF" />
              <Text style={styles.badgeText}>المجموع: {summary.total}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroHint}>
          هنا يمكنك رؤية إجابتك والإجابة الصحيحة بعد إنهاء الاختبار.
        </Text>
      </LinearGradient>

      {/* Render every question in REVIEW mode */}
      {items.map((it) => (
        <View key={it.response.id} style={styles.cardWrap}>
          <QuestionCard
            question={it.question}
            selectedAnswer={it.response.selectedAnswer}
            disabled={true}
            onAnswerSelect={null}
            onSkipQuestion={null}
            language={language}
            timeRemaining={null}
            maxTime={0}
            showFeedback={true}
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
              <Ionicons
                name={it.response.isCorrect ? 'checkmark' : 'close'}
                size={14}
                color="#fff"
              />
              <Text style={styles.resultText}>
                {it.response.isCorrect ? 'صحيح' : 'خطأ'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <Text style={styles.backBtnText}>رجوع للنتائج</Text>
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
