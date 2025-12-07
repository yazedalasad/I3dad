/**
 * PERSONALITY QUESTION CARD
 * 
 * Displays personality questions with support for:
 * - 10-point scale rating
 * - Multiple choice options
 * - Open-ended text input
 */

import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PersonalityQuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  language,
  disabled = false
}) {
  const [textInput, setTextInput] = useState('');

  const questionText = language === 'ar' ? question.question_text_ar : question.question_text_he;

  const handleScaleSelect = (value) => {
    if (!disabled) {
      onAnswerSelect({
        type: 'scale_10',
        scaleValue: value
      });
    }
  };

  const handleOptionSelect = (index) => {
    if (!disabled) {
      const options = language === 'ar' ? question.options_ar : question.options_he;
      onAnswerSelect({
        type: 'multiple_choice',
        optionIndex: index,
        optionTextAr: question.options_ar[index],
        optionTextHe: question.options_he[index]
      });
    }
  };

  const handleTextChange = (text) => {
    setTextInput(text);
    onAnswerSelect({
      type: 'open_ended',
      textResponse: text
    });
  };

  const renderScaleQuestion = () => {
    const minLabel = language === 'ar' ? question.scale_min_label_ar : question.scale_min_label_he;
    const maxLabel = language === 'ar' ? question.scale_max_label_ar : question.scale_max_label_he;

    return (
      <View style={styles.scaleContainer}>
        {/* Scale labels */}
        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabelText}>{minLabel}</Text>
          <Text style={styles.scaleLabelText}>{maxLabel}</Text>
        </View>

        {/* Scale buttons */}
        <View style={styles.scaleButtons}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.scaleButton,
                selectedAnswer?.scaleValue === value && styles.scaleButtonSelected,
                disabled && styles.scaleButtonDisabled
              ]}
              onPress={() => handleScaleSelect(value)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.scaleButtonText,
                  selectedAnswer?.scaleValue === value && styles.scaleButtonTextSelected
                ]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scale indicator */}
        <View style={styles.scaleIndicator}>
          <View style={styles.scaleIndicatorLine} />
          <View style={styles.scaleIndicatorMarkers}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <View
                key={value}
                style={[
                  styles.scaleIndicatorMarker,
                  selectedAnswer?.scaleValue === value && styles.scaleIndicatorMarkerActive
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderMultipleChoice = () => {
    const options = language === 'ar' ? question.options_ar : question.options_he;

    return (
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedAnswer?.optionIndex === index && styles.optionButtonSelected,
              disabled && styles.optionButtonDisabled
            ]}
            onPress={() => handleOptionSelect(index)}
            disabled={disabled}
          >
            <View style={styles.optionContent}>
              <View
                style={[
                  styles.optionRadio,
                  selectedAnswer?.optionIndex === index && styles.optionRadioSelected
                ]}
              >
                {selectedAnswer?.optionIndex === index && (
                  <View style={styles.optionRadioInner} />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer?.optionIndex === index && styles.optionTextSelected
                ]}
              >
                {option}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderOpenEnded = () => {
    return (
      <View style={styles.textInputContainer}>
        <TextInput
          style={[
            styles.textInput,
            language === 'ar' && styles.textInputRTL,
            disabled && styles.textInputDisabled
          ]}
          placeholder={language === 'ar' ? 'اكتب إجابتك هنا...' : 'כתוב את התשובה שלך כאן...'}
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={6}
          value={textInput}
          onChangeText={handleTextChange}
          editable={!disabled}
          textAlignVertical="top"
        />
        <View style={styles.textInputFooter}>
          <FontAwesome name="pencil" size={14} color="#64748b" />
          <Text style={styles.textInputHint}>
            {language === 'ar' 
              ? 'اكتب بحرية - لا توجد إجابة صحيحة أو خاطئة'
              : 'כתוב בחופשיות - אין תשובה נכונה או שגויה'
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Dimension badge */}
      <View style={styles.dimensionBadge}>
        <FontAwesome 
          name={question.personality_dimensions?.icon || 'star'} 
          size={16} 
          color={question.personality_dimensions?.color || '#9b59b6'} 
        />
        <Text style={styles.dimensionText}>
          {language === 'ar' 
            ? question.personality_dimensions?.name_ar 
            : question.personality_dimensions?.name_he
          }
        </Text>
      </View>

      {/* Question text */}
      <Text style={[styles.questionText, language === 'ar' && styles.questionTextRTL]}>
        {questionText}
      </Text>

      {/* Question type indicator */}
      <View style={styles.typeIndicator}>
        <FontAwesome 
          name={
            question.question_type === 'scale_10' ? 'sliders' :
            question.question_type === 'multiple_choice' ? 'list-ul' :
            'edit'
          } 
          size={12} 
          color="#64748b" 
        />
        <Text style={styles.typeText}>
          {question.question_type === 'scale_10' && (language === 'ar' ? 'تقييم من 1-10' : 'דירוג 1-10')}
          {question.question_type === 'multiple_choice' && (language === 'ar' ? 'اختيار من متعدد' : 'בחירה מרובה')}
          {question.question_type === 'open_ended' && (language === 'ar' ? 'سؤال مفتوح' : 'שאלה פתוחה')}
        </Text>
      </View>

      {/* Render appropriate question type */}
      {question.question_type === 'scale_10' && renderScaleQuestion()}
      {question.question_type === 'multiple_choice' && renderMultipleChoice()}
      {question.question_type === 'open_ended' && renderOpenEnded()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  dimensionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dimensionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 30,
  },
  questionTextRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Scale question styles
  scaleContainer: {
    gap: 16,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  scaleLabelText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  scaleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  scaleButtonSelected: {
    backgroundColor: '#9b59b6',
    borderColor: '#9b59b6',
  },
  scaleButtonDisabled: {
    opacity: 0.5,
  },
  scaleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  scaleButtonTextSelected: {
    color: '#fff',
  },
  scaleIndicator: {
    position: 'relative',
    height: 8,
  },
  scaleIndicatorLine: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#334155',
    borderRadius: 1,
  },
  scaleIndicatorMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleIndicatorMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  scaleIndicatorMarkerActive: {
    backgroundColor: '#9b59b6',
  },
  // Multiple choice styles
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  optionButtonSelected: {
    backgroundColor: '#1e1b4b',
    borderColor: '#9b59b6',
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#9b59b6',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9b59b6',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Open-ended styles
  textInputContainer: {
    gap: 12,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 150,
    borderWidth: 2,
    borderColor: '#334155',
  },
  textInputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textInputDisabled: {
    opacity: 0.5,
  },
  textInputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInputHint: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
