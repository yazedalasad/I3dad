import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  const [feedback, setFeedback] = useState(null); // { correct, correctAnswer }
  const feedbackAnim = useRef(new Animated.Value(0)).current;

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
  setFeedback(null);
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
    if (submitting || fetchingQuestion || feedback) return;

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

    showFeedback(result.isCorrect, question.correct_answer);

    setTimeout(async () => {
      setSubmitting(false);
      setSubjectStates(result.subjectStates);
      await loadNextQuestion(result.subjectStates);
    }, 700);
  }

  async function handleSkipQuestion() {
    if (submitting || fetchingQuestion || feedback) return;

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

    showFeedback(false, question.correct_answer);

    setTimeout(async () => {
      setSubmitting(false);
      setSubjectStates(result.subjectStates);
      setSkippedCount((c) => c + 1);
      await loadNextQuestion(result.subjectStates);
    }, 700);
  }

  async function handleAutoTimeout() {
    if (submitting || feedback) return;

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

    showFeedback(false, question.correct_answer);

    setTimeout(async () => {
      setSubmitting(false);
      setSubjectStates(result.subjectStates);
      setSkippedCount((c) => c + 1);
      await loadNextQuestion(result.subjectStates);
    }, 700);
  }

  /* -------------------- FEEDBACK -------------------- */
  function showFeedback(correct, correctAnswer) {
    setFeedback({ correct, correctAnswer });
    feedbackAnim.setValue(0);
    Animated.timing(feedbackAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
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

    navigateTo('testResults', {
      subjectNames,
      skippedCount,
      totalTimeSpent: totalTimeSpentSeconds
    });
  }

  /* -------------------- RENDER -------------------- */
  if (initializing || fetchingQuestion || !question) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>جارٍ تحميل السؤال...</Text>
      </View>
    );
  }

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

      <QuestionCard
        question={question}
        selectedAnswer={selectedAnswer}
        disabled={submitting}
        onAnswerSelect={handleAnswer}
        onSkipQuestion={handleSkipQuestion}
        language={language}
        timeRemaining={timeLeft}
        maxTime={QUESTION_TIME_LIMIT}
        showFeedback={!!feedback}
        isCorrect={feedback?.correct}
      />

      {feedback && (
        <Animated.View style={[styles.feedbackBox, feedback.correct ? styles.ok : styles.bad]}>
          <FontAwesome
            name={feedback.correct ? 'check' : 'close'}
            size={18}
            color="#fff"
          />
          <Text style={styles.feedbackText}>
            {feedback.correct
              ? 'إجابة صحيحة'
              : `إجابة خاطئة • الصحيح: ${feedback.correctAnswer}`}
          </Text>
        </Animated.View>
      )}
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
  feedbackBox: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'center'
  },
  ok: { backgroundColor: '#2ecc71' },
  bad: { backgroundColor: '#e74c3c' },
  feedbackText: {
    color: '#fff',
    fontWeight: '900',
    textAlign: 'right'
  }
});
