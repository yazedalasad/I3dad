/**
 * ADAPTIVE TEST SCREEN - SIMPLIFIED WORKING VERSION
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
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
  completeComprehensiveAssessment,
  getComprehensiveQuestion,
  startComprehensiveAssessment,
  submitComprehensiveAnswer,
  submitSkippedQuestion,
  testDatabaseConnection
} from '../../services/adaptiveTestService';

const { width, height } = Dimensions.get('window');

export default function AdaptiveTestScreen({ navigation, route }) {
  console.log('🎬 AdaptiveTestScreen LAUNCHED');
  console.log('Route params received:', route?.params);
  
  const { t, i18n } = useTranslation();
  const { studentData } = useAuth();
  
  // Extract parameters from navigation
  const subjectIds = route?.params?.subjectIds || [];
  const subjectNames = route?.params?.subjectNames || [];
  
  console.log('📊 Screen initialized with:', {
    studentId: studentData?.id,
    subjectCount: subjectIds.length,
    subjectIds: subjectIds,
    subjectNames: subjectNames
  });

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [subjectStates, setSubjectStates] = useState({});
  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [comprehensiveProgress, setComprehensiveProgress] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Configuration
  const QUESTIONS_PER_SUBJECT = 2;
  const MAX_QUESTION_TIME = 120;
  const MAX_EXAM_TIME = 2400;

  // Block back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('لا يمكن الخروج', 'يجب إكمال الاختبار حتى النهاية', [{ text: 'موافق' }]);
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Initialize exam when component mounts
  useEffect(() => {
    console.log('🔄 Component mounted, starting exam initialization...');
    
    if (subjectIds.length === 0) {
      console.error('❌ No subject IDs provided!');
      Alert.alert('خطأ', 'لم يتم تحديد مواد للاختبار');
      navigation.goBack();
      return;
    }
    
    if (!studentData?.id) {
      console.error('❌ No student data!');
      Alert.alert('خطأ', 'بيانات الطالب غير متوفرة');
      navigation.goBack();
      return;
    }
    
    initializeExam();
  }, []);

  const initializeExam = async () => {
    console.log('🎯 initializeExam STARTED');
    
    try {
      setLoading(true);
      
      // Test database connection first
      console.log('1. Testing database connection...');
      const dbTest = await testDatabaseConnection();
      if (!dbTest.success) {
        console.error('❌ Database connection failed:', dbTest.error);
        Alert.alert('خطأ', 'تعذر الاتصال بقاعدة البيانات');
        navigation.goBack();
        return;
      }
      console.log('✅ Database connection OK');

      // Start the exam
      console.log('2. Starting comprehensive assessment...');
      const result = await startComprehensiveAssessment(
        studentData.id,
        subjectIds,
        i18n.language,
        QUESTIONS_PER_SUBJECT
      );

      console.log('Service response:', {
        success: result?.success,
        error: result?.error,
        sessionId: result?.sessionId
      });

      if (result?.success) {
        console.log('✅ Exam started successfully!');
        console.log('Session ID:', result.sessionId);
        
        setSessionId(result.sessionId);
        setSubjectStates(result.subjectStates);
        
        // Load first question
        console.log('3. Loading first question...');
        await loadNextQuestion(result.subjectStates, result.sessionId);
        
        console.log('🎉 Exam initialization COMPLETE');
      } else {
        console.error('❌ Failed to start exam:', result?.error);
        Alert.alert('فشل بدء الاختبار', result?.error || 'حدث خطأ غير معروف');
        navigation.goBack();
      }

    } catch (error) {
      console.error('💥 FATAL ERROR:', error);
      Alert.alert('خطأ غير متوقع', 'حدث خطأ أثناء تحضير الاختبار');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (states, currentSessionId = null) => {
    console.log('🔍 Loading next question...');
    
    try {
      setLoading(true);
      setSelectedAnswer(null);
      setShowFeedback(false);
      
      const sid = currentSessionId || sessionId;
      if (!sid) {
        console.error('❌ No session ID available');
        return;
      }

      const result = await getComprehensiveQuestion(sid, states);
      console.log('Question loaded:', result.success ? '✅' : '❌');

      if (result.success) {
        console.log('✅ Question details:', {
          id: result.question?.id,
          subjectId: result.subjectId
        });
        
        setCurrentQuestion(result.question);
        setCurrentSubjectId(result.subjectId);
        setComprehensiveProgress(result.progress);
      } else if (result.error === 'ALL_SUBJECTS_COMPLETE') {
        console.log('✅ All questions completed');
        await completeExam(states);
      } else {
        console.error('❌ Failed to load question:', result.error);
        Alert.alert('خطأ', 'فشل في تحميل السؤال');
      }
    } catch (error) {
      console.error('❌ Error loading question:', error);
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
      Alert.alert('اختر إجابة', 'يجب اختيار إجابة قبل التقديم');
      return;
    }

    try {
      setLoading(true);
      const timeTaken = 30; // Simulated time

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
          setTimeout(() => completeExam(result.subjectStates), 1500);
        } else {
          setTimeout(() => loadNextQuestion(result.subjectStates), 1500);
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipQuestion = async () => {
    try {
      setLoading(true);
      await submitSkippedQuestion(
        sessionId,
        currentQuestion.id,
        currentSubjectId,
        30,
        'manual_skip'
      );
      await loadNextQuestion(subjectStates);
    } catch (error) {
      console.error('Skip error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeExam = async (finalSubjectStates, timeExpired = false) => {
    try {
      setLoading(true);

      const result = await completeComprehensiveAssessment(
        sessionId,
        finalSubjectStates,
        timeExpired,
        600, // 10 minutes simulated
        0 // No skipped
      );

      if (result.success) {
        navigation.navigate('testResults', {
          results: result.results,
          isComprehensive: true,
          subjectIds: subjectIds,
          subjectNames: subjectNames,
          totalTimeSpent: 600
        });
      } else {
        Alert.alert('خطأ', 'فشل في إكمال الاختبار');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Complete error:', error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSubjectName = () => {
    if (!currentSubjectId || !subjectNames.length) return 'الاختبار الشامل';
    const index = subjectIds.indexOf(currentSubjectId);
    return index !== -1 ? subjectNames[index] : 'الاختبار الشامل';
  };

  const getProgressData = () => {
    if (!comprehensiveProgress) return null;
    
    return {
      current: comprehensiveProgress.overallProgress?.answered || 0,
      total: comprehensiveProgress.overallProgress?.total || subjectIds.length * QUESTIONS_PER_SUBJECT,
      currentAbility: comprehensiveProgress.currentAbility || 50,
      standardError: comprehensiveProgress.standardError || 10
    };
  };

  if (loading && !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>جاري تحضير الاختبار...</Text>
        <Text style={styles.loadingSubtext}>
          {subjectIds.length} مواد × {QUESTIONS_PER_SUBJECT} أسئلة لكل مادة
        </Text>
        
        {/* Debug info */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              جاهز للبدء: {studentData?.id ? '✅' : '❌'}
            </Text>
            <Text style={styles.debugText}>
              المواد: {subjectIds.length}
            </Text>
          </View>
        )}
      </View>
    );
  }

  const progressData = getProgressData();

  return (
    <View style={styles.container}>
      {/* Debug Banner */}
      {__DEV__ && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerText}>
            التصحيح: الجلسة {sessionId?.substring(0, 8)}... | 
            السؤال {currentQuestion?.id?.substring(0, 8)}...
          </Text>
        </View>
      )}

      {progressData && (
        <ProgressIndicator
          current={progressData.current}
          total={progressData.total}
          currentAbility={progressData.currentAbility}
          standardError={progressData.standardError}
          isComprehensive={true}
          subjectName={getCurrentSubjectName()}
        />
      )}

      <ScrollView style={styles.content}>
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            onSkipQuestion={handleSkipQuestion}
            showFeedback={showFeedback}
            isCorrect={isCorrect}
            language={i18n.language}
            disabled={showFeedback || loading}
            timeRemaining={MAX_QUESTION_TIME - 30}
          />
        )}
      </ScrollView>

      {!showFeedback && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipQuestion}
            disabled={loading}
          >
            <FontAwesome name="forward" size={18} color="#f39c12" />
            <Text style={styles.skipButtonText}>تخطي السؤال</Text>
          </TouchableOpacity>

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
                <Text style={styles.submitButtonText}>تقديم الإجابة</Text>
                <FontAwesome name="check" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showFeedback && (
        <View style={[
          styles.feedback,
          isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
        ]}>
          <FontAwesome
            name={isCorrect ? 'check-circle' : 'times-circle'}
            size={40}
            color="#fff"
          />
          <Text style={styles.feedbackText}>
            {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة'}
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
  debugBanner: {
    backgroundColor: '#9b59b6',
    padding: 8,
    alignItems: 'center',
  },
  debugBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
  },
  debugContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#64748b',
    marginVertical: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1e293b',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f39c12',
    gap: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f39c12',
  },
  submitButton: {
    flex: 2,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  feedback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(39, 174, 96, 0.95)',
  },
  feedbackIncorrect: {
    backgroundColor: 'rgba(231, 76, 60, 0.95)',
  },
  feedbackText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
});