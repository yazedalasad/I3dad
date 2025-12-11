/**
 * QUESTION CARD COMPONENT
 * 
 * Displays a question with multiple choice options
 * Enhanced for comprehensive exam with time tracking and skip functionality
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSkipQuestion,
  showFeedback,
  isCorrect,
  language,
  disabled,
  timeRemaining
}) {
  const questionText = language === 'ar' ? question.question_text_ar : question.question_text_he;
  
  const options = [
    {
      letter: 'A',
      text: language === 'ar' ? question.option_a_ar : question.option_a_he
    },
    {
      letter: 'B',
      text: language === 'ar' ? question.option_b_ar : question.option_b_he
    },
    {
      letter: 'C',
      text: language === 'ar' ? question.option_c_ar : question.option_c_he
    },
    {
      letter: 'D',
      text: language === 'ar' ? question.option_d_ar : question.option_d_he
    }
  ];

  // Timer animation
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [timerColor, setTimerColor] = useState('#27ae60');
  
  useEffect(() => {
    if (timeRemaining !== undefined) {
      const progress = Math.max(0, timeRemaining / 120); // 120 seconds max
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false
      }).start();

      // Update color based on time remaining
      if (timeRemaining <= 30) {
        setTimerColor('#e74c3c'); // Red when less than 30 seconds
      } else if (timeRemaining <= 60) {
        setTimerColor('#f39c12'); // Orange when less than 60 seconds
      } else {
        setTimerColor('#27ae60'); // Green otherwise
      }
    }
  }, [timeRemaining]);

  const getOptionStyle = (letter) => {
    if (!showFeedback) {
      return selectedAnswer === letter ? styles.optionSelected : styles.option;
    }

    // Show feedback
    if (letter === question.correct_answer) {
      return styles.optionCorrect;
    }
    
    if (letter === selectedAnswer && !isCorrect) {
      return styles.optionIncorrect;
    }

    return styles.option;
  };

  const getOptionIcon = (letter) => {
    if (!showFeedback) {
      return selectedAnswer === letter ? 'check-circle' : 'circle-o';
    }

    if (letter === question.correct_answer) {
      return 'check-circle';
    }

    if (letter === selectedAnswer && !isCorrect) {
      return 'times-circle';
    }

    return 'circle-o';
  };

  const getOptionIconColor = (letter) => {
    if (!showFeedback) {
      return selectedAnswer === letter ? '#27ae60' : '#64748b';
    }

    if (letter === question.correct_answer) {
      return '#27ae60';
    }

    if (letter === selectedAnswer && !isCorrect) {
      return '#e74c3c';
    }

    return '#64748b';
  };

  const handleSkip = () => {
    if (onSkipQuestion && !disabled) {
      onSkipQuestion();
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    if (seconds === undefined) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get difficulty level text
  const getDifficultyText = () => {
    const diff = question.difficulty || 0;
    if (diff < -1) return 'سهل جداً';
    if (diff < 0) return 'سهل';
    if (diff < 1) return 'متوسط';
    if (diff < 2) return 'صعب';
    return 'صعب جداً';
  };

  const getDifficultyColor = () => {
    const diff = question.difficulty || 0;
    if (diff < -1) return '#27ae60'; // Green for very easy
    if (diff < 0) return '#2ecc71'; // Light green for easy
    if (diff < 1) return '#f39c12'; // Orange for medium
    if (diff < 2) return '#e67e22'; // Dark orange for hard
    return '#e74c3c'; // Red for very hard
  };

  return (
    <View style={styles.container}>
      {/* Question Header with Timer */}
      <View style={styles.questionHeader}>
        <View style={styles.questionInfo}>
          <View style={styles.difficultyBadge}>
            <FontAwesome name="signal" size={12} color={getDifficultyColor()} />
            <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
              {getDifficultyText()}
            </Text>
          </View>
          <Text style={styles.questionNumber}>
            السؤال {question.question_order || '?'}
          </Text>
        </View>
        
        {/* Timer Display */}
        {timeRemaining !== undefined && (
          <View style={styles.timerContainer}>
            <View style={styles.timerContent}>
              <FontAwesome name="clock-o" size={14} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>
            <View style={styles.timerBar}>
              <Animated.View 
                style={[
                  styles.timerProgress,
                  { 
                    backgroundColor: timerColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      {/* Question Text - Full Screen */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{questionText}</Text>
        
        {/* Skip Button Inside Question Card */}
        {!showFeedback && !disabled && onSkipQuestion && (
          <TouchableOpacity
            style={styles.skipButtonInternal}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <View style={styles.skipButtonContent}>
              <FontAwesome name="forward" size={16} color="#f39c12" />
              <Text style={styles.skipButtonText}>
                تخطي هذا السؤال
              </Text>
            </View>
            <Text style={styles.skipTimeText}>
              {timeRemaining !== undefined ? `${timeRemaining}s متبقي` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.letter}
            style={[
              getOptionStyle(option.letter),
              disabled && styles.optionDisabled
            ]}
            onPress={() => onAnswerSelect(option.letter)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.optionLetter,
                selectedAnswer === option.letter && styles.optionLetterSelected,
                showFeedback && option.letter === question.correct_answer && styles.optionLetterCorrect,
                showFeedback && option.letter === selectedAnswer && !isCorrect && styles.optionLetterIncorrect
              ]}>
                <Text style={[
                  styles.optionLetterText,
                  selectedAnswer === option.letter && styles.optionLetterTextSelected,
                  showFeedback && option.letter === question.correct_answer && styles.optionLetterTextCorrect,
                  showFeedback && option.letter === selectedAnswer && !isCorrect && styles.optionLetterTextIncorrect
                ]}>
                  {option.letter}
                </Text>
              </View>
              <Text style={[
                styles.optionText,
                showFeedback && option.letter === question.correct_answer && styles.optionTextCorrect,
                showFeedback && option.letter === selectedAnswer && !isCorrect && styles.optionTextIncorrect
              ]}>
                {option.text}
              </Text>
              <FontAwesome
                name={getOptionIcon(option.letter)}
                size={24}
                color={getOptionIconColor(option.letter)}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Explanation (shown after answer) */}
      {showFeedback && question.explanation_ar && (
        <View style={[
          styles.explanationContainer,
          isCorrect ? styles.explanationCorrect : styles.explanationIncorrect
        ]}>
          <View style={styles.explanationHeader}>
            <FontAwesome 
              name="lightbulb-o" 
              size={16} 
              color={isCorrect ? '#27ae60' : '#e74c3c'} 
            />
            <Text style={styles.explanationTitle}>
              {isCorrect ? 'شرح الإجابة الصحيحة' : 'تصحيح الإجابة'}
            </Text>
          </View>
          <Text style={styles.explanationText}>
            {language === 'ar' ? question.explanation_ar : question.explanation_he || question.explanation_ar}
          </Text>
        </View>
      )}

      {/* Quick Stats */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            الصعوبة: {question.difficulty?.toFixed(2) || '0.00'} | 
            التمييز: {question.discrimination?.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.debugText}>
            المستخدم: {question.times_used || 0} | 
            الصحيحة: {question.times_correct || 0}
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
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  questionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionNumber: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timerBar: {
    width: 80,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    borderRadius: 2,
  },
  questionContainer: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    position: 'relative',
  },
  questionText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 16,
  },
  skipButtonInternal: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  skipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f39c12',
  },
  skipTimeText: {
    fontSize: 12,
    color: 'rgba(243, 156, 18, 0.7)',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  optionSelected: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  optionCorrect: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  optionDisabled: {
    opacity: 0.7,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionLetter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterSelected: {
    backgroundColor: '#27ae60',
  },
  optionLetterCorrect: {
    backgroundColor: '#27ae60',
  },
  optionLetterIncorrect: {
    backgroundColor: '#e74c3c',
  },
  optionLetterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  optionLetterTextSelected: {
    color: '#fff',
  },
  optionLetterTextCorrect: {
    color: '#fff',
  },
  optionLetterTextIncorrect: {
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 24,
  },
  optionTextCorrect: {
    color: '#27ae60',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  explanationCorrect: {
    borderColor: 'rgba(39, 174, 96, 0.3)',
    backgroundColor: 'rgba(39, 174, 96, 0.05)',
  },
  explanationIncorrect: {
    borderColor: 'rgba(231, 76, 60, 0.3)',
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  explanationText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    textAlign: 'right',
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});