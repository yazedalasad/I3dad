/**
 * QUESTION CARD COMPONENT (Improved UI + Smooth Animations)
 *
 * - Cleaner layout + better spacing
 * - Small entrance animation for question/options
 * - Option press animation (pop)
 * - Safer fallbacks if some option text is missing
 * - Supports Arabic/Hebrew text alignment automatically
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSkipQuestion,
  showFeedback,
  isCorrect,
  language,
  disabled,
  timeRemaining,
  maxTime = 120, // ✅ allow parent to control
}) {
  const isRTL = useMemo(() => {
    // Arabic is RTL. Hebrew is RTL too.
    // If you already use I18nManager.forceRTL, keep it consistent.
    return language === 'ar' || language === 'he' || I18nManager.isRTL;
  }, [language]);

  const questionText = useMemo(() => {
    const ar = question?.question_text_ar;
    const he = question?.question_text_he;
    if (language === 'ar') return ar || he || '';
    return he || ar || '';
  }, [question, language]);

  const options = useMemo(() => {
    const pick = (ar, he) => {
      if (language === 'ar') return ar ?? he ?? '';
      return he ?? ar ?? '';
    };
    return [
      { letter: 'A', text: pick(question?.option_a_ar, question?.option_a_he) },
      { letter: 'B', text: pick(question?.option_b_ar, question?.option_b_he) },
      { letter: 'C', text: pick(question?.option_c_ar, question?.option_c_he) },
      { letter: 'D', text: pick(question?.option_d_ar, question?.option_d_he) },
    ].filter((o) => String(o.text || '').trim().length > 0); // ✅ hide empty options safely
  }, [question, language]);

  // ---------- Entrance animations ----------
  const mountAnim = useRef(new Animated.Value(0)).current; // 0 -> 1
  useEffect(() => {
    mountAnim.setValue(0);
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [question?.id]);

  const cardTranslateY = mountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const cardOpacity = mountAnim;

  // ---------- Timer bar ----------
  const progressAnim = useRef(new Animated.Value(1)).current;
  const [timerColor, setTimerColor] = useState('#27ae60');

  useEffect(() => {
    if (typeof timeRemaining !== 'number') return;

    const safeMax = Math.max(1, Number(maxTime) || 120);
    const progress = Math.max(0, Math.min(1, timeRemaining / safeMax));

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    if (timeRemaining <= Math.floor(safeMax * 0.25)) setTimerColor('#e74c3c');
    else if (timeRemaining <= Math.floor(safeMax * 0.5)) setTimerColor('#f39c12');
    else setTimerColor('#27ae60');
  }, [timeRemaining, maxTime, progressAnim]);

  const formatTime = (seconds) => {
    if (typeof seconds !== 'number') return '';
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Difficulty badge (kept, but slightly refined)
  const getDifficultyText = () => {
    const diff = Number(question?.difficulty ?? 0);
    if (diff < -1) return 'سهل جداً';
    if (diff < 0) return 'سهل';
    if (diff < 1) return 'متوسط';
    if (diff < 2) return 'صعب';
    return 'صعب جداً';
  };
  const getDifficultyColor = () => {
    const diff = Number(question?.difficulty ?? 0);
    if (diff < -1) return '#27ae60';
    if (diff < 0) return '#2ecc71';
    if (diff < 1) return '#f39c12';
    if (diff < 2) return '#e67e22';
    return '#e74c3c';
  };

  const getOptionStyle = (letter) => {
    if (!showFeedback) {
      return selectedAnswer === letter ? styles.optionSelected : styles.option;
    }
    if (letter === question?.correct_answer) return styles.optionCorrect;
    if (letter === selectedAnswer && !isCorrect) return styles.optionIncorrect;
    return styles.option;
  };

  const getOptionIcon = (letter) => {
    if (!showFeedback) return selectedAnswer === letter ? 'check-circle' : 'circle-o';
    if (letter === question?.correct_answer) return 'check-circle';
    if (letter === selectedAnswer && !isCorrect) return 'times-circle';
    return 'circle-o';
  };

  const getOptionIconColor = (letter) => {
    if (!showFeedback) return selectedAnswer === letter ? '#27ae60' : '#94A3B8';
    if (letter === question?.correct_answer) return '#27ae60';
    if (letter === selectedAnswer && !isCorrect) return '#e74c3c';
    return '#94A3B8';
  };

  const handleSkip = () => {
    if (onSkipQuestion && !disabled && !showFeedback) onSkipQuestion();
  };

  // Option press pop animation (per option)
  const pressScales = useRef(
    new Map(['A', 'B', 'C', 'D'].map((k) => [k, new Animated.Value(1)]))
  ).current;

  const pop = (letter) => {
    const v = pressScales.get(letter);
    if (!v) return;
    v.setValue(1);
    Animated.sequence([
      Animated.timing(v, { toValue: 0.98, duration: 70, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.questionHeader,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        <View style={styles.questionInfo}>
          <View style={styles.difficultyBadge}>
            <FontAwesome name="signal" size={12} color={getDifficultyColor()} />
            <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
              {getDifficultyText()}
            </Text>
          </View>

          <Text style={styles.questionNumber}>
            السؤال {question?.question_order || '?'}
          </Text>
        </View>

        {typeof timeRemaining === 'number' && (
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
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}
      </Animated.View>

      {/* Question Card */}
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {questionText}
        </Text>

        {!showFeedback && !disabled && onSkipQuestion && (
          <TouchableOpacity
            style={styles.skipButtonInternal}
            onPress={handleSkip}
            activeOpacity={0.85}
          >
            <View style={styles.skipButtonContent}>
              <FontAwesome name="forward" size={16} color="#f39c12" />
              <Text style={styles.skipButtonText}>تخطي هذا السؤال</Text>
            </View>
            {typeof timeRemaining === 'number' && (
              <Text style={styles.skipTimeText}>
                {timeRemaining}s متبقي
              </Text>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option, idx) => {
          const scale = pressScales.get(option.letter) || new Animated.Value(1);

          const delay = 70 + idx * 55;
          const optionOpacity = mountAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });
          const optionTranslate = mountAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [10, 0],
          });

          return (
            <Animated.View
              key={option.letter}
              style={{
                opacity: optionOpacity,
                transform: [{ translateY: optionTranslate }, { scale }],
              }}
            >
              <Pressable
                onPress={() => {
                  if (disabled) return;
                  pop(option.letter);
                  onAnswerSelect?.(option.letter);
                }}
                disabled={disabled}
                style={[
                  getOptionStyle(option.letter),
                  disabled && styles.optionDisabled,
                ]}
              >
                <View style={styles.optionContent}>
                  <View
                    style={[
                      styles.optionLetter,
                      selectedAnswer === option.letter && styles.optionLetterSelected,
                      showFeedback &&
                        option.letter === question?.correct_answer &&
                        styles.optionLetterCorrect,
                      showFeedback &&
                        option.letter === selectedAnswer &&
                        !isCorrect &&
                        styles.optionLetterIncorrect,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLetterText,
                        selectedAnswer === option.letter && styles.optionLetterTextSelected,
                        showFeedback &&
                          option.letter === question?.correct_answer &&
                          styles.optionLetterTextCorrect,
                        showFeedback &&
                          option.letter === selectedAnswer &&
                          !isCorrect &&
                          styles.optionLetterTextIncorrect,
                      ]}
                    >
                      {option.letter}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      { textAlign: isRTL ? 'right' : 'left' },
                      showFeedback &&
                        option.letter === question?.correct_answer &&
                        styles.optionTextCorrect,
                      showFeedback &&
                        option.letter === selectedAnswer &&
                        !isCorrect &&
                        styles.optionTextIncorrect,
                    ]}
                    numberOfLines={5}
                  >
                    {option.text}
                  </Text>

                  <FontAwesome
                    name={getOptionIcon(option.letter)}
                    size={22}
                    color={getOptionIconColor(option.letter)}
                  />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Explanation */}
      {showFeedback && (question?.explanation_ar || question?.explanation_he) && (
        <Animated.View
          style={[
            styles.explanationContainer,
            isCorrect ? styles.explanationCorrect : styles.explanationIncorrect,
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
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

          <Text style={[styles.explanationText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar'
              ? question?.explanation_ar || question?.explanation_he || ''
              : question?.explanation_he || question?.explanation_ar || ''}
          </Text>
        </Animated.View>
      )}

      {/* DEV debug */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            الصعوبة: {Number(question?.difficulty ?? 0).toFixed(2)} | التمييز:{' '}
            {Number(question?.discrimination ?? 0).toFixed(2)}
          </Text>
          <Text style={styles.debugText}>
            المستخدم: {question?.times_used || 0} | الصحيحة: {question?.times_correct || 0}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  questionInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  difficultyText: { fontSize: 12, fontWeight: '700' },
  questionNumber: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },

  timerContainer: { alignItems: 'flex-end', minWidth: 92 },
  timerContent: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  timerText: { fontSize: 14, fontWeight: '900' },
  timerBar: {
    width: 92,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerProgress: { height: '100%', borderRadius: 999 },

  questionContainer: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',

    // subtle shadow (RN will ignore on Android unless elevation is set)
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  questionText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#fff',
    fontWeight: '700',
  },

  skipButtonInternal: {
    marginTop: 14,
    backgroundColor: 'rgba(243, 156, 18, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.28)',
    borderRadius: 14,
    padding: 12,
  },
  skipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  skipButtonText: { fontSize: 14, fontWeight: '800', color: '#f39c12' },
  skipTimeText: { fontSize: 12, color: 'rgba(243, 156, 18, 0.8)', textAlign: 'center' },

  optionsContainer: { gap: 12, marginBottom: 16 },

  option: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  optionSelected: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.9)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(39, 174, 96, 0.10)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  optionIncorrect: {
    backgroundColor: 'rgba(231, 76, 60, 0.10)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  optionDisabled: { opacity: 0.55 },

  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  optionLetter: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0b1223',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionLetterSelected: { borderColor: 'rgba(39,174,96,0.6)' },
  optionLetterCorrect: { borderColor: 'rgba(39,174,96,0.9)', backgroundColor: 'rgba(39,174,96,0.14)' },
  optionLetterIncorrect: { borderColor: 'rgba(231,76,60,0.9)', backgroundColor: 'rgba(231,76,60,0.12)' },

  optionLetterText: { color: '#E2E8F0', fontWeight: '900', fontSize: 15 },
  optionLetterTextSelected: { color: '#27ae60' },
  optionLetterTextCorrect: { color: '#27ae60' },
  optionLetterTextIncorrect: { color: '#e74c3c' },

  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  optionTextCorrect: { color: '#CFF5DD' },
  optionTextIncorrect: { color: '#FFD1CD' },

  explanationContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,

    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  explanationCorrect: { borderColor: 'rgba(39, 174, 96, 0.35)' },
  explanationIncorrect: { borderColor: 'rgba(231, 76, 60, 0.35)' },

  explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  explanationTitle: { color: '#fff', fontWeight: '900' },
  explanationText: { color: '#E2E8F0', lineHeight: 22, fontWeight: '600' },

  debugInfo: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  debugText: { fontSize: 12, color: '#94A3B8', marginVertical: 2, fontWeight: '700' },
});
