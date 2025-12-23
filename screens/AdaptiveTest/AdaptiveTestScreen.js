import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  View
} from 'react-native';

import ProgressIndicator from '../../components/AdaptiveTest/ProgressIndicator';
import QuestionCard from '../../components/AdaptiveTest/QuestionCard';

import abilityService from '../../services/abilityService';
import adaptiveTestService from '../../services/adaptiveTestService';
import interestService from '../../services/interestService';

const QUESTION_TIME_LIMIT = 60;
const HEARTBEAT_MS = 15000;

function pickGuaranteedWrongAnswer(correct) {
  return ['A', 'B', 'C', 'D'].find((x) => x !== correct) || 'A';
}

export default function AdaptiveTestScreen({
  navigateTo,
  sessionId,
  studentId,
  subjectStates: initialSubjectStates,
  subjectIds,
  language = 'ar',
  isComprehensive = true,
  subjectNames
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

  // ✅ History (allows student to go back and view previous questions WITHOUT showing correctness)
  const [history, setHistory] = useState([]); // [{ question, selectedAnswer, timeTakenSeconds }]
  const [viewingHistoryIndex, setViewingHistoryIndex] = useState(null); // number | null

  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const examStartRef = useRef(Date.now());

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
      target
    };
  }, [subjectStates]);

  const isViewingPastQuestion = typeof viewingHistoryIndex === 'number';

  const shownQuestion = useMemo(() => {
    if (!isViewingPastQuestion) return question;
    return history[viewingHistoryIndex]?.question || question;
  }, [isViewingPastQuestion, question, history, viewingHistoryIndex]);

  const shownSelectedAnswer = useMemo(() => {
    if (!isViewingPastQuestion) return selectedAnswer;
    return history[viewingHistoryIndex]?.selectedAnswer ?? null;
  }, [isViewingPastQuestion, selectedAnswer, history, viewingHistoryIndex]);

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
        metadata: { screen: 'AdaptiveTestScreen' }
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
      metadata: { prev, next: nextState }
    });
  }

  /* -------------------- TIMER -------------------- */
  function startTimer() {
    stopTimer();
    questionStartRef.current = Date.now();
    setTimeLeft(QUESTION_TIME_LIMIT);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          handleAutoTimeout();
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

  function getTimeTaken() {
    return Math.floor((Date.now() - questionStartRef.current) / 1000);
  }

  /* -------------------- QUESTIONS -------------------- */
  async function loadNextQuestion(currentStates) {
    setFetchingQuestion(true);

    // leaving history mode when fetching a new question
    setViewingHistoryIndex(null);
    setSelectedAnswer(null);

    try {
      const next = await adaptiveTestService.getNextQuestion({
        sessionId,
        subjectStates: currentStates
      });

      // ✅ IMPORTANT: handle completion error
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
      startTimer();
    } catch (e) {
      console.log('loadNextQuestion error:', e);
    } finally {
      setFetchingQuestion(false);
    }
  }

  async function handleAnswer(answer) {
    // ✅ If student is viewing a past question, don't allow submitting changes (safe + simple)
    if (isViewingPastQuestion) return;
    if (submitting || fetchingQuestion) return;

    setSelectedAnswer(answer);
    setSubmitting(true);
    stopTimer();

    const result = await adaptiveTestService.submitComprehensiveAnswer({
      sessionId,
      studentId,
      question,
      selectedAnswer: answer,
      timeTakenSeconds: getTimeTaken(),
      subjectStates,
      questionOrder: totals.answered + 1
    });

    if (!result?.success) {
      setSubmitting(false);
      startTimer();
      return;
    }

    // ✅ Save answered question into local history (for "Back" viewing)
    setHistory((prev) => [
      ...prev,
      { question, selectedAnswer: answer, timeTakenSeconds: getTimeTaken() }
    ]);

    // ✅ No correctness feedback shown
    setSubmitting(false);
    setSubjectStates(result.subjectStates);
    await loadNextQuestion(result.subjectStates);
  }

  async function handleSkipQuestion() {
    if (isViewingPastQuestion) return;
    if (submitting || fetchingQuestion) return;

    setSubmitting(true);
    stopTimer();

    const wrong = pickGuaranteedWrongAnswer(question.correct_answer);

    const result = await adaptiveTestService.submitComprehensiveAnswer({
      sessionId,
      studentId,
      question,
      selectedAnswer: wrong,
      timeTakenSeconds: getTimeTaken(),
      subjectStates,
      questionOrder: totals.answered + 1
    });

    // Save history (still no correctness)
    setHistory((prev) => [
      ...prev,
      { question, selectedAnswer: null, timeTakenSeconds: getTimeTaken() }
    ]);

    setSkippedCount((c) => c + 1);

    setSubmitting(false);
    if (result?.success) {
      setSubjectStates(result.subjectStates);
      await loadNextQuestion(result.subjectStates);
      return;
    }

    // If failed, restart timer on same question
    startTimer();
  }

  async function handleAutoTimeout() {
    if (isViewingPastQuestion) return;
    if (submitting) return;

    setSubmitting(true);

    const wrong = pickGuaranteedWrongAnswer(question.correct_answer);

    const result = await adaptiveTestService.submitComprehensiveAnswer({
      sessionId,
      studentId,
      question,
      selectedAnswer: wrong,
      timeTakenSeconds: QUESTION_TIME_LIMIT,
      subjectStates,
      questionOrder: totals.answered + 1
    });

    setHistory((prev) => [
      ...prev,
      { question, selectedAnswer: null, timeTakenSeconds: QUESTION_TIME_LIMIT }
    ]);

    setSkippedCount((c) => c + 1);

    setSubmitting(false);
    if (result?.success) {
      setSubjectStates(result.subjectStates);
      await loadNextQuestion(result.subjectStates);
      return;
    }
  }

  /* -------------------- HISTORY NAV (VIEW ONLY) -------------------- */
  function goBackOne() {
    if (submitting || fetchingQuestion) return;
    if (!history.length) return;

    stopTimer(); // don't run timer when viewing past questions

    const idx = typeof viewingHistoryIndex === 'number'
      ? viewingHistoryIndex - 1
      : history.length - 1;

    if (idx < 0) return;

    setViewingHistoryIndex(idx);
  }

  function returnToCurrentQuestion() {
    if (submitting || fetchingQuestion) return;
    setViewingHistoryIndex(null);
    // restart timer fresh for current question
    startTimer();
  }

  /* -------------------- FINISH -------------------- */
  async function finishTest(finalStates) {
    stopTimer();
    stopHeartbeat();

    const totalTimeSpentSeconds = Math.floor(
      (Date.now() - examStartRef.current) / 1000
    );

    await adaptiveTestService.completeComprehensiveAssessment({
      sessionId,
      studentId,
      subjectStates: finalStates,
      totalTimeSpentSeconds,
      skippedCount,
      language
    });

    try {
      await abilityService.updateAbilitiesFromSession(sessionId);
      await interestService.updateInterestsFromSession(sessionId);
    } catch {}

    // ✅ IMPORTANT: pass sessionId so results screen can load this session
    navigateTo('testResults', {
      sessionId,
      subjectNames,
      skippedCount,
      totalTimeSpent: totalTimeSpentSeconds
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

  return (
    <View style={styles.container}>
      {/* Minimal progress (no correctness feedback shown) */}
      <ProgressIndicator
        current={totals.answered}
        total={totals.target}
        timeLeft={isViewingPastQuestion ? null : timeLeft}
        correctCount={totals.correct}
        incorrectCount={totals.incorrect}
        skippedCount={skippedCount}
      />

      {/* Small helper line for back/view mode */}
      {history.length > 0 && (
        <View style={styles.historyRow}>
          <Text style={styles.historyText}>
            {isViewingPastQuestion
              ? 'عرض سؤال سابق (بدون نتائج)'
              : 'يمكنك الرجوع لعرض سؤال سابق (بدون نتائج)'}
          </Text>

          <View style={styles.historyBtns}>
            {!isViewingPastQuestion ? (
              <Text style={styles.historyBtn} onPress={goBackOne}>
                <FontAwesome name="arrow-left" size={14} color="#1E4FBF" /> رجوع
              </Text>
            ) : (
              <Text style={styles.historyBtn} onPress={returnToCurrentQuestion}>
                رجوع للسؤال الحالي <FontAwesome name="arrow-right" size={14} color="#1E4FBF" />
              </Text>
            )}
          </View>
        </View>
      )}

      <QuestionCard
        question={shownQuestion}
        selectedAnswer={shownSelectedAnswer}
        disabled={submitting || isViewingPastQuestion} // ✅ lock answers while viewing history
        onAnswerSelect={handleAnswer}
        onSkipQuestion={handleSkipQuestion}
        language={language}
        timeRemaining={isViewingPastQuestion ? null : timeLeft}
        maxTime={QUESTION_TIME_LIMIT}
        // ✅ IMPORTANT: do not show correct/wrong during exam
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
    gap: 12
  },
  centerText: {
    fontWeight: '800',
    color: '#41547F'
  },

  historyRow: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5ECFF',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  historyText: {
    color: '#546A99',
    fontWeight: '800',
    flex: 1,
    textAlign: 'right'
  },
  historyBtns: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10
  },
  historyBtn: {
    color: '#1E4FBF',
    fontWeight: '900'
  }
});
