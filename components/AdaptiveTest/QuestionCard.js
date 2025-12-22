/**
 * QUESTION CARD COMPONENT (TotalExam-style UI)
 * - Light theme (same vibe as TotalExamScreen)
 * - Smooth entrance animation
 * - Option press pop animation
 * - RTL/LTR alignment support
 * - ✅ Stable random option order per question (shuffle once per question.id)
 *
 * CHANGES:
 * 1) Removed the top "navbar" banner (LinearGradient hero).
 * 2) Removed A/B/C/D letter boxes from the options UI (still submits original letter).
 */

import { Ionicons } from '@expo/vector-icons';
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

/* -------------------------------------------------- */
/* Stable deterministic shuffle (same seed => same order) */
/* -------------------------------------------------- */
function seededShuffle(list, seedStr) {
  const arr = [...list];

  // Build numeric seed
  let seed = 0;
  const s = String(seedStr || 'seed');
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;

  // Deterministic PRNG
  function rand() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

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

  // ✅ Options randomized ONCE per question id, but still submit original letter (A/B/C/D)
  const options = useMemo(() => {
    const pick = (ar, he) => {
      if (language === 'ar') return ar ?? he ?? '';
      return he ?? ar ?? '';
    };

    const base = [
      { letter: 'A', text: pick(question?.option_a_ar, question?.option_a_he) },
      { letter: 'B', text: pick(question?.option_b_ar, question?.option_b_he) },
      { letter: 'C', text: pick(question?.option_c_ar, question?.option_c_he) },
      { letter: 'D', text: pick(question?.option_d_ar, question?.option_d_he) },
    ].filter((o) => String(o.text || '').trim().length > 0);

    // Stable per question (won't reshuffle on re-render)
    const seed =
      question?.id ||
      question?.question_text_ar ||
      question?.question_text_he ||
      'fallback-seed';

    return seededShuffle(base, seed);
  }, [
    question?.id,
    question?.option_a_ar,
    question?.option_a_he,
    question?.option_b_ar,
    question?.option_b_he,
    question?.option_c_ar,
    question?.option_c_he,
    question?.option_d_ar,
    question?.option_d_he,
    question?.question_text_ar,
    question?.question_text_he,
    language,
  ]);

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

  // ---------- Timer bar (kept, but now inside the question card) ----------
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
      {/* Question card (navbar removed, everything starts here) */}
      <Animated.View
        style={[
          styles.questionCard,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        {/* Optional small header row (question number + timer), not the old navbar */}
        <View style={styles.topRow}>
          <Text style={[styles.questionNumber, { textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar' ? 'السؤال' : 'שאלה'} {question?.question_order || '?'}
          </Text>

          {typeof timeRemaining === 'number' && (
            <View style={styles.timerInline}>
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

      {/* Options (A/B/C/D UI removed) */}
      <View style={styles.options}>
        {options.map((option) => {
          const state = getOptionState(option.letter);
          const scale = pressScales.get(option.letter) || new Animated.Value(1);

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
                  // ✅ still sends original letter (A/B/C/D)
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
            <Text style={styles.explainTitle}>{isCorrect ? 'توضيح' : 'تصحيح'}</Text>
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

  questionCard: {
    marginTop: 6,
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

  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  questionNumber: {
    color: '#1B3A8A',
    fontWeight: '900',
    fontSize: 13,
    flex: 1,
  },

  timerInline: { alignItems: 'flex-end', minWidth: 110 },
  timerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
  timerText: { fontWeight: '900' },
  timerBar: {
    width: 110,
    height: 7,
    backgroundColor: 'rgba(27,58,138,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerProgress: { height: '100%', borderRadius: 999 },

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
  optionCorrect: {
    borderColor: '#27AE60',
    borderWidth: 2,
    backgroundColor: 'rgba(39,174,96,0.06)',
  },
  optionIncorrect: {
    borderColor: '#E74C3C',
    borderWidth: 2,
    backgroundColor: 'rgba(231,76,60,0.06)',
  },
  optionDisabled: { opacity: 0.55 },

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
