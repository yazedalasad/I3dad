/**
 * ADAPTIVE TEST SCREEN
 * 
 * Main screen for conducting adaptive assessments
 * Displays questions and handles responses
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ProgressIndicator from '../../components/AdaptiveTest/ProgressIndicator';
import QuestionCard from '../../components/AdaptiveTest/QuestionCard';
import { useAuth } from '../../contexts/AuthContext';
import {
  completeAbilityAssessment,
  getAdaptiveQuestion,
  startAbilityAssessment,
  submitAbilityAnswer
} from '../../services/adaptiveTestService';

export default function AdaptiveTestScreen({ navigateTo, subjectId, subjectName }) {
  const { t, i18n } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [testState, setTestState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      setLoading(true);
      console.log('AdaptiveTestScreen - initializeTest called with subjectId:', subjectId);
      console.log('AdaptiveTestScreen - subjectName:', subjectName);
      console.log('AdaptiveTestScreen - studentData.id:', studentData.id);
      
      const result = await startAbilityAssessment(
        studentData.id,
        subjectId,
        i18n.language
      );

      if (result.success) {
        setSessionId(result.sessionId);
        setTestState(result.testState);
        await loadNextQuestion(result.testState, result.sessionId);
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error initializing test:', error);
      Alert.alert(t('error'), t('test.initError'));
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (state, currentSessionId = null) => {
    try {
      setLoading(true);
      setSelectedAnswer(null);
      setShowFeedback(false);

      const sid = currentSessionId || sessionId;
      if (!sid) {
        console.error('No session ID available');
        return;
      }

      console.log('AdaptiveTestScreen - loadNextQuestion calling getAdaptiveQuestion with subjectId:', subjectId);
      const result = await getAdaptiveQuestion(sid, state, subjectId);

      if (result.success) {
        setCurrentQuestion(result.question);
        setQuestionStartTime(Date.now());
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error loading question:', error);
      Alert.alert(t('error'), t('test.loadQuestionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    if (!showFeedback) {
      setSelectedAnswer(answer);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      Alert.alert(t('test.selectAnswer'), t('test.selectAnswerMessage'));
      return;
    }

    try {
      setLoading(true);

      // Calculate time taken
      const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

      const result = await submitAbilityAnswer(
        sessionId,
        currentQuestion,
        selectedAnswer,
        timeTaken,
        testState
      );

      if (result.success) {
        setIsCorrect(result.isCorrect);
        setShowFeedback(true);
        setTestState(result.testState);

        // Check if test is complete
        if (result.isComplete) {
          setTimeout(() => {
            completeTest(result.testState);
          }, 2000);
        } else {
          // Auto-advance after showing feedback
          setTimeout(() => {
            loadNextQuestion(result.testState);
          }, 2000);
        }
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert(t('error'), t('test.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const completeTest = async (finalState) => {
    try {
      setLoading(true);

      const result = await completeAbilityAssessment(sessionId, finalState);

      if (result.success) {
        // Navigate to results screen
        navigateTo('testResults', {
          results: result.results,
          subjectName
        });
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error completing test:', error);
      Alert.alert(t('error'), t('test.completeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    Alert.alert(
      t('test.exitTitle'),
      t('test.exitMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('test.exit'),
          style: 'destructive',
          onPress: () => navigateTo('home')
        }
      ]
    );
  };

  if (loading && !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>{t('test.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      {testState && (
        <ProgressIndicator
          current={testState.questionsAnswered}
          total={testState.targetQuestions}
          currentAbility={testState.currentTheta}
          standardError={testState.standardError}
        />
      )}

      {/* Question Card */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={showFeedback}
            isCorrect={isCorrect}
            language={i18n.language}
            disabled={showFeedback || loading}
          />
        )}
      </ScrollView>

      {/* Submit Button */}
      {!showFeedback && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedAnswer || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitAnswer}
            disabled={!selectedAnswer || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>{t('test.submit')}</Text>
                <FontAwesome name="arrow-left" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback */}
      {showFeedback && (
        <View style={[
          styles.feedback,
          isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
        ]}>
          <FontAwesome
            name={isCorrect ? 'check-circle' : 'times-circle'}
            size={24}
            color="#fff"
          />
          <Text style={styles.feedbackText}>
            {isCorrect ? t('test.correct') : t('test.incorrect')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
  },
  exitButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#1e293b',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  feedbackCorrect: {
    backgroundColor: '#27ae60',
  },
  feedbackIncorrect: {
    backgroundColor: '#e74c3c',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
