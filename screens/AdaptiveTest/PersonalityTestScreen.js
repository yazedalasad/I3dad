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

const DEFAULT_TOTAL = 20;

export default function PersonalityTestScreen({
  navigateTo,
  studentId,
  language = 'ar',
  abilitySessionId = null, // pass from ability exam so we can go back to combined results later
  existingPersonalitySessionId = null, // optional if you want to resume
}) {
  const [initializing, setInitializing] = useState(true);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sessionId, setSessionId] = useState(existingPersonalitySessionId);
  const [question, setQuestion] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: DEFAULT_TOTAL });

  // answers (existing)
  const [scaleValue, setScaleValue] = useState(null);
  const [choiceIndex, setChoiceIndex] = useState(null);
  const [textValue, setTextValue] = useState('');

  // answers (new types)
  const [forcedChoice, setForcedChoice] = useState(null); // 'A' | 'B'
  const [rankingOrder, setRankingOrder] = useState([]); // array of option items (ordered)

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
    // For multiple_choice + ranking_10 when stored as an array
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
          Alert.alert('خطأ', 'لا يوجد studentId لبدء اختبار الشخصية.');
          return;
        }

        setInitializing(true);

        let sid = sessionId;
        if (!sid) {
          const start = await startPersonalityTest(studentId, language);
          if (!start?.success) {
            Alert.alert('خطأ', start?.error || 'فشل إنشاء جلسة اختبار الشخصية.');
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

  async function loadNextQuestion(sid) {
    if (!sid) return;

    setLoadingQuestion(true);
    resetAnswerState();

    try {
      const res = await getPersonalityQuestion(sid);

      if (!res?.success) {
        await finishPersonality(sid);
        return;
      }

      setQuestion(res.question);
      setProgress(res.progress || { answered: 0, total: DEFAULT_TOTAL });

      // init ranking list if needed
      if (res.question?.question_type === 'ranking_10') {
        const raw = res.question?.options;
        const opts = Array.isArray(raw) ? raw : [];
        setRankingOrder(opts);
      }

      startQuestionTimer();
    } catch (e) {
      console.log('loadNextQuestion error:', e?.message || e);
      Alert.alert('خطأ', 'فشل تحميل سؤال الشخصية.');
    } finally {
      setLoadingQuestion(false);
    }
  }

  function validateAnswer() {
    if (!question) return { ok: false, message: isArabic ? 'لا يوجد سؤال.' : 'אין שאלה.' };

    const type = question.question_type;

    if (type === 'scale_10') {
      if (!Number.isFinite(Number(scaleValue))) return { ok: false, message: isArabic ? 'اختر رقمًا من 1 إلى 10.' : 'בחר מספר 1 עד 10.' };
      const v = Number(scaleValue);
      if (v < 1 || v > 10) return { ok: false, message: isArabic ? 'القيمة يجب أن تكون بين 1 و 10.' : 'הערך חייב להיות בין 1 ל-10.' };
      return { ok: true };
    }

    if (type === 'multiple_choice') {
      if (choiceIndex === null || choiceIndex === undefined) return { ok: false, message: isArabic ? 'اختر إجابة.' : 'בחר תשובה.' };
      return { ok: true };
    }

    if (type === 'open_ended') {
      if (!String(textValue || '').trim()) return { ok: false, message: isArabic ? 'اكتب إجابة قصيرة.' : 'כתוב/כתבי תשובה קצרה.' };
      return { ok: true };
    }

    if (type === 'forced_choice_pair') {
      if (forcedChoice !== 'A' && forcedChoice !== 'B') {
        return { ok: false, message: isArabic ? 'اختر أحد الخيارين.' : 'בחר/י אחת מהאפשרויות.' };
      }
      return { ok: true };
    }

    if (type === 'ranking_10') {
      if (!Array.isArray(rankingOrder) || rankingOrder.length < 2) {
        return { ok: false, message: isArabic ? 'رتّب عنصرين على الأقل.' : 'סדר/י לפחות שני פריטים.' };
      }
      // must have ids if you want to score by id later
      const missingId = rankingOrder.some((x) => x?.id === undefined || x?.id === null);
      if (missingId) {
        return { ok: false, message: isArabic ? 'بعض العناصر لا تحتوي على id.' : 'לחלק מהפריטים אין id.' };
      }
      return { ok: true };
    }

    return { ok: false, message: isArabic ? 'نوع سؤال غير مدعوم.' : 'סוג שאלה לא נתמך.' };
  }

  function buildAnswerPayload() {
    const type = question.question_type;

    if (type === 'scale_10') {
      return { scaleValue: Number(scaleValue) };
    }

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
      // store ordered ids (top => first)
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

  async function finishPersonality(sid) {
    try {
      await completePersonalityTest(sid);

      if (abilitySessionId) {
        navigateTo('testResults', { sessionId: abilitySessionId, personalitySessionId: sid });
      } else {
        navigateTo('home');
      }
    } catch (e) {
      console.log('finishPersonality error:', e?.message || e);
      if (abilitySessionId) {
        navigateTo('testResults', { sessionId: abilitySessionId, personalitySessionId: sid });
      } else {
        navigateTo('home');
      }
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
          textAlign={isArabic ? 'right' : 'right'}
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

    return (
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => setForcedChoice('A')}
          style={({ pressed }) => [
            styles.choiceItem,
            forcedChoice === 'A' && styles.choiceItemActive,
            pressed && forcedChoice !== 'A' ? styles.choiceItemPressed : null,
          ]}
        >
          <View style={[styles.radio, forcedChoice === 'A' && styles.radioActive]} />
          <Text style={[styles.choiceText, forcedChoice === 'A' && styles.choiceTextActive]}>{labelA}</Text>
        </Pressable>

        <Pressable
          onPress={() => setForcedChoice('B')}
          style={({ pressed }) => [
            styles.choiceItem,
            forcedChoice === 'B' && styles.choiceItemActive,
            pressed && forcedChoice !== 'B' ? styles.choiceItemPressed : null,
          ]}
        >
          <View style={[styles.radio, forcedChoice === 'B' && styles.radioActive]} />
          <Text style={[styles.choiceText, forcedChoice === 'B' && styles.choiceTextActive]}>{labelB}</Text>
        </Pressable>
      </View>
    );
  }

  function moveRankingItem(index, dir) {
    const to = index + dir;
    if (to < 0 || to >= rankingOrder.length) return;

    const next = [...rankingOrder];
    const tmp = next[index];
    next[index] = next[to];
    next[to] = tmp;
    setRankingOrder(next);
  }

  function renderRanking10() {
    const list = rankingOrder || [];
    if (!list.length) {
      return <Text style={styles.muted}>{isArabic ? 'لا توجد عناصر للترتيب.' : 'אין פריטים לסידור.'}</Text>;
    }

    return (
      <View style={{ gap: 10 }}>
        <Text style={styles.muted}>
          {isArabic ? 'رتّب القيم حسب الأولوية (الأعلى = الأهم):' : 'סדר/י לפי עדיפות (למעלה = הכי חשוב):'}
        </Text>

        {list.map((item, idx) => {
          const label = (isArabic ? item?.ar : item?.he) ?? item?.en ?? `Item ${idx + 1}`;
          const canUp = idx > 0;
          const canDown = idx < list.length - 1;

          return (
            <View key={String(item?.id ?? idx)} style={styles.rankRow}>
              <Text style={styles.rankIndex}>{idx + 1}</Text>
              <Text style={styles.rankText}>{label}</Text>

              <View style={styles.rankBtns}>
                <Pressable
                  disabled={!canUp}
                  onPress={() => moveRankingItem(idx, -1)}
                  style={({ pressed }) => [
                    styles.rankBtn,
                    !canUp && styles.rankBtnDisabled,
                    pressed && canUp ? styles.rankBtnPressed : null,
                  ]}
                >
                  <Text style={styles.rankBtnText}>↑</Text>
                </Pressable>

                <Pressable
                  disabled={!canDown}
                  onPress={() => moveRankingItem(idx, 1)}
                  style={({ pressed }) => [
                    styles.rankBtn,
                    !canDown && styles.rankBtnDisabled,
                    pressed && canDown ? styles.rankBtnPressed : null,
                  ]}
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

  function renderQuestionBody() {
    const type = question?.question_type;

    if (type === 'scale_10') return renderScale10();
    if (type === 'multiple_choice') return renderMultipleChoice();
    if (type === 'open_ended') return renderOpenEnded();
    if (type === 'forced_choice_pair') return renderForcedChoicePair();
    if (type === 'ranking_10') return renderRanking10();

    return <Text style={styles.muted}>{isArabic ? 'نوع سؤال غير مدعوم.' : 'סוג שאלה לא נתמך.'}</Text>;
  }

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>{isArabic ? 'جارٍ بدء اختبار الشخصية...' : 'מתחיל מבחן אישיות...'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
          <Text style={styles.heroTitle}>{isArabic ? 'اختبار الشخصية' : 'מבחן אישיות'}</Text>
          <Text style={styles.heroSubtitle}>
            {isArabic ? 'الجزء الثاني من الاختبار الشامل' : 'חלק שני של המבחן המקיף'}
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {isArabic ? 'التقدّم:' : 'התקדמות:'} {progress.answered}/{progress.total}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          {loadingQuestion ? (
            <View style={styles.centerBox}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>{isArabic ? 'جارٍ تحميل السؤال...' : 'טוען שאלה...'}</Text>
            </View>
          ) : !question ? (
            <Text style={styles.muted}>{isArabic ? 'لا يوجد سؤال حالياً.' : 'אין שאלה כרגע.'}</Text>
          ) : (
            <>
              {!!dimensionName && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{dimensionName}</Text>
                </View>
              )}

              <Text style={styles.qText}>{qText}</Text>

              <View style={styles.body}>{renderQuestionBody()}</View>

              <Pressable
                onPress={onSubmit}
                disabled={submitting || loadingQuestion || !question}
                style={({ pressed }) => [
                  styles.submitBtn,
                  (submitting || loadingQuestion || !question) && styles.submitBtnDisabled,
                  pressed && !submitting && !loadingQuestion ? styles.submitBtnPressed : null,
                ]}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{isArabic ? 'التالي' : 'הבא'}</Text>}
              </Pressable>

              <Pressable
                onPress={() => finishPersonality(sessionId)}
                style={({ pressed }) => [styles.skipBtn, pressed ? styles.skipBtnPressed : null]}
              >
                <Text style={styles.skipBtnText}>{isArabic ? 'إنهاء الاختبار' : 'סיים מבחן'}</Text>
              </Pressable>
            </>
          )}
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
    borderColor: '#94A3B8',
    marginRight: 10,
  },
  radioActive: { borderColor: '#1E4FBF', backgroundColor: '#1E4FBF' },
  choiceText: { flex: 1, color: '#0F172A', fontWeight: '700' },
  choiceTextActive: { color: '#1E40AF' },

  inputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    textAlignVertical: 'top',
  },

  // ranking styles
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  rankIndex: {
    width: 26,
    fontWeight: '900',
    color: '#1E40AF',
  },
  rankText: { flex: 1, color: '#0F172A', fontWeight: '800' },
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
  rankBtnDisabled: { opacity: 0.35 },
  rankBtnPressed: { transform: [{ scale: 0.98 }] },
  rankBtnText: { fontWeight: '900', color: '#0F172A' },

  submitBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnPressed: { transform: [{ scale: 0.99 }] },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  skipBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnPressed: { transform: [{ scale: 0.99 }] },
  skipBtnText: { color: '#334155', fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '700' },
  centerBox: { alignItems: 'center', paddingVertical: 18 },
  loadingText: { marginTop: 8, color: '#64748B', fontWeight: '700' },
  muted: { color: '#64748B', fontWeight: '700' },
});
