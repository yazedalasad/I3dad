/**
 * QUESTION CARD COMPONENT (TotalExam-style UI)
 *
 * Exam mode (showFeedback=false):
 * - no correctness reveal
 *
 * Review mode (showFeedback=true):
 * - shows correct/incorrect + explanation
 *
 * i18n:
 * - UI labels come from i18next (ar/he)
 * - question/options/explanations come from DB (ar/he) based on current language
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { font, lh, textColors, touchTargets, webContent } from '../../src/theme/typography';
import { isAdaptiveAnswerCorrect, normalizeAnswerLetter, resolveCorrectAnswerLetter } from '../../utils/adaptiveTestAnswerUtils';

/* -------------------------------------------------- */
/* Stable deterministic shuffle (same seed => same order) */
/* -------------------------------------------------- */
function seededShuffle(list, seedStr) {
  const arr = [...list];

  let seed = 0;
  const s = String(seedStr || 'seed');
  for (let i = 0; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) >>> 0;

  function rand() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function isHe(lang) {
  return String(lang || '').toLowerCase().startsWith('he');
}

export default function QuestionCard({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSkipQuestion,

  showFeedback = false,
  isCorrect = false,

  language, // optional: if you pass it, it should match i18n.language
  disabled,

  timeRemaining,
  maxTime = 120,
}) {
  // ✅ IMPORTANT: use your component namespace
  const { t: rawT, i18n } = useTranslation('componentsAdaptiveTest');

  // prefer explicit prop, otherwise i18n current language
  const lang = language ?? i18n.language;
  const isArabic = String(lang).toLowerCase() === 'ar';
  const isRTL = useMemo(
    () => isHe(lang) || isArabic || I18nManager.isRTL,
    [lang, isArabic]
  );

  // ✅ safer translator: supports ns:key too, and fallback
  const t = (key, fallback) => {
    const v = rawT(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  /* ------------------ DB text (AR/HE) ------------------ */
  const questionText = useMemo(() => {
    const ar = question?.question_text_ar;
    const he = question?.question_text_he;

    if (isArabic) return ar || he || '';
    if (isHe(lang)) return he || ar || '';
    return ar || he || '';
  }, [question, lang, isArabic]);

  const explanationText = useMemo(() => {
    const ar = question?.explanation_ar;
    const he = question?.explanation_he;

    if (isArabic) return ar || he || '';
    if (isHe(lang)) return he || ar || '';
    return ar || he || '';
  }, [question, lang, isArabic]);

  // ✅ Options randomized ONCE per question id, but still submit original letter (A/B/C/D)
  const options = useMemo(() => {
    const pick = (ar, he) => {
      if (isArabic) return ar ?? he ?? '';
      if (isHe(lang)) return he ?? ar ?? '';
      return ar ?? he ?? '';
    };

    const base = [
      { letter: 'A', text: pick(question?.option_a_ar, question?.option_a_he) },
      { letter: 'B', text: pick(question?.option_b_ar, question?.option_b_he) },
      { letter: 'C', text: pick(question?.option_c_ar, question?.option_c_he) },
      { letter: 'D', text: pick(question?.option_d_ar, question?.option_d_he) },
    ].filter((o) => String(o.text || '').trim().length > 0);

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
    lang,
    isArabic,
  ]);

  /* ------------------ Entrance animations ------------------ */
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

  /* ------------------ Timer bar (optional) ------------------ */
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

  /**
   * Option state rules:
   * - Exam mode: only selected highlight
   * - Review mode: correct + incorrect selection
   */
  const correctLetter = resolveCorrectAnswerLetter(question, lang);
  const pickedLetter = normalizeAnswerLetter(selectedAnswer);
  const answerIsCorrect = Boolean(
    pickedLetter && correctLetter && pickedLetter === correctLetter
  );
  const feedbackActive = showFeedback && Boolean(pickedLetter);

  const getOptionState = (letter) => {
    const optionLetter = normalizeAnswerLetter(letter);
    if (!optionLetter) return 'normal';

    if (!feedbackActive) {
      if (pickedLetter === optionLetter) return 'selected';
      return 'normal';
    }

    if (correctLetter && optionLetter === correctLetter) return 'correct';
    if (pickedLetter === optionLetter && !answerIsCorrect) return 'incorrect';
    return 'normal';
  };

  const handleSkip = () => {
    if (onSkipQuestion && !disabled && !feedbackActive) onSkipQuestion();
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

  // ✅ FIXED KEYS (from componentsAdaptiveTest.json)
  const questionLabel = t('question.questionLabel', isArabic ? 'سؤال' : 'שאלה');

  const skipThisQuestion = t(
    'question.skip',
    isArabic ? 'تخطي هذا السؤال' : 'דלג/י על השאלה'
  );

  const explanationTitle = answerIsCorrect
    ? t('explanation.correctTitle', isArabic ? 'توضيح' : 'הסבר')
    : t('explanation.wrongTitle', isArabic ? 'تصحيح' : 'תיקון');

  return (
    <View style={styles.page}>
      {/* Question card */}
      <Animated.View
        style={[
          styles.questionCard,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <View style={styles.topRow}>
          <Text style={[styles.questionNumber, { textAlign: isRTL ? 'right' : 'left' }]}>
            {questionLabel} {question?.question_order || '?'}
          </Text>

          {typeof timeRemaining === 'number' && (
            <View style={styles.timerInline}>
              <View style={styles.timerTop}>
                <Ionicons name="time-outline" size={20} color={timerColor} />
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

        {feedbackActive && (
          <View
            style={[
              styles.resultBanner,
              answerIsCorrect ? styles.resultBannerCorrect : styles.resultBannerIncorrect,
            ]}
          >
            <Ionicons
              name={answerIsCorrect ? 'checkmark-circle' : 'close-circle'}
              size={22}
              color={answerIsCorrect ? '#1B7A43' : '#C0392B'}
            />
            <Text
              style={[
                styles.resultBannerText,
                answerIsCorrect ? styles.resultBannerTextCorrect : styles.resultBannerTextIncorrect,
              ]}
            >
              {answerIsCorrect
                ? t('feedback.correct', isArabic ? 'إجابة صحيحة' : 'תשובה נכונה')
                : t('feedback.incorrect', isArabic ? 'إجابة خاطئة' : 'תשובה שגויה')}
            </Text>
          </View>
        )}

        {/* Skip only during exam mode */}
        {!feedbackActive && !disabled && onSkipQuestion && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.88}>
            <Ionicons name="play-forward-outline" size={20} color="#F5B301" />
            <Text style={styles.skipText}>{skipThisQuestion}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Options */}
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

          // Icon rules:
          let rightIcon = null;
          if (!feedbackActive) {
            rightIcon =
              pickedLetter === option.letter ? (
                <Ionicons name="radio-button-on" size={28} color="#2455D6" />
              ) : (
                <Ionicons name="ellipse-outline" size={28} color="#64748B" />
              );
          } else {
            rightIcon =
              state === 'correct' ? (
                <Ionicons name="checkmark-circle" size={28} color="#27AE60" />
              ) : state === 'incorrect' ? (
                <Ionicons name="close-circle" size={28} color="#E74C3C" />
              ) : (
                <Ionicons name="ellipse-outline" size={28} color="#64748B" />
              );
          }

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
                  feedbackActive && state === 'correct' && styles.optionCorrect,
                  feedbackActive && state === 'incorrect' && styles.optionIncorrect,
                  disabled && styles.optionDisabled,
                ]}
              >
                <View style={styles.optionRow}>
                  <Text
                    style={[
                      styles.optionText,
                      { textAlign: isRTL ? 'right' : 'left' },
                      feedbackActive && state === 'correct' && styles.optionTextCorrect,
                      feedbackActive && state === 'incorrect' && styles.optionTextIncorrect,
                    ]}
                  >
                    {option.text}
                  </Text>
                  {rightIcon}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Explanation shown ONLY in review mode */}
      {feedbackActive && !!String(explanationText || '').trim() && (
        <Animated.View
          style={[
            styles.explainCard,
            answerIsCorrect ? styles.explainCorrect : styles.explainIncorrect,
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <View style={styles.explainHeader}>
            <Ionicons
              name="bulb-outline"
              size={18}
              color={answerIsCorrect ? '#27AE60' : '#E74C3C'}
            />
            <Text style={styles.explainTitle}>{explanationTitle}</Text>
          </View>

          <Text style={[styles.explainText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {explanationText}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 8,
    alignSelf: 'center',
    maxWidth: Platform.OS === 'web' ? webContent.examMaxWidth : undefined,
  },

  questionCard: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  questionNumber: {
    color: '#2455D6',
    fontWeight: '900',
    fontSize: 16,
    flex: 1,
    writingDirection: 'rtl',
  },

  timerInline: { alignItems: 'flex-end', minWidth: 104 },
  timerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
  timerText: { fontWeight: '900' },
  timerBar: {
    width: 104,
    height: 6,
    backgroundColor: 'rgba(27,58,138,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  timerProgress: { height: '100%', borderRadius: 999 },

  questionText: {
    color: textColors.primary,
    fontSize: font('question'),
    lineHeight: lh('question'),
    fontWeight: '900',
    writingDirection: 'rtl',
  },

  resultBanner: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  resultBannerCorrect: {
    backgroundColor: 'rgba(39,174,96,0.12)',
    borderColor: 'rgba(39,174,96,0.35)',
  },
  resultBannerIncorrect: {
    backgroundColor: 'rgba(231,76,60,0.14)',
    borderColor: 'rgba(231,76,60,0.4)',
  },
  resultBannerText: {
    fontWeight: '900',
    fontSize: font('body'),
    lineHeight: lh('body'),
  },
  resultBannerTextCorrect: { color: '#1B7A43' },
  resultBannerTextIncorrect: { color: '#C0392B' },

  skipButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(245, 179, 1, 0.45)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 7,
  },
  skipText: {
    color: '#B37A00',
    fontWeight: '900',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    writingDirection: 'rtl',
  },

  options: { marginTop: 10, gap: 10 },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: touchTargets.answerOptionMinHeight,
  },

  optionSelected: {
    borderColor: '#2455D6',
    borderWidth: 2,
    backgroundColor: '#F3F7FF',
  },
  optionCorrect: {
    borderColor: '#27AE60',
    borderWidth: 2,
    backgroundColor: 'rgba(39,174,96,0.14)',
  },
  optionIncorrect: {
    borderColor: '#E74C3C',
    borderWidth: 2,
    backgroundColor: 'rgba(231,76,60,0.16)',
  },
  optionDisabled: { opacity: 0.55 },

  optionText: {
    flex: 1,
    color: '#142B63',
    fontSize: font('body'),
    lineHeight: lh('body'),
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  optionTextCorrect: {
    color: '#1B7A43',
  },
  optionTextIncorrect: {
    color: '#C0392B',
    fontWeight: '900',
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
  explainTitle: {
    color: textColors.primary,
    fontWeight: '900',
    fontSize: font('body'),
    lineHeight: lh('body'),
  },
  explainText: {
    color: textColors.secondary,
    fontWeight: '700',
    fontSize: font('body'),
    lineHeight: lh('body'),
  },
});
