/**
 * PERSONALITY TEST SCREEN
 * 
 * Main screen for conducting personality assessments
 * Branded as "اكتشف شخصيتك" (Discover Your Personality)
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
import PersonalityQuestionCard from '../../components/PersonalityTest/PersonalityQuestionCard';
import { useAuth } from '../../contexts/AuthContext';
import {
    completePersonalityTest,
    getPersonalityQuestion,
    startPersonalityTest,
    submitPersonalityAnswer
} from '../../services/personalityTestService';

export default function PersonalityTestScreen({ navigateTo }) {
  const { t, i18n } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 50 });
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Initialize test
  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      setLoading(true);
      
      const result = await startPersonalityTest(
        studentData.id,
        i18n.language
      );

      if (result.success) {
        setSessionId(result.sessionId);
        await loadNextQuestion(result.sessionId);
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error initializing personality test:', error);
      Alert.alert(t('error'), t('personalityTest.initError'));
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (currentSessionId = null) => {
    try {
      setLoading(true);
      setSelectedAnswer(null);

      const sid = currentSessionId || sessionId;
      if (!sid) {
        console.error('No session ID available');
        return;
      }

      const result = await getPersonalityQuestion(sid);

      if (result.success) {
        setCurrentQuestion(result.question);
        setProgress(result.progress);
        setQuestionStartTime(Date.now());
      } else {
        // No more questions - complete test
        await completeTest();
      }
    } catch (error) {
      console.error('Error loading question:', error);
      Alert.alert(t('error'), t('personalityTest.loadQuestionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) {
      Alert.alert(
        t('personalityTest.selectAnswer'),
        t('personalityTest.selectAnswerMessage')
      );
      return;
    }

    // Validate answer based on type
    if (selectedAnswer.type === 'open_ended' && (!selectedAnswer.textResponse || selectedAnswer.textResponse.trim().length < 10)) {
      Alert.alert(
        t('personalityTest.answerTooShort'),
        t('personalityTest.answerTooShortMessage')
      );
      return;
    }

    try {
      setLoading(true);

      // Calculate time taken
      const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

      const result = await submitPersonalityAnswer(
        sessionId,
        currentQuestion.id,
        selectedAnswer,
        timeTaken
      );

      if (result.success) {
        // Check if test is complete
        if (progress.answered + 1 >= progress.total) {
          await completeTest();
        } else {
          // Load next question
          await loadNextQuestion();
        }
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert(t('error'), t('personalityTest.submitError'));
    } finally {
      setLoading(false);
    }
  };

  const completeTest = async () => {
    try {
      setLoading(true);

      const result = await completePersonalityTest(sessionId);

      if (result.success) {
        // Navigate to results screen
        navigateTo('personalityResults', {
          profiles: result.profiles
        });
      } else {
        Alert.alert(t('error'), result.error);
      }
    } catch (error) {
      console.error('Error completing test:', error);
      Alert.alert(t('error'), t('personalityTest.completeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    Alert.alert(
      t('personalityTest.exitTitle'),
      t('personalityTest.exitMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('personalityTest.exit'),
          style: 'destructive',
          onPress: () => navigateTo('home')
        }
      ]
    );
  };

  if (loading && !currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <FontAwesome name="user" size={64} color="#9b59b6" />
        <ActivityIndicator size="large" color="#9b59b6" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>{t('personalityTest.loading')}</Text>
      </View>
    );
  }

  const progressPercentage = (progress.answered / progress.total) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <FontAwesome name="user-circle" size={24} color="#9b59b6" />
          <Text style={styles.headerTitleText}>
            {t('personalityTest.title')}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {t('personalityTest.question')} {progress.answered + 1} {t('personalityTest.of')} {progress.total}
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
      </View>

      {/* Question Card */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentQuestion && (
          <PersonalityQuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={handleAnswerSelect}
            language={i18n.language}
            disabled={loading}
          />
        )}

        {/* Tips section */}
        <View style={styles.tipsCard}>
          <FontAwesome name="info-circle" size={16} color="#3498db" />
          <Text style={styles.tipsText}>
            {t('personalityTest.tip')}
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
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
              <Text style={styles.submitButtonText}>
                {progress.answered + 1 >= progress.total 
                  ? t('personalityTest.finish')
                  : t('personalityTest.next')
                }
              </Text>
              <FontAwesome 
                name={progress.answered + 1 >= progress.total ? 'check' : 'arrow-left'} 
                size={20} 
                color="#fff" 
              />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9b59b6',
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  tipsText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#1e293b',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9b59b6',
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
});
