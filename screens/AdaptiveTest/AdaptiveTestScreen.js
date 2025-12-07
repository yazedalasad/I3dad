/**
 * ADAPTIVE TEST SCREEN
 * 
 * Main screen for conducting adaptive assessments
 * Supports both single-subject and comprehensive (multi-subject) testing
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
  completeComprehensiveAssessment,
  getAdaptiveQuestion,
  getComprehensiveQuestion,
  startAbilityAssessment,
  startComprehensiveAssessment,
  submitAbilityAnswer,
  submitComprehensiveAnswer
} from '../../services/adaptiveTestService';

export default function AdaptiveTestScreen({ 
  navigateTo, 
  subjectId, 
  subjectIds = [], 
  subjectName, 
  subjectNames = [] 
}) {
  const { t, i18n } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  
  // Single subject mode states
  const [testState, setTestState] = useState(null);
  
  // Comprehensive mode states
  const [subjectStates, setSubjectStates] = useState({});
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [comprehensiveProgress, setComprehensiveProgress] = useState(null);
  
  // Common states
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [singleSubjectMode, setSingleSubjectMode] = useState(true);
  
  // Determine if we're in comprehensive mode
  const isComprehensive = Array.isArray(subjectIds) && subjectIds.length > 1;

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      setLoading(true);
      
      if (isComprehensive) {
        // COMPREHENSIVE MODE: Multiple subjects
        console.log('Starting comprehensive assessment with subjects:', subjectIds);
        console.log('Subject names:', subjectNames);
        
        const result = await startComprehensiveAssessment(
          studentData.id,
          subjectIds,
          i18n.language
        );

        if (result.success) {
          setSessionId(result.sessionId);
          setSubjectStates(result.subjectStates);
          setSingleSubjectMode(false);
          await loadNextComprehensiveQuestion(result.subjectStates, result.sessionId);
        } else {
          Alert.alert(t('error'), result.error);
        }
      } else {
        // SINGLE SUBJECT MODE: Backward compatibility
        console.log('Starting single subject assessment:', subjectId);
        
        const result = await startAbilityAssessment(
          studentData.id,
          subjectId || subjectIds[0],
          i18n.language
        );

        if (result.success) {
          setSessionId(result.sessionId);
          setTestState(result.testState);
          setSingleSubjectMode(true);
          await loadNextQuestion(result.testState, result.sessionId);
        } else {
          Alert.alert(t('error'), result.error);
        }
      }
    } catch (error) {
      console.error('Error initializing test:', error);
      Alert.alert(t('error'), t('test.initError'));
    } finally {
      setLoading(false);
    }
  };

  // Single subject question loading
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

      const currentSubject = subjectId || subjectIds[0];
      const result = await getAdaptiveQuestion(sid, state, currentSubject);

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

  // Comprehensive question loading
  const loadNextComprehensiveQuestion = async (states, currentSessionId = null) => {
    try {
      setLoading(true);
      setSelectedAnswer(null);
      setShowFeedback(false);

      const sid = currentSessionId || sessionId;
      if (!sid) {
        console.error('No session ID available');
        return;
      }

      const result = await getComprehensiveQuestion(sid, states);

      if (result.success) {
        setCurrentQuestion(result.question);
        setCurrentSubjectId(result.subjectId);
        setComprehensiveProgress(result.progress);
        setQuestionStartTime(Date.now());
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error loading comprehensive question:', error);
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

      if (singleSubjectMode) {
        // SINGLE SUBJECT MODE
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

          if (result.isComplete) {
            setTimeout(() => {
              completeSingleTest(result.testState);
            }, 2000);
          } else {
            setTimeout(() => {
              loadNextQuestion(result.testState);
            }, 2000);
          }
        } else {
          Alert.alert(t('error'), result.error);
        }
      } else {
        // COMPREHENSIVE MODE
        const result = await submitComprehensiveAnswer(
          sessionId,
          currentQuestion,
          currentSubjectId,
          selectedAnswer,
          timeTaken,
          subjectStates
        );

        if (result.success) {
          setIsCorrect(result.isCorrect);
          setShowFeedback(true);
          setSubjectStates(result.subjectStates);

          if (result.isComplete) {
            setTimeout(() => {
              completeComprehensiveTest(result.subjectStates);
            }, 2000);
          } else {
            setTimeout(() => {
              loadNextComprehensiveQuestion(result.subjectStates);
            }, 2000);
          }
        } else {
          Alert.alert(t('error'), result.error);
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert(t('error'), t('test.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const completeSingleTest = async (finalState) => {
    try {
      setLoading(true);

      const result = await completeAbilityAssessment(sessionId, finalState);

      if (result.success) {
        // Navigate to results screen
        navigateTo('testResults', {
          results: result.results,
          subjectName: subjectName || subjectNames[0]
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

  const completeComprehensiveTest = async (finalSubjectStates) => {
    try {
      setLoading(true);

      const result = await completeComprehensiveAssessment(sessionId, finalSubjectStates);

      if (result.success) {
        // Navigate to results screen with comprehensive data
        navigateTo('testResults', {
          results: result.results,
          isComprehensive: true,
          subjectIds: subjectIds,
          subjectNames: subjectNames
        });
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error completing comprehensive test:', error);
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

  // Get current subject name for display
  const getCurrentSubjectName = () => {
    if (singleSubjectMode) {
      return subjectName || subjectNames[0] || 'الاختبار';
    } else {
      if (!currentSubjectId || !subjectNames || !subjectIds) return 'الاختبار الشامل';
      
      const index = subjectIds.indexOf(currentSubjectId);
      if (index !== -1 && subjectNames[index]) {
        return subjectNames[index];
      }
      return 'الاختبار الشامل';
    }
  };

  // Get progress data for display
  const getProgressData = () => {
    if (singleSubjectMode) {
      return {
        current: testState?.questionsAnswered || 0,
        total: testState?.targetQuestions || 20,
        currentAbility: testState?.currentTheta || 0,
        standardError: testState?.standardError || 1,
        overallProgress: null
      };
    } else {
      if (!comprehensiveProgress) return null;
      
      return {
        current: comprehensiveProgress.overallProgress?.answered || 0,
        total: comprehensiveProgress.overallProgress?.total || subjectIds.length * 10,
        currentAbility: comprehensiveProgress.currentAbility || 0,
        standardError: comprehensiveProgress.standardError || 1,
        overallProgress: comprehensiveProgress.overallProgress,
        subjectId: comprehensiveProgress.subjectId,
        subjectProgress: {
          answered: comprehensiveProgress.answered || 0,
          total: comprehensiveProgress.total || 10
        }
      };
    }
  };

  if (loading && !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>{t('test.loading')}</Text>
      </View>
    );
  }

  const progressData = getProgressData();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{getCurrentSubjectName()}</Text>
          {!singleSubjectMode && (
            <Text style={styles.headerSubtitle}>
              {isComprehensive ? 'اختبار شامل' : 'اختبار'}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      {progressData && (
        <ProgressIndicator
          current={progressData.current}
          total={progressData.total}
          currentAbility={progressData.currentAbility}
          standardError={progressData.standardError}
          isComprehensive={!singleSubjectMode}
          overallProgress={progressData.overallProgress}
          subjectProgress={progressData.subjectProgress}
          subjectId={progressData.subjectId}
          subjectCount={isComprehensive ? subjectIds.length : 1}
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
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
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
