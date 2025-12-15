import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View
} from 'react-native';
import adaptiveTestService from '../../services/adaptiveTestService';
import ProgressIndicator from './ProgressIndicator';
import QuestionCard from './QuestionCard';

const QUESTION_TIME_LIMIT = 60; // seconds

export default function AdaptiveTestScreen({
  navigateTo,
  subjectId,
  subjectIds,
  subjectName,
  subjectNames,
  isComprehensive
}) {
  /* -------------------- STATE -------------------- */
  const [initializing, setInitializing] = useState(true);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [question, setQuestion] = useState(null);
  const [subjectStates, setSubjectStates] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const questionStartRef = useRef(Date.now());

  const [feedback, setFeedback] = useState(null); // { correct, correctAnswer }
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef(null);

  /* -------------------- INIT -------------------- */
  useEffect(() => {
    initTest();
    return () => clearInterval(timerRef.current);
  }, []);

  async function initTest() {
    setInitializing(true);

    const init = await adaptiveTestService.initializeTest({
      subjectId,
      subjectIds,
      isComprehensive
    });

    setSubjectStates(init.subjectStates);
    await loadNextQuestion(init.subjectStates);
    setInitializing(false);
  }

  /* -------------------- TIMER -------------------- */
  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(QUESTION_TIME_LIMIT);
    questionStartRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAutoTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
  }

  function getTimeTaken() {
    return Math.floor((Date.now() - questionStartRef.current) / 1000);
  }

  /* -------------------- QUESTIONS -------------------- */
  async function loadNextQuestion(currentStates) {
    setFetchingQuestion(true);
    setFeedback(null);

    const next = await adaptiveTestService.getNextQuestion({
      subjectStates: currentStates
    });

    if (!next.question) {
      finishTest(currentStates);
      return;
    }

    setQuestion(next.question);
    setSubjectStates(currentStates);
    setQuestionIndex((i) => i + 1);

    startTimer();
    setFetchingQuestion(false);
  }

  /* -------------------- ANSWERS -------------------- */
  async function handleAnswer(selectedAnswer) {
    if (submitting) return;
    setSubmitting(true);
    stopTimer();

    const timeTaken = getTimeTaken();

    const result = await adaptiveTestService.submitAnswer({
      question,
      selectedAnswer,
      timeTaken,
      subjectStates
    });

    showFeedback(result.isCorrect, question.correct_answer);

    setTimeout(async () => {
      setSubmitting(false);
      setSubjectStates(result.subjectStates);
      await loadNextQuestion(result.subjectStates);
    }, 900);
  }

  async function handleAutoTimeout() {
    if (submitting) return;
    setSubmitting(true);

    const result = await adaptiveTestService.skipQuestion({
      question,
      subjectStates,
      timeTaken: QUESTION_TIME_LIMIT
    });

    showFeedback(false, question.correct_answer);

    setTimeout(async () => {
      setSubmitting(false);
      setSubjectStates(result.subjectStates);
      await loadNextQuestion(result.subjectStates);
    }, 900);
  }

  /* -------------------- FEEDBACK -------------------- */
  function showFeedback(correct, correctAnswer) {
    setFeedback({ correct, correctAnswer });
    feedbackAnim.setValue(0);

    Animated.timing(feedbackAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true
    }).start();
  }

  /* -------------------- FINISH -------------------- */
  function finishTest(finalStates) {
    stopTimer();
    navigateTo('testResults', {
      results: adaptiveTestService.buildResults(finalStates),
      subjectName,
      subjectNames,
      isComprehensive,
      subjectIds
    });
  }

  /* -------------------- UI -------------------- */
  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Preparing your test…</Text>
      </View>
    );
  }

  if (!question || fetchingQuestion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading next question…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProgressIndicator
        current={questionIndex}
        total={adaptiveTestService.getTargetQuestionCount()}
        timeLeft={timeLeft}
      />

      <QuestionCard
        question={question}
        disabled={submitting}
        onAnswer={handleAnswer}
        timeLeft={timeLeft}
      />

      {feedback && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackAnim,
              transform: [
                {
                  scale: feedbackAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <FontAwesome
            name={feedback.correct ? 'check-circle' : 'times-circle'}
            size={54}
            color={feedback.correct ? '#27ae60' : '#e74c3c'}
          />
          <Text style={styles.feedbackText}>
            {feedback.correct ? 'Correct!' : 'Incorrect'}
          </Text>
          {!feedback.correct && (
            <Text style={styles.feedbackAnswer}>
              Correct answer: {feedback.correctAnswer}
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 20
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A'
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600'
  },
  feedbackOverlay: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 24,
    paddingHorizontal: 30,
    borderRadius: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10
  },
  feedbackText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff'
  },
  feedbackAnswer: {
    marginTop: 4,
    color: '#94A3B8',
    fontWeight: '700'
  }
});
