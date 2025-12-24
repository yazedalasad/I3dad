import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ProgressIndicator from '../../components/AdaptiveTest/ProgressIndicator';
import QuestionCard from '../../components/AdaptiveTest/QuestionCard';

import abilityService from '../../services/abilityService';
import adaptiveTestService from '../../services/adaptiveTestService';
import interestService from '../../services/interestService';

const QUESTION_TIME_LIMIT = 60;
const HEARTBEAT_MS = 15000;

export default function AdaptiveTestScreen({
  navigateTo,
  sessionId,
  studentId,
  subjectStates: initialSubjectStates,
  subjectIds,
  language = 'ar',
  isComprehensive = true,
  subjectNames,
}) {
  /* -------------------- STATE -------------------- */
  const [initializing, setInitializing] = useState(true);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [question, setQuestion] = useState(null);
  const [subjectStates, setSubjectStates] = useState(initialSubjectStates || {});
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const questionStartRef = useRef(Date.now());

  const [skippedCount, setSkippedCount] = useState(0);

  /**
   * history items:
   * {
   *   question,
   *   selectedAnswer, // string|null
   *   timeTakenSeconds, // number|null
   *   status: 'answered' | 'pending',
   *   timeLeftWhenLeft: number|null, // ✅ for pending resume (e.g. 30)
   * }
   */
  const [history, setHistory] = useState([]);
  const [viewingHistoryIndex, setViewingHistoryIndex] = useState(null);

  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const examStartRef = useRef(Date.now());

  // ✅ keep current question paused time if user jumps away (optional but helpful)
  const pausedCurrentTimeLeftRef = useRef(null);

  /* -------------------- DERIVED -------------------- */
  const totals = useMemo(() => {
    const ids = Object.keys(subjectStates || {});
    let answered = 0;
    let correct = 0;
    let target = 0;

    ids.forEach((sid) => {
      answered += Number(subjectStates[sid]?.questionsAnswered || 0);
      correct += Number(subjectStates[sid]?.correctAnswers || 0);
      target += Number(subjectStates[sid]?.targetQuestions || 0);
    });

    return {
      answered,
      correct,
      incorrect: Math.max(0, answered - correct),
      target,
    };
  }, [subjectStates]);

  const isViewingHistory = typeof viewingHistoryIndex === 'number';
  const viewedItem = isViewingHistory ? history[viewingHistoryIndex] : null;
  const isViewingPending = !!viewedItem && viewedItem.status === 'pending';
  const isViewingAnswered = !!viewedItem && viewedItem.status === 'answered';

  const shownQuestion = useMemo(() => {
    if (!isViewingHistory) return question;
    return history[viewingHistoryIndex]?.question || question;
  }, [isViewingHistory, question, history, viewingHistoryIndex]);

  const shownSelectedAnswer = useMemo(() => {
    if (!isViewingHistory) return selectedAnswer;
    return history[viewingHistoryIndex]?.selectedAnswer ?? null;
  }, [isViewingHistory, selectedAnswer, history, viewingHistoryIndex]);

  // ✅ Question navigator squares:
  // - history items are numbered 1..history.length
  // - current question square is history.length + 1
  const currentQuestionNumber = history.length + 1;

  const navItems = useMemo(() => {
    const hist = (history || []).map((h, idx) => ({
      key: `h-${idx}`,
      number: idx + 1,
      type: 'history',
      index: idx,
      answered: h?.status === 'answered',
      pending: h?.status === 'pending',
    }));

    const cur = {
      key: `c-${currentQuestionNumber}`,
      number: currentQuestionNumber,
      type: 'current',
      index: null,
      answered: false,
      pending: false,
    };

    return [...hist, cur];
  }, [history, currentQuestionNumber]);

  /* -------------------- INIT -------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!sessionId || !studentId) {
        console.error('❌ Missing sessionId or studentId');
        return;
      }

      examStartRef.current = Date.now();
      setSubjectStates(initialSubjectStates || {});

      await loadNextQuestion(initialSubjectStates || {});
      startHeartbeat();
      startAppStateTracking();

      if (mounted) setInitializing(false);
    })();

    return () => {
      mounted = false;
      stopTimer();
      stopHeartbeat();
      stopAppStateTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------- HEARTBEAT -------------------- */
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      adaptiveTestService.recordHeartbeat({
        sessionId,
        studentId,
        eventType: 'heartbeat',
        metadata: { screen: 'AdaptiveTestScreen' },
      });
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }

  function startAppStateTracking() {
    AppState.addEventListener('change', onAppStateChange);
  }

  function stopAppStateTracking() {
    try {
      AppState.removeEventListener('change', onAppStateChange);
    } catch {}
  }

  function onAppStateChange(nextState) {
    const prev = appStateRef.current;
    appStateRef.current = nextState;
    if (prev === nextState) return;

    adaptiveTestService.recordHeartbeat({
      sessionId,
      studentId,
      eventType: nextState === 'active' ? 'focus' : 'blur',
      metadata: { prev, next: nextState },
    });
  }

  /* -------------------- TIMER -------------------- */
  function startTimer(initialSeconds = QUESTION_TIME_LIMIT) {
    stopTimer();
    questionStartRef.current = Date.now();
    setTimeLeft(initialSeconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          handleAutoTimeout(); // Option A => becomes pending
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function getTimeTakenFromLimit(limitSeconds) {
    // time taken = limit - remaining
    const taken = Math.max(0, Math.floor(limitSeconds - safeNum(timeLeft, 0)));
    return taken;
  }

  function safeNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /* -------------------- QUESTIONS -------------------- */
  async function loadNextQuestion(currentStates) {
    setFetchingQuestion(true);

    // leaving history mode when fetching a new question
    setViewingHistoryIndex(null);
    setSelectedAnswer(null);
    pausedCurrentTimeLeftRef.current = null;

    try {
      const next = await adaptiveTestService.getNextQuestion({
        sessionId,
        subjectStates: currentStates,
      });

      if (next?.success === false) {
        console.log('Next question error:', next.error);

        if (next.error === 'ALL_SUBJECTS_COMPLETE') {
          await finishTest(currentStates);
          return;
        }

        setFetchingQuestion(false);
        return;
      }

      if (!next?.question) {
        await finishTest(currentStates);
        return;
      }

      setQuestion(next.question);
      startTimer(QUESTION_TIME_LIMIT);
    } catch (e) {
      console.log('loadNextQuestion error:', e);
    } finally {
      setFetchingQuestion(false);
    }
  }

  async function handleAnswer(answer) {
    if (submitting || fetchingQuestion) return;

    // If viewing history:
    // - answered items are view-only
    // - pending items CAN be answered now (Option A)
    if (isViewingHistory && isViewingAnswered) return;

    const activeQuestion = shownQuestion;
    if (!activeQuestion) return;

    setSelectedAnswer(answer);
    setSubmitting(true);
    stopTimer();

    // time taken depends on where we started the timer:
    // - current question uses QUESTION_TIME_LIMIT
    // - pending question started at its timeLeftWhenLeft
    const limitForThisAttempt =
      isViewingHistory && isViewingPending
        ? safeNum(viewedItem?.timeLeftWhenLeft, QUESTION_TIME_LIMIT)
        : QUESTION_TIME_LIMIT;

    const timeTakenSeconds =
      isViewingHistory && isViewingPending
        ? Math.max(0, Math.floor(limitForThisAttempt - safeNum(timeLeft, 0)))
        : Math.floor((Date.now() - questionStartRef.current) / 1000);

    const result = await adaptiveTestService.submitComprehensiveAnswer({
      sessionId,
      studentId,
      question: activeQuestion,
      selectedAnswer: answer,
      timeTakenSeconds,
      subjectStates,
      questionOrder: isViewingHistory ? viewingHistoryIndex + 1 : history.length + 1,
      subjectStatesFromUi: subjectStates,
    });

    if (!result?.success) {
      setSubmitting(false);

      // Resume timer from where user was
      if (isViewingHistory && isViewingPending) {
        startTimer(safeNum(viewedItem?.timeLeftWhenLeft, QUESTION_TIME_LIMIT));
      } else {
        startTimer(QUESTION_TIME_LIMIT);
      }
      return;
    }

    // ✅ Update history:
    // - if answering current question => append answered item
    // - if answering pending history => update that item to answered
    if (isViewingHistory && isViewingPending) {
      setHistory((prev) => {
        const copy = [...prev];
        const old = copy[viewingHistoryIndex];
        copy[viewingHistoryIndex] = {
          ...old,
          selectedAnswer: answer,
          timeTakenSeconds,
          status: 'answered',
          timeLeftWhenLeft: null,
        };
        return copy;
      });

      // after answering pending: go back to current question and resume from paused time (if any)
      setSubmitting(false);
      setSubjectStates(result.subjectStates);

      setViewingHistoryIndex(null);
      const paused = pausedCurrentTimeLeftRef.current;
      if (paused != null) startTimer(paused);
      else startTimer(QUESTION_TIME_LIMIT);

      return;
    }

    // answering the current question
    setHistory((prev) => [
      ...prev,
      {
        question: activeQuestion,
        selectedAnswer: answer,
        timeTakenSeconds,
        status: 'answered',
        timeLeftWhenLeft: null,
      },
    ]);

    setSubmitting(false);
    setSubjectStates(result.subjectStates);
    await loadNextQuestion(result.subjectStates);
  }

  // ✅ OPTION A: Skip means "leave unanswered" (pending) and move on WITHOUT DB submit
  async function handleSkipQuestion() {
    if (submitting || fetchingQuestion) return;
    if (!question) return;
    if (isViewingHistory) return; // skip only makes sense on current

    setSubmitting(true);
    stopTimer();

    const remaining = safeNum(timeLeft, QUESTION_TIME_LIMIT);

    // store pending question with remaining time
    setHistory((prev) => [
      ...prev,
      {
        question,
        selectedAnswer: null,
        timeTakenSeconds: null,
        status: 'pending',
        timeLeftWhenLeft: remaining, // ✅ resume from here
      },
    ]);

    setSkippedCount((c) => c + 1);

    setSubmitting(false);

    // move forward to next question WITHOUT submit
    await loadNextQuestion(subjectStates);
  }

  // ✅ OPTION A: Timeout also becomes pending (timeLeftWhenLeft = 0)
  async function handleAutoTimeout() {
    if (submitting || fetchingQuestion) return;
    if (!question) return;
    if (isViewingHistory) return;

    setSubmitting(true);
    stopTimer();

    setHistory((prev) => [
      ...prev,
      {
        question,
        selectedAnswer: null,
        timeTakenSeconds: null,
        status: 'pending',
        timeLeftWhenLeft: 0, // resume from 0 => effectively no time, but rule is respected
      },
    ]);

    setSkippedCount((c) => c + 1);

    setSubmitting(false);
    await loadNextQuestion(subjectStates);
  }

  /* -------------------- NAVIGATOR -------------------- */
  function jumpToQuestion(item) {
    if (submitting || fetchingQuestion) return;

    // Jump to current question
    if (item.type === 'current') {
      setViewingHistoryIndex(null);

      // Resume current timer if it was paused
      const paused = pausedCurrentTimeLeftRef.current;
      startTimer(paused != null ? paused : QUESTION_TIME_LIMIT);

      return;
    }

    // Jump to history item
    // If leaving current question (unanswered), pause its remaining time
    if (!isViewingHistory) {
      pausedCurrentTimeLeftRef.current = safeNum(timeLeft, QUESTION_TIME_LIMIT);
    }

    stopTimer();
    setViewingHistoryIndex(item.index);

    // If opening a pending question, start timer from saved remaining
    const target = history[item.index];
    if (target?.status === 'pending') {
      const remain = safeNum(target.timeLeftWhenLeft, 0);
      startTimer(remain);
    }
  }

  /* -------------------- FINISH -------------------- */
  async function finishTest(finalStates) {
    stopTimer();
    stopHeartbeat();

    const totalTimeSpentSeconds = Math.floor((Date.now() - examStartRef.current) / 1000);

    await adaptiveTestService.completeComprehensiveAssessment({
      sessionId,
      studentId,
      subjectStates: finalStates,
      totalTimeSpentSeconds,
      skippedCount,
      language,
    });

    try {
      await abilityService.updateAbilitiesFromSession(sessionId);
      await interestService.updateInterestsFromSession(sessionId);
    } catch {}

    navigateTo('personalityTest', {
      studentId,
      language,
      abilitySessionId: sessionId,
      subjectNames,
      skippedCount,
      totalTimeSpent: totalTimeSpentSeconds,
    });
  }

  /* -------------------- RENDER -------------------- */
  if (initializing || fetchingQuestion || !shownQuestion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>جارٍ تحميل السؤال...</Text>
      </View>
    );
  }

  const showViewOnlyChip = isViewingHistory && isViewingAnswered;
  const showPendingChip = isViewingHistory && isViewingPending;

  return (
    <View style={styles.container}>
      <ProgressIndicator
        current={totals.answered}
        total={totals.target}
        timeLeft={timeLeft}
        correctCount={totals.correct}
        incorrectCount={totals.incorrect}
        skippedCount={skippedCount}
      />

      {/* ✅ Question Navigator (small squares) */}
      {(history.length > 0 || question) && (
        <View style={styles.navigatorWrap}>
          <View style={styles.navigatorHeader}>
            <Text style={styles.navigatorTitle}>
              {language === 'ar' ? 'الأسئلة' : 'שאלות'}
            </Text>

            {showViewOnlyChip && (
              <View style={styles.viewOnlyChip}>
                <Text style={styles.viewOnlyText}>
                  {language === 'ar' ? 'عرض فقط' : 'צפייה בלבד'}
                </Text>
              </View>
            )}

            {showPendingChip && (
              <View style={styles.pendingChip}>
                <Text style={styles.pendingText}>
                  {language === 'ar' ? 'معلق - يمكنك الإجابة' : 'ממתין - אפשר לענות'}
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navigatorRow}
          >
            {navItems.map((it) => {
              const isActive =
                (it.type === 'current' && !isViewingHistory) ||
                (it.type === 'history' && viewingHistoryIndex === it.index);

              return (
                <Pressable
                  key={it.key}
                  onPress={() => jumpToQuestion(it)}
                  style={({ pressed }) => [
                    styles.navSquare,
                    it.type === 'current' && styles.navSquareCurrent,
                    it.answered && styles.navSquareAnswered,
                    it.pending && styles.navSquarePending,
                    isActive && styles.navSquareActive,
                    pressed && styles.navSquarePressed,
                  ]}
                >
                  <Text style={[styles.navSquareText, isActive && styles.navSquareTextActive]}>
                    {it.number}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.navigatorHint}>
            {language === 'ar'
              ? 'اضغط رقم السؤال للرجوع. الأسئلة المعلقة يمكن الإجابة عنها والوقت يكمل من حيث توقفت.'
              : 'לחץ/י על מספר. בשאלות ממתינות אפשר לענות והזמן ממשיך מאיפה שעצרת.'}
          </Text>
        </View>
      )}

      <QuestionCard
        question={shownQuestion}
        selectedAnswer={shownSelectedAnswer}
        // ✅ allow answering ONLY if:
        // - not viewing history, OR viewing a pending question
        disabled={submitting || (isViewingHistory && isViewingAnswered)}
        onAnswerSelect={handleAnswer}
        // ✅ allow skip only on current question (not while viewing history)
        onSkipQuestion={isViewingHistory ? null : handleSkipQuestion}
        language={language}
        timeRemaining={timeLeft}
        maxTime={QUESTION_TIME_LIMIT}
        showFeedback={false}
        isCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    fontWeight: '800',
    color: '#41547F',
  },

  /* ---------- navigator ---------- */
  navigatorWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  navigatorHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  navigatorTitle: {
    color: '#102A68',
    fontWeight: '900',
    textAlign: 'right',
  },
  viewOnlyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  viewOnlyText: {
    color: '#546A99',
    fontWeight: '900',
    fontSize: 12,
  },
  pendingChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 179, 1, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 179, 1, 0.28)',
  },
  pendingText: {
    color: '#B37A00',
    fontWeight: '900',
    fontSize: 12,
  },
  navigatorRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  navigatorHint: {
    marginTop: 8,
    color: '#546A99',
    fontWeight: '800',
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 18,
  },

  navSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSquarePressed: { transform: [{ scale: 0.98 }] },

  // states (NO correctness!)
  navSquareAnswered: {
    borderColor: '#1E4FBF',
    backgroundColor: '#EEF2FF',
  },
  navSquarePending: {
    borderColor: '#F5B301',
    backgroundColor: 'rgba(245,179,1,0.12)',
  },
  navSquareCurrent: {
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    backgroundColor: '#fff',
  },

  navSquareActive: {
    borderWidth: 2,
    borderColor: '#1E4FBF',
  },
  navSquareText: {
    color: '#0F172A',
    fontWeight: '900',
  },
  navSquareTextActive: {
    color: '#1E4FBF',
  },
});
