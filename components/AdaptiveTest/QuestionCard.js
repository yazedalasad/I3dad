/**
 * QUESTION CARD COMPONENT (TotalExam-style UI)
 * - Light theme (same vibe as TotalExamScreen)
 * - Smooth entrance animation
 * - Option press pop animation
 * - RTL/LTR alignment support
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  maxTime = 120,
}) {
  const isRTL = useMemo(() => {
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
    ].filter((o) => String(o.text || '').trim().length > 0);
  }, [question, language]);

  // ---------- Entrance animations ----------
  const mountAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    mountAnim.setValue(0);
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 260,
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
  const [timerColor, setTimerColor] = useState('#1B3A8A');

  useEffect(() => {
    if (typeof timeRemaining !== 'number') return;

    const safeMax = Math.max(1, Number(maxTime) || 120);
    const progress = Math.max(0, Math.min(1, timeRemaining / safeMax));

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 250,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // blue -> yellow -> red
    if (timeRemaining <= Math.floor(safeMax * 0.25)) setTimerColor('#E74C3C');
    else if (timeRemaining <= Math.floor(safeMax * 0.5)) setTimerColor('#F5B301');
    else setTimerColor('#1B3A8A');
  }, [timeRemaining, maxTime, progressAnim]);

  const formatTime = (seconds) => {
    if (typeof seconds !== 'number') return '';
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    if (diff < -1) return '#2ECC71';
    if (diff < 0) return '#27AE60';
    if (diff < 1) return '#F5B301';
    if (diff < 2) return '#E67E22';
    return '#E74C3C';
  };

  const getOptionState = (letter) => {
    if (!showFeedback) {
      if (selectedAnswer === letter) return 'selected';
      return 'normal';
    }
    if (letter === question?.correct_answer) return 'correct';
    if (letter === selectedAnswer && !isCorrect) return 'incorrect';
    return 'normal';
  };

  const handleSkip = () => {
    if (onSkipQuestion && !disabled && !showFeedback) onSkipQuestion();
  };

  // Option pop animation
  const pressScales = useRef(
    new Map(['A', 'B', 'C', 'D'].map((k) => [k, new Animated.Value(1)]))
  ).current;

  const pop = (letter) => {
    const v = pressScales.get(letter);
    if (!v) return;
    v.setValue(1);
    Animated.sequence([
      Animated.timing(v, { toValue: 0.985, duration: 70, useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={styles.page}>
      {/* Top banner (TotalExam vibe) */}
      <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }}>
        <LinearGradient
          colors={['#1B3A8A', '#1E4FBF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <View style={styles.badge}>
                <Ionicons name="speedometer-outline" size={14} color={getDifficultyColor()} />
                <Text style={[styles.badgeText, { color: getDifficultyColor() }]}>
                  {getDifficultyText()}
                </Text>
              </View>

              <Text style={styles.questionNumber}>
                {language === 'ar' ? 'السؤال' : 'שאלה'} {question?.question_order || '?'}
              </Text>
            </View>

            {typeof timeRemaining === 'number' && (
              <View style={styles.timerBox}>
                <View style={styles.timerTop}>
                  <Ionicons name="time-outline" size={16} color={timerColor} />
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
          </View>

          <Text style={styles.heroHint}>
            {language === 'ar'
              ? 'اختر الإجابة الصحيحة من الخيارات التالية'
              : 'בחר/י תשובה נכונה מהאפשרויות'}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Question card */}
      <Animated.View
        style={[
          styles.questionCard,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <Text style={[styles.questionText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {questionText}
        </Text>

        {!showFeedback && !disabled && onSkipQuestion && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.88}
          >
            <Ionicons name="play-forward-outline" size={18} color="#F5B301" />
            <Text style={styles.skipText}>
              {language === 'ar' ? 'تخطي هذا السؤال' : 'דלג/י על השאלה'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Options */}
      <View style={styles.options}>
        {options.map((option, idx) => {
          const state = getOptionState(option.letter);
          const scale = pressScales.get(option.letter) || new Animated.Value(1);

          const delay = 60 + idx * 55;
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
                  styles.optionCard,
                  state === 'selected' && styles.optionSelected,
                  state === 'correct' && styles.optionCorrect,
                  state === 'incorrect' && styles.optionIncorrect,
                  disabled && styles.optionDisabled,
                ]}
              >
                <View style={styles.optionRow}>
                  <View
                    style={[
                      styles.letterBox,
                      state === 'selected' && styles.letterSelected,
                      state === 'correct' && styles.letterCorrect,
                      state === 'incorrect' && styles.letterIncorrect,
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterText,
                        state === 'selected' && styles.letterTextSelected,
                        state === 'correct' && styles.letterTextCorrect,
                        state === 'incorrect' && styles.letterTextIncorrect,
                      ]}
                    >
                      {option.letter}
                    </Text>
                  </View>

                  <Text
                    style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}
                    numberOfLines={6}
                  >
                    {option.text}
                  </Text>

                  {showFeedback ? (
                    state === 'correct' ? (
                      <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
                    ) : state === 'incorrect' ? (
                      <Ionicons name="close-circle" size={22} color="#E74C3C" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color="#94A3B8" />
                    )
                  ) : selectedAnswer === option.letter ? (
                    <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color="#94A3B8" />
                  )}
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
            styles.explainCard,
            isCorrect ? styles.explainCorrect : styles.explainIncorrect,
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <View style={styles.explainHeader}>
            <Ionicons
              name="bulb-outline"
              size={18}
              color={isCorrect ? '#27AE60' : '#E74C3C'}
            />
            <Text style={styles.explainTitle}>
              {isCorrect ? 'توضيح' : 'تصحيح'}
            </Text>
          </View>

          <Text style={[styles.explainText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar'
              ? question?.explanation_ar || question?.explanation_he || ''
              : question?.explanation_he || question?.explanation_ar || ''}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F6F8FF',
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  hero: {
    borderRadius: 20,
    padding: 14,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroLeft: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: { fontWeight: '900', fontSize: 12 },
  questionNumber: { color: '#EAF1FF', fontWeight: '900', fontSize: 13 },

  timerBox: { alignItems: 'flex-end', minWidth: 110 },
  timerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
  timerText: { fontWeight: '900' },
  timerBar: {
    width: 110,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerProgress: { height: '100%', borderRadius: 999 },

  heroHint: {
    marginTop: 10,
    color: '#DCE7FF',
    fontWeight: '700',
    textAlign: 'right',
    fontSize: 12,
  },

  questionCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  questionText: {
    color: '#142B63',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '900',
  },

  skipButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245, 179, 1, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 179, 1, 0.28)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skipText: { color: '#B37A00', fontWeight: '900' },

  options: { marginTop: 12, gap: 12 },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  optionSelected: { borderColor: '#F5B301', borderWidth: 2 },
  optionCorrect: { borderColor: '#27AE60', borderWidth: 2, backgroundColor: 'rgba(39,174,96,0.06)' },
  optionIncorrect: { borderColor: '#E74C3C', borderWidth: 2, backgroundColor: 'rgba(231,76,60,0.06)' },
  optionDisabled: { opacity: 0.55 },

  letterBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  letterSelected: { backgroundColor: 'rgba(245,179,1,0.18)', borderColor: '#F5B301' },
  letterCorrect: { backgroundColor: 'rgba(39,174,96,0.14)', borderColor: '#27AE60' },
  letterIncorrect: { backgroundColor: 'rgba(231,76,60,0.12)', borderColor: '#E74C3C' },

  letterText: { fontWeight: '900', color: '#142B63' },
  letterTextSelected: { color: '#B37A00' },
  letterTextCorrect: { color: '#1D8E4A' },
  letterTextIncorrect: { color: '#B03A2E' },

  optionText: {
    flex: 1,
    color: '#142B63',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },

  explainCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  explainCorrect: { borderColor: 'rgba(39,174,96,0.35)' },
  explainIncorrect: { borderColor: 'rgba(231,76,60,0.35)' },
  explainHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  explainTitle: { color: '#142B63', fontWeight: '900' },
  explainText: { color: '#2B3E70', fontWeight: '700', lineHeight: 20 },
});
