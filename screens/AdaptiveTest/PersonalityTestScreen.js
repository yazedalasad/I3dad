// screens/AdaptiveTest/PersonalityTestScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  useWindowDimensions,
  View,
} from 'react-native';

import RankingQuestionList from '../../components/AdaptiveTest/RankingQuestionList';
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
  abilityJustFinished = false, // ✅ NEW: trust flag from ability flow
  existingPersonalitySessionId = null, // optional resume
}) {
  const { width } = useWindowDimensions();
  // ✅ IMPORTANT: personalityTest keys are inside adaptiveTest namespace (adaptiveTest.json)
  const { t, i18n } = useTranslation('adaptiveTest');

  // Sync i18n language with prop
  useEffect(() => {
    const nextLang = String(language).toLowerCase() === 'he' ? 'he' : 'ar';
    if (String(i18n.language).toLowerCase() !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Safe translator fallback (so UI doesn't break if a key is missing)
  const tt = (key, fallback) => {
    const v = t(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

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

  // ✅ FIX: RTL should be true for BOTH Arabic + Hebrew
  const lang = String(i18n.language).toLowerCase();
  const isArabic = lang !== 'he'; // keep your old variable (used in strings)
  const isRTL = lang === 'ar' || lang === 'he';

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
          Alert.alert(
            tt('errors.title', 'خطأ'),
            tt('errors.somethingWrong', 'لا يوجد studentId لبدء اختبار الشخصية.')
          );
          return;
        }

        setInitializing(true);

        let sid = sessionId;
        if (!sid) {
          const start = await startPersonalityTest(studentId, language);
          if (!start?.success) {
            Alert.alert(
              tt('errors.title', 'خطأ'),
              start?.error || tt('errors.tryAgain', 'فشل إنشاء جلسة اختبار الشخصية.')
            );
            return;
          }
          sid = start.sessionId;
          if (!mounted) return;
          setSessionId(sid);
        }

        await loadNextQuestion(sid);
      } catch (e) {
        console.log('PersonalityTestScreen init error:', e?.message || e);
        Alert.alert(tt('errors.title', 'خطأ'), tt('errors.somethingWrong', 'حدث خطأ غير متوقع.'));
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

  // ✅ finish: go to Insight ONLY if this personality flow came right after ability finish
  async function finishPersonality(sid) {
    const finalSid = sid || sessionId;

    try {
      const done = await completePersonalityTest(finalSid);

      // ✅ Insight report ONLY when ability part just finished in same flow
      if (abilitySessionId && abilityJustFinished) {
        navigateTo('studentInsightReport', {
          studentId,
          language,
          abilitySessionId,
          personalitySessionId: finalSid,
        });
        return;
      }

      // otherwise: go to personality results
      navigateTo('personalityResults', {
        studentId,
        language,
        abilitySessionId,
        personalitySessionId: finalSid,
        profile: done?.profile || null,
      });
    } catch (e) {
      console.log('finishPersonality error:', e?.message || e);

      // even if complete fails:
      if (abilitySessionId && abilityJustFinished) {
        navigateTo('studentInsightReport', {
          studentId,
          language,
          abilitySessionId,
          personalitySessionId: finalSid,
        });
        return;
      }

      navigateTo('personalityResults', {
        studentId,
        language,
        abilitySessionId,
        personalitySessionId: finalSid,
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
      Alert.alert(tt('errors.title', 'خطأ'), tt('errors.tryAgain', 'فشل تحميل سؤال الشخصية.'));
    } finally {
      setLoadingQuestion(false);
    }
  }

  function validateAnswer() {
    if (!question) return { ok: false, message: isArabic ? 'لا يوجد سؤال.' : 'אין שאלה.' };

    const type = question.question_type || 'scale_10';

    if (type === 'scale_10') {
      if (scaleValue == null)
        return { ok: false, message: isArabic ? 'اختر رقمًا من 1 إلى 10.' : 'בחר/י מספר מ-1 עד 10.' };
      return { ok: true };
    }

    if (type === 'multiple_choice') {
      if (choiceIndex == null)
        return {
          ok: false,
          message: tt('personalityTest.chooseOne', isArabic ? 'اختر إجابة واحدة' : 'בחר/י תשובה אחת'),
        };
      return { ok: true };
    }

    if (type === 'open_ended') {
      if (!String(textValue || '').trim())
        return { ok: false, message: isArabic ? 'اكتب إجابة.' : 'כתוב/כתבי תשובה.' };
      return { ok: true };
    }

    if (type === 'forced_choice_pair') {
      if (forcedChoice !== 'A' && forcedChoice !== 'B')
        return { ok: false, message: isArabic ? 'اختر A أو B.' : 'בחר/י A או B.' };
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
      Alert.alert(tt('errors.warning', isArabic ? 'تنبيه' : 'שים לב'), v.message || '');
      return;
    }

    setSubmitting(true);

    try {
      const ans = buildAnswerPayload();
      const seconds = timeTakenSeconds();

      const res = await submitPersonalityAnswer(sessionId, question.id, ans, seconds);

      if (!res?.success) {
        Alert.alert(tt('errors.title', 'خطأ'), res?.error || tt('errors.tryAgain', 'فشل إرسال الإجابة.'));
        return;
      }

      await loadNextQuestion(sessionId);
    } catch (e) {
      console.log('submit error:', e?.message || e);
      Alert.alert(tt('errors.title', 'خطأ'), tt('errors.somethingWrong', 'حدث خطأ غير متوقع.'));
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
      return (
        <Text style={styles.muted}>
          {tt('personalityTest.noOptions', isArabic ? 'لا توجد خيارات لهذا السؤال.' : 'אין אפשרויות לשאלה.')}
        </Text>
      );
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
              style={({ hovered, pressed }) => [
                styles.optionCard,
                active && styles.optionCardActive,
                hovered && styles.optionCardHover,
                pressed && !active ? styles.optionCardPressed : null,
              ]}
            >
              <View style={styles.optionRow}>
                <View style={[styles.radioCircle, active && styles.radioCircleActive]} />
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
              </View>
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
          placeholder={tt(
            'personalityTest.placeholder',
            isArabic ? 'اكتب إجابتك هنا...' : 'כתוב/כתבי את התשובה כאן...'
          )}
          placeholderTextColor="#94A3B8"
          multiline
          style={[styles.textArea, { writingDirection: isRTL ? 'rtl' : 'ltr' }]}
          textAlign={isRTL ? 'right' : 'left'}
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
          style={({ hovered, pressed }) => [
            styles.optionCard,
            activeA && styles.optionCardActive,
            hovered && styles.optionCardHover,
            pressed && !activeA ? styles.optionCardPressed : null,
          ]}
        >
          <View style={styles.optionRow}>
            <View style={[styles.radioCircle, activeA && styles.radioCircleActive]} />
            <Text style={[styles.optionText, activeA && styles.optionTextActive]}>{labelA}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setForcedChoice('B')}
          style={({ hovered, pressed }) => [
            styles.optionCard,
            activeB && styles.optionCardActive,
            hovered && styles.optionCardHover,
            pressed && !activeB ? styles.optionCardPressed : null,
          ]}
        >
          <View style={styles.optionRow}>
            <View style={[styles.radioCircle, activeB && styles.radioCircleActive]} />
            <Text style={[styles.optionText, activeB && styles.optionTextActive]}>{labelB}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  function renderRanking10() {
    return (
      <RankingQuestionList
        items={rankingOrder}
        onOrderChange={setRankingOrder}
        isArabic={isArabic}
      />
    );
  }

  function renderAnswerInput() {
    const type = question?.question_type || 'scale_10';

    if (type === 'scale_10') return renderScale10();
    if (type === 'multiple_choice') return renderMultipleChoice();
    if (type === 'open_ended') return renderOpenEnded();
    if (type === 'forced_choice_pair') return renderForcedChoicePair();
    if (type === 'ranking_10') return renderRanking10();

    return renderScale10();
  }

  if (initializing) {
    return (
      <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1E4FBF" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '700' }}>
          {tt('common.loading', 'جاري التحميل…')}
        </Text>
      </View>
    );
  }

  const pct = progress.total ? Math.min(100, Math.round((progress.answered / progress.total) * 100)) : 0;
  const canShowReadyState =
    scaleValue != null ||
    choiceIndex != null ||
    String(textValue || '').trim().length > 0 ||
    forcedChoice === 'A' ||
    forcedChoice === 'B' ||
    (question?.question_type === 'ranking_10' && rankingOrder.length >= 2);
  const isCompact = width < 560;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['#1E4FBF', '#274B9F']} style={styles.hero}>
          <Text style={styles.heroTitle}>
            {tt('personalityTest.title', isArabic ? 'اختبار الشخصية' : 'מבחן אישיות')}
          </Text>

          <Text style={styles.heroSubtitle}>
            {isArabic
              ? `سؤال ${progress.answered + 1} من ${progress.total} (سريع)`
              : `שאלה ${progress.answered + 1} מתוך ${progress.total} (מהיר)`}
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </LinearGradient>

        <View style={styles.card}>
          {!!dimensionName && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{dimensionName}</Text>
            </View>
          )}

          {/* ✅ FIX: don’t force Hebrew to left; RTL for both ar+he */}
          <Text style={[styles.qText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {qText}
          </Text>

          <View style={styles.body}>
            {loadingQuestion ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#1E4FBF" />
                <Text style={styles.muted}>
                  {tt('adaptiveTestScreen.loadingQuestion', isArabic ? 'جاري تحميل السؤال…' : 'טוען שאלה...')}
                </Text>
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
                !canShowReadyState && styles.submitBtnIdle,
                pressed ? styles.submitBtnPressed : null,
              ]}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{tt('common.next', isArabic ? 'التالي' : 'הבא')}</Text>}
            </Pressable>

            {/* ❌ Finish/End button removed */}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  contentCompact: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  hero: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 24,
    shadowColor: '#1E4FBF',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroSubtitle: {
    color: '#EAF0FF',
    marginTop: 4,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  progressRow: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressText: {
    color: '#EAF0FF',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'right',
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },

  card: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    shadowColor: '#102A68',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },

  badge: {
    alignSelf: 'flex-end',
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#DCE7FF',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#2455D6',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  qText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#102A68',
    lineHeight: 31,
  },
  body: { marginTop: 16 },

  muted: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    justifyContent: 'space-between',
  },
  scaleBtn: {
    width: '18%',
    minWidth: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnActive: { borderColor: '#2455D6', backgroundColor: '#F3F7FF', borderWidth: 2 },
  scaleBtnPressed: { transform: [{ scale: 0.98 }] },
  scaleBtnText: { fontWeight: '800', color: '#0F172A' },
  scaleBtnTextActive: { color: '#1E40AF' },

  choiceList: { gap: 12, width: '100%' },
  optionCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 68,
  },
  optionCardActive: { borderColor: '#2455D6', backgroundColor: '#F3F7FF', borderWidth: 2 },
  optionCardHover: { borderColor: '#C9D8FF' },
  optionCardPressed: { transform: [{ scale: 0.99 }] },
  optionRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  radioCircleActive: {
    borderColor: '#2455D6',
    backgroundColor: '#2455D6',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    fontWeight: '800',
    color: '#102A68',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optionTextActive: { color: '#1E3A8A', fontWeight: '900' },

  inputBox: {
    borderWidth: 1,
    borderColor: '#E5ECFF',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 110,
    fontWeight: '800',
    color: '#111827',
    fontSize: 17,
    lineHeight: 25,
  },

  actions: { marginTop: 16, gap: 10 },

  submitBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#2455D6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
  },
  submitBtnIdle: { opacity: 0.72 },
  submitBtnPressed: { transform: [{ scale: 0.99 }] },
  submitBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  btnDisabled: { opacity: 0.7 },
});
