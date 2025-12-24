// screens/AdaptiveTest/PersonalityTestScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  completePersonalityTest,
  getPersonalityQuestion,
  startPersonalityTest,
  submitPersonalityAnswer,
} from '../../services/personalityTestService';

// ✅ how many questions before we jump to results fast
const FAST_RESULT_LIMIT = 12;

export default function PersonalityTestScreen({
  navigateTo,
  studentId,
  language = 'ar',
  abilitySessionId = null, // pass from ability exam if exists
  existingPersonalitySessionId = null, // optional resume
}) {
  const [initializing, setInitializing] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sessionId, setSessionId] = useState(existingPersonalitySessionId);
  const [question, setQuestion] = useState(null);

  // We show total = FAST_RESULT_LIMIT (fast mode)
  const [progress, setProgress] = useState({ answered: 0, total: FAST_RESULT_LIMIT });

  // answers
  const [scaleValue, setScaleValue] = useState(null);
  const [choiceIndex, setChoiceIndex] = useState(null);
  const [textValue, setTextValue] = useState('');

  // extra types
  const [forcedChoice, setForcedChoice] = useState(null); // 'A' | 'B'
  const [rankingOrder, setRankingOrder] = useState([]); // ordered items

  const questionStartRef = useRef(Date.now());
  const isArabic = String(language).toLowerCase() !== 'he';

  const qText = useMemo(() => {
    if (!question) return '';
    return (isArabic ? question.question_text_ar : question.question_text_he) || '';
  }, [question, isArabic]);

  const dimensionName = useMemo(() => {
    const d = question?.personality_dimensions;
    if (!d) return '';
    return (isArabic ? d.name_ar : d.name_he) || d.name_en || '';
  }, [question, isArabic]);

  const options = useMemo(() => {
    const raw = question?.options;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return [];
  }, [question]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!studentId) {
          Alert.alert(isArabic ? 'خطأ' : 'שגיאה', isArabic ? 'لا يوجد studentId لبدء اختبار الشخصية.' : 'אין studentId כדי להתחיל מבחן אישיות.');
          return;
        }

        setInitializing(true);

        let sid = sessionId;
        if (!sid) {
          const start = await startPersonalityTest(studentId, language);
          if (!start?.success) {
            Alert.alert(isArabic ? 'خطأ' : 'שגיאה', start?.error || (isArabic ? 'فشل إنشاء جلسة اختبار الشخصية.' : 'יצירת סשן נכשלה.'));
            return;
          }
          sid = start.sessionId;
          if (!mounted) return;
          setSessionId(sid);
        }

        await loadNextQuestion(sid);
      } catch (e) {
        console.log('PersonalityTestScreen init error:', e?.message || e);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetAnswerState() {
    setScaleValue(null);
    setChoiceIndex(null);
    setTextValue('');
    setForcedChoice(null);
    setRankingOrder([]);
  }

  function startQuestionTimer() {
    questionStartRef.current = Date.now();
  }

  function timeTakenSeconds() {
    return Math.max(0, Math.floor((Date.now() - questionStartRef.current) / 1000));
  }

  // ✅ finish and go to personality results fast
  async function finishPersonality(sid) {
    try {
      const done = await completePersonalityTest(sid);

      // go directly to PersonalityResultsScreen
      navigateTo('personalityResults', {
        studentId,
        language,
        // optional: keep ability session id so user can open full exam results later
        abilitySessionId,
        personalitySessionId: sid,
        // optional: if service returns the profile, pass it too (not required)
        profile: done?.profile || null,
      });
    } catch (e) {
      console.log('finishPersonality error:', e?.message || e);

      // even if complete fails, still go to results screen (it can fetch latest profile by studentId)
      navigateTo('personalityResults', {
        studentId,
        language,
        abilitySessionId,
        personalitySessionId: sid,
      });
    }
  }

  async function loadNextQuestion(sid) {
    if (!sid) return;

    setLoadingQuestion(true);
    resetAnswerState();

    try {
      const res = await getPersonalityQuestion(sid);

      // if service says no more questions -> finish
      if (!res?.success) {
        await finishPersonality(sid);
        return;
      }

      // service progress (answered comes from questions_answered)
      const answered = Number(res?.progress?.answered ?? 0);

      // ✅ FAST MODE: after 12 answers -> finish now
      if (answered >= FAST_RESULT_LIMIT) {
        await finishPersonality(sid);
        return;
      }

      setQuestion(res.question);
      setProgress({
        answered,
        total: FAST_RESULT_LIMIT,
      });

      // init ranking list if needed
      if (res.question?.question_type === 'ranking_10') {
        const raw = res.question?.options;
        const opts = Array.isArray(raw) ? raw : [];
        setRankingOrder(opts);
      }

      startQuestionTimer();
    } catch (e) {
      console.log('loadNextQuestion error:', e?.message || e);
      Alert.alert(isArabic ? 'خطأ' : 'שגיאה', isArabic ? 'فشل تحميل سؤال الشخصية.' : 'טעינת שאלה נכשלה.');
    } finally {
      setLoadingQuestion(false);
    }
  }

  function validateAnswer() {
    if (!question) return { ok: false, message: isArabic ? 'لا يوجد سؤال.' : 'אין שאלה.' };

    const type = question.question_type || 'scale_10';

    if (type === 'scale_10') {
      if (scaleValue == null) return { ok: false, message: isArabic ? 'اختر رقمًا من 1 إلى 10.' : 'בחר/י מספר מ-1 עד 10.' };
      return { ok: true };
    }

    if (type === 'multiple_choice') {
      if (choiceIndex == null) return { ok: false, message: isArabic ? 'اختر خيارًا.' : 'בחר/י אפשרות.' };
      return { ok: true };
    }

    if (type === 'open_ended') {
      if (!String(textValue || '').trim()) return { ok: false, message: isArabic ? 'اكتب إجابة.' : 'כתוב/כתבי תשובה.' };
      return { ok: true };
    }

    if (type === 'forced_choice_pair') {
      if (forcedChoice !== 'A' && forcedChoice !== 'B') return { ok: false, message: isArabic ? 'اختر A أو B.' : 'בחר/י A או B.' };
      return { ok: true };
    }

    if (type === 'ranking_10') {
      if (!Array.isArray(rankingOrder) || rankingOrder.length < 2) {
        return { ok: false, message: isArabic ? 'رتّب العناصر.' : 'סדר/י את הפריטים.' };
      }
      return { ok: true };
    }

    return { ok: true };
  }

  function buildAnswerPayload() {
    const type = question?.question_type || 'scale_10';

    if (type === 'scale_10') return { scaleValue: Number(scaleValue) };

    if (type === 'multiple_choice') {
      const opt = options?.[choiceIndex] || {};
      return {
        optionIndex: Number(choiceIndex),
        optionTextAr: opt.ar ?? null,
        optionTextHe: opt.he ?? null,
        optionTextEn: opt.en ?? null,
      };
    }

    if (type === 'open_ended') {
      return { textResponse: String(textValue || '').trim() };
    }

    if (type === 'forced_choice_pair') {
      return { chosen: forcedChoice };
    }

    if (type === 'ranking_10') {
      const order = (rankingOrder || []).map((x) => String(x.id));
      return { order };
    }

    return {};
  }

  async function onSubmit() {
    if (submitting || loadingQuestion) return;

    const v = validateAnswer();
    if (!v.ok) {
      Alert.alert(isArabic ? 'تنبيه' : 'שים לב', v.message || '');
      return;
    }

    setSubmitting(true);

    try {
      const ans = buildAnswerPayload();
      const t = timeTakenSeconds();

      const res = await submitPersonalityAnswer(sessionId, question.id, ans, t);

      if (!res?.success) {
        Alert.alert(
          isArabic ? 'خطأ' : 'שגיאה',
          res?.error || (isArabic ? 'فشل إرسال الإجابة.' : 'שליחת תשובה נכשלה.')
        );
        return;
      }

      await loadNextQuestion(sessionId);
    } catch (e) {
      console.log('submit error:', e?.message || e);
      Alert.alert(isArabic ? 'خطأ' : 'שגיאה', isArabic ? 'حصل خطأ أثناء الإرسال.' : 'אירעה שגיאה בשליחה.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderScale10() {
    return (
      <View style={styles.scaleGrid}>
        {Array.from({ length: 10 }).map((_, i) => {
          const v = i + 1;
          const active = Number(scaleValue) === v;
          return (
            <Pressable
              key={String(v)}
              onPress={() => setScaleValue(v)}
              style={({ pressed }) => [
                styles.scaleBtn,
                active && styles.scaleBtnActive,
                pressed && !active ? styles.scaleBtnPressed : null,
              ]}
            >
              <Text style={[styles.scaleBtnText, active && styles.scaleBtnTextActive]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderMultipleChoice() {
    if (!options.length) {
      return <Text style={styles.muted}>{isArabic ? 'لا توجد خيارات لهذا السؤال.' : 'אין אפשרויות לשאלה.'}</Text>;
    }

    return (
      <View style={styles.choiceList}>
        {options.map((opt, idx) => {
          const label = (isArabic ? opt.ar : opt.he) ?? opt.en ?? `Option ${idx + 1}`;
          const active = choiceIndex === idx;

          return (
            <Pressable
              key={String(idx)}
              onPress={() => setChoiceIndex(idx)}
              style={({ pressed }) => [
                styles.choiceItem,
                active && styles.choiceItemActive,
                pressed && !active ? styles.choiceItemPressed : null,
              ]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderOpenEnded() {
    return (
      <View style={styles.inputBox}>
        <TextInput
          value={textValue}
          onChangeText={setTextValue}
          placeholder={isArabic ? 'اكتب إجابتك هنا...' : 'כתוב/כתבי את התשובה כאן...'}
          placeholderTextColor="#94A3B8"
          multiline
          style={styles.textArea}
          textAlign="right"
        />
      </View>
    );
  }

  function renderForcedChoicePair() {
    const optObj = question?.options || {};
    const A = optObj?.A;
    const B = optObj?.B;

    const labelA = (isArabic ? A?.ar : A?.he) ?? A?.en ?? 'A';
    const labelB = (isArabic ? B?.ar : B?.he) ?? B?.en ?? 'B';

    const activeA = forcedChoice === 'A';
    const activeB = forcedChoice === 'B';

    return (
      <View style={styles.choiceList}>
        <Pressable
          onPress={() => setForcedChoice('A')}
          style={({ pressed }) => [
            styles.choiceItem,
            activeA && styles.choiceItemActive,
            pressed && !activeA ? styles.choiceItemPressed : null,
          ]}
        >
          <View style={[styles.radio, activeA && styles.radioActive]} />
          <Text style={[styles.choiceText, activeA && styles.choiceTextActive]}>{labelA}</Text>
        </Pressable>

        <Pressable
          onPress={() => setForcedChoice('B')}
          style={({ pressed }) => [
            styles.choiceItem,
            activeB && styles.choiceItemActive,
            pressed && !activeB ? styles.choiceItemPressed : null,
          ]}
        >
          <View style={[styles.radio, activeB && styles.radioActive]} />
          <Text style={[styles.choiceText, activeB && styles.choiceTextActive]}>{labelB}</Text>
        </Pressable>
      </View>
    );
  }

  function moveRanking(fromIdx, toIdx) {
    setRankingOrder((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= arr.length || toIdx >= arr.length) return arr;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }

  function renderRanking10() {
    if (!rankingOrder?.length) {
      return <Text style={styles.muted}>{isArabic ? 'لا توجد عناصر للترتيب.' : 'אין פריטים לסידור.'}</Text>;
    }

    return (
      <View style={{ gap: 10 }}>
        {rankingOrder.map((item, idx) => {
          const label = (isArabic ? item?.ar : item?.he) ?? item?.en ?? `Item ${idx + 1}`;
          return (
            <View key={String(item?.id ?? idx)} style={styles.rankRow}>
              <Text style={styles.rankIndex}>{idx + 1}</Text>
              <Text style={styles.rankLabel} numberOfLines={2}>
                {label}
              </Text>

              <View style={styles.rankBtns}>
                <Pressable
                  onPress={() => moveRanking(idx, Math.max(0, idx - 1))}
                  style={({ pressed }) => [styles.rankBtn, pressed ? styles.rankBtnPressed : null]}
                >
                  <Text style={styles.rankBtnText}>↑</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveRanking(idx, Math.min(rankingOrder.length - 1, idx + 1))}
                  style={({ pressed }) => [styles.rankBtn, pressed ? styles.rankBtnPressed : null]}
                >
                  <Text style={styles.rankBtnText}>↓</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderAnswerInput() {
    const type = question?.question_type || 'scale_10';

    if (type === 'scale_10') return renderScale10();
    if (type === 'multiple_choice') return renderMultipleChoice();
    if (type === 'open_ended') return renderOpenEnded();
    if (type === 'forced_choice_pair') return renderForcedChoicePair();
    if (type === 'ranking_10') return renderRanking10();

    // fallback
    return renderScale10();
  }

  if (initializing) {
    return (
      <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1E4FBF" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '700' }}>
          {isArabic ? 'جاري التحضير...' : 'טוען...'}
        </Text>
      </View>
    );
  }

  const pct = progress.total ? Math.min(100, Math.round((progress.answered / progress.total) * 100)) : 0;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1E4FBF', '#274B9F']} style={styles.hero}>
          <Text style={styles.heroTitle}>{isArabic ? 'اختبار الشخصية' : 'מבחן אישיות'}</Text>
          <Text style={styles.heroSubtitle}>
            {isArabic
              ? `سؤال ${progress.answered + 1} من ${progress.total} (سريع)`
              : `שאלה ${progress.answered + 1} מתוך ${progress.total} (מהיר)`}
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{pct}%</Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          {!!dimensionName && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{dimensionName}</Text>
            </View>
          )}

          <Text style={styles.qText}>{qText}</Text>

          <View style={styles.body}>
            {loadingQuestion ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#1E4FBF" />
                <Text style={styles.muted}>{isArabic ? 'جاري تحميل السؤال...' : 'טוען שאלה...'}</Text>
              </View>
            ) : (
              renderAnswerInput()
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onSubmit}
              disabled={submitting || loadingQuestion}
              style={({ pressed }) => [
                styles.submitBtn,
                (submitting || loadingQuestion) && styles.btnDisabled,
                pressed ? styles.submitBtnPressed : null,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{isArabic ? 'التالي' : 'הבא'}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => finishPersonality(sessionId)}
              style={({ pressed }) => [styles.skipBtn, pressed ? styles.skipBtnPressed : null]}
            >
              <Text style={styles.skipBtnText}>{isArabic ? 'إنهاء الاختبار' : 'סיים מבחן'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 24 },

  hero: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: '#EAF0FF', marginTop: 6, fontSize: 13 },
  progressRow: { marginTop: 14 },
  progressText: { color: '#EAF0FF', fontSize: 12, fontWeight: '600' },

  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  badgeText: { color: '#1E40AF', fontWeight: '700', fontSize: 12 },

  qText: { fontSize: 16, fontWeight: '800', color: '#0F172A', lineHeight: 24 },
  body: { marginTop: 14 },

  muted: { marginTop: 10, color: '#64748b', fontWeight: '700' },

  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  scaleBtn: {
    width: '18%',
    minWidth: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnActive: {
    borderColor: '#1E4FBF',
    backgroundColor: '#EEF2FF',
  },
  scaleBtnPressed: { transform: [{ scale: 0.98 }] },
  scaleBtnText: { fontWeight: '800', color: '#0F172A' },
  scaleBtnTextActive: { color: '#1E40AF' },

  choiceList: { gap: 10 },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  choiceItemActive: { borderColor: '#1E4FBF', backgroundColor: '#EEF2FF' },
  choiceItemPressed: { transform: [{ scale: 0.99 }] },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 10,
  },
  radioActive: { borderColor: '#1E4FBF', backgroundColor: '#1E4FBF' },
  choiceText: { flex: 1, fontWeight: '800', color: '#0F172A' },
  choiceTextActive: { color: '#1E40AF' },

  inputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 110,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  rankIndex: { width: 26, textAlign: 'center', fontWeight: '900', color: '#1E40AF' },
  rankLabel: { flex: 1, fontWeight: '800', color: '#0F172A' },
  rankBtns: { flexDirection: 'row', gap: 8 },
  rankBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  rankBtnPressed: { transform: [{ scale: 0.97 }] },
  rankBtnText: { fontWeight: '900', color: '#0F172A' },

  actions: { marginTop: 14, gap: 10 },

  submitBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnPressed: { transform: [{ scale: 0.99 }] },
  submitBtnText: { color: '#fff', fontWeight: '900' },

  skipBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnPressed: { transform: [{ scale: 0.99 }] },
  skipBtnText: { color: '#0F172A', fontWeight: '900' },

  btnDisabled: { opacity: 0.7 },
});
