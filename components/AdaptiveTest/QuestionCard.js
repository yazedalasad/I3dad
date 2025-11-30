/**
 * QUESTION CARD COMPONENT
 * 
 * Displays a question with multiple choice options
 */

import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  showFeedback,
  isCorrect,
  language,
  disabled
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

  return (
    <View style={styles.container}>
      {/* Question Text */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{questionText}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.letter}
            style={getOptionStyle(option.letter)}
            onPress={() => onAnswerSelect(option.letter)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionLetter}>
                <Text style={styles.optionLetterText}>{option.letter}</Text>
              </View>
              <Text style={styles.optionText}>{option.text}</Text>
              <FontAwesome
                name={getOptionIcon(option.letter)}
                size={24}
                color={getOptionIconColor(option.letter)}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty Indicator (for testing/debugging) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Difficulty: {question.difficulty.toFixed(2)} | 
            Discrimination: {question.discrimination.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionContainer: {
    backgroundColor: '#1e293b',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
  },
  optionsContainer: {
    gap: 12,
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
    backgroundColor: '#27ae60',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  optionIncorrect: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
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
