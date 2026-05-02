import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { desertTheme } from '../utils/theme';
import { isHorizontalWord } from '../utils/puzzleHelpers';

const ARABIC_DISTRACTOR_POOL = [
  '\u0628', '\u062a', '\u062b', '\u062c', '\u062d', '\u062e', '\u0631', '\u0632', '\u0634', '\u0635', '\u0636', '\u0637',
  '\u0638', '\u0639', '\u063a', '\u0641', '\u0642', '\u0643', '\u0644', '\u0645', '\u0646', '\u0648', '\u064a',
];

function createSeed(value) {
  return Array.from(String(value || '')).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function seededShuffle(items, seedValue) {
  const list = [...items];
  let seed = createSeed(seedValue) || 1;

  for (let index = list.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const swapIndex = Math.floor((seed / 233280) * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

function buildLetterChoices(selectedWord) {
  if (!selectedWord?.answer) return [];

  if (Array.isArray(selectedWord.letterChoices) && selectedWord.letterChoices.length) {
    return selectedWord.letterChoices;
  }

  const answerLetters = Array.from(selectedWord.answer);
  const distractorCandidates = seededShuffle(
    ARABIC_DISTRACTOR_POOL.filter((letter) => !answerLetters.includes(letter)),
    `${selectedWord.id}-distractors`
  );

  const totalLetterCount = Math.max(12, Math.ceil((answerLetters.length * 3) / 6) * 6);
  const distractorCount = Math.max(0, totalLetterCount - answerLetters.length);
  const distractors = distractorCandidates.slice(0, distractorCount);
  const separatedCorrectLetters = seededShuffle(answerLetters, `${selectedWord.id}-answers`);
  const mixedLetters = new Array(totalLetterCount).fill(null);
  const preferredAnswerSlots = seededShuffle(
    Array.from({ length: totalLetterCount }, (_, index) => index).filter((index) => index % 2 === 1),
    `${selectedWord.id}-slots`
  );

  separatedCorrectLetters.forEach((letter, index) => {
    mixedLetters[preferredAnswerSlots[index] ?? index * 2 + 1] = letter;
  });

  let distractorIndex = 0;
  for (let index = 0; index < totalLetterCount; index += 1) {
    if (!mixedLetters[index]) {
      mixedLetters[index] = distractors[distractorIndex];
      distractorIndex += 1;
    }
  }

  return mixedLetters;
}

export default function WordAnswerPanel({
  selectedWord,
  draftSlots = [],
  lockedSlots = [],
  activeSlotIndex = 0,
  isDraftComplete = false,
  isDraftCorrect = false,
  submissionEffect = null,
  statusLabel = '',
  attemptsRemaining = null,
  submitLabel = '\u062b\u0628\u0651\u062a \u0627\u0644\u0643\u0644\u0645\u0629',
  submitDisabled = false,
  onAppendLetter,
  onSelectSlot,
  onRemoveLetter,
  onClear,
  onShuffle,
  onSubmit,
  disabled = false,
  compact = false,
}) {
  const colors = desertTheme.colors;
  const answerLength = selectedWord?.length || 0;
  const letterChoices = useMemo(() => buildLetterChoices(selectedWord), [selectedWord]);
  const canSubmit = !!selectedWord && !disabled && isDraftComplete && !submitDisabled;
  const bounceValuesRef = useRef([]);
  const flashTimeoutRef = useRef(null);
  const [flashTone, setFlashTone] = useState(null);
  const displaySlotIndexes = useMemo(() => {
    if (!selectedWord) return [];

    return Array.from({ length: answerLength }, (_, index) => index);
  }, [answerLength, selectedWord]);

  useEffect(() => {
    bounceValuesRef.current = Array.from(
      { length: answerLength },
      (_, index) => bounceValuesRef.current[index] || new Animated.Value(0)
    );
  }, [answerLength]);

  useEffect(() => {
    setFlashTone(null);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, [selectedWord?.id]);

  useEffect(() => {
    if (!submissionEffect?.tick || !selectedWord || !answerLength) return;

    const orderedIndexes = [...displaySlotIndexes];

    bounceValuesRef.current.forEach((value) => value.setValue(0));
    setFlashTone(null);

    Animated.parallel(
      orderedIndexes.map((slotIndex, orderIndex) =>
        Animated.sequence([
          Animated.delay(orderIndex * 70),
          Animated.timing(bounceValuesRef.current[slotIndex], {
            toValue: -12,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.spring(bounceValuesRef.current[slotIndex], {
            toValue: 0,
            speed: 18,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ])
      )
    ).start(() => {
      setFlashTone(submissionEffect.tone);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashTone(null);
      }, 720);
    });

    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
    };
  }, [answerLength, displaySlotIndexes, selectedWord, submissionEffect]);

  const previewToneStyle =
    flashTone === 'success'
      ? styles.answerPreviewSuccess
      : flashTone === 'error'
      ? styles.answerPreviewError
      : isDraftCorrect
      ? styles.answerPreviewCorrect
      : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.panelDark, borderColor: colors.cardBorder }]}>
      <Text style={[styles.label, { color: '#F9E7C7' }]}>{'\u0643\u0648\u0651\u0646 \u0627\u0644\u0643\u0644\u0645\u0629'}</Text>

      <View style={[styles.answerPreview, previewToneStyle]}>
        {selectedWord ? (
          displaySlotIndexes.map((slotIndex) => {
            const isLocked = !!lockedSlots[slotIndex];
            const isActive = !isDraftComplete && activeSlotIndex === slotIndex && !isLocked;
            const slotToneStyle =
              flashTone === 'success'
                ? styles.answerSlotSuccess
                : flashTone === 'error'
                ? styles.answerSlotError
                : null;
            const slotTextToneStyle =
              flashTone === 'success' || flashTone === 'error' ? styles.answerSlotTextOnTone : null;

            return (
              <Animated.View
                key={slotIndex}
                style={{ transform: [{ translateY: bounceValuesRef.current[slotIndex] || 0 }] }}
              >
                <Pressable
                  onPress={() => onSelectSlot?.(slotIndex)}
                style={[
                  styles.answerSlot,
                  { borderColor: isDraftCorrect ? '#2F8F4E' : colors.cardBorder },
                  isLocked && styles.answerSlotLocked,
                  isActive && styles.answerSlotActive,
                  isDraftCorrect && styles.answerSlotCorrect,
                  slotToneStyle,
                ]}
              >
                  <Text style={[styles.answerSlotText, { color: colors.ink }, slotTextToneStyle]}>
                    {draftSlots[slotIndex] || ''}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })
        ) : (
          <Text style={[styles.placeholderText, styles.rtlFullText]}>
            {'\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0645\u0646 \u0627\u0644\u0634\u0628\u0643\u0629 \u0623\u0648\u0644\u0627'}
          </Text>
        )}
      </View>

      {selectedWord ? (
        <>
          <Text style={[styles.validationText, isDraftCorrect ? styles.validationSuccess : styles.validationHint]}>
            {isDraftCorrect
              ? '\u0627\u0644\u0643\u0644\u0645\u0629 \u0645\u0643\u062a\u0645\u0644\u0629 \u0648\u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u062b\u0628\u064a\u062a.'
              : isDraftComplete
              ? '\u0627\u0644\u0643\u0644\u0645\u0629 \u0645\u0643\u062a\u0645\u0644\u0629. \u0631\u0627\u062c\u0639 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062d\u0631\u0648\u0641 \u062b\u0645 \u062b\u0628\u0651\u062a\u0647\u0627.'
              : isHorizontalWord(selectedWord)
              ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u062d\u0631\u0648\u0641 \u0628\u0627\u0644\u062a\u0631\u062a\u064a\u0628 \u0643\u0645\u0627 \u062a\u064f\u0642\u0631\u0623 \u0639\u0631\u0628\u064a\u0627.'
              : '\u0627\u0628\u062f\u0623 \u0645\u0646 \u0627\u0644\u062d\u0631\u0641 \u0627\u0644\u0623\u0648\u0644 \u0641\u064a \u0623\u0639\u0644\u0649 \u0627\u0644\u0643\u0644\u0645\u0629.'}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>{statusLabel}</Text>
            {typeof attemptsRemaining === 'number' ? (
              <Text style={styles.attemptsText}>
                {`\u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0627\u062a \u0627\u0644\u0645\u062a\u0628\u0642\u064a\u0629: ${attemptsRemaining}`}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onShuffle}
          style={[styles.toolButton, compact && styles.toolButtonCompact]}
          disabled={disabled || !selectedWord}
        >
          <Text style={styles.toolLabel}>{'\u0628\u062f\u0651\u0644'}</Text>
        </Pressable>
        <Pressable
          onPress={onRemoveLetter}
          style={[styles.toolButton, compact && styles.toolButtonCompact]}
          disabled={disabled || !selectedWord}
        >
          <Text style={styles.toolLabel}>{'\u0627\u062d\u0630\u0641'}</Text>
        </Pressable>
        <Pressable
          onPress={onClear}
          style={[styles.toolButton, compact && styles.toolButtonCompact]}
          disabled={disabled || !selectedWord}
        >
          <Text style={styles.toolLabel}>{'\u0627\u0645\u0633\u062d'}</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            compact && styles.submitButtonCompact,
            {
              backgroundColor: canSubmit ? colors.accent : '#A58D74',
              borderColor: canSubmit ? colors.accentDark : '#8D745B',
            },
            pressed && canSubmit && styles.pressed,
          ]}
        >
          <Text style={styles.submitLabel}>{submitLabel}</Text>
        </Pressable>
      </View>

      <View style={[styles.letterBank, compact && styles.letterBankCompact]}>
        {selectedWord ? (
          letterChoices.map((letter, index) => (
            <Pressable
              key={`${letter}-${index}`}
              onPress={() => onAppendLetter(letter)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.letterButton,
                compact && styles.letterButtonCompact,
                {
                  backgroundColor: disabled ? '#CDAF86' : colors.panelLight,
                  borderColor: colors.cardBorder,
                },
                pressed && !disabled && styles.pressed,
              ]}
            >
              <Text style={[styles.letterButtonText, { color: colors.ink }]}>{letter}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.letterHelp, styles.rtlFullText]}>
            {'\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u062d\u0631\u0648\u0641 \u0647\u0646\u0627 \u0628\u0639\u062f \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0648\u0636\u0639 \u0645\u0646 \u0627\u0644\u0634\u0628\u0643\u0629'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  answerPreview: {
    marginTop: 10,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F4E7CF',
    borderWidth: 2,
    borderColor: '#8C6239',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerPreviewCorrect: {
    borderColor: '#2F8F4E',
    backgroundColor: '#EEF9F0',
  },
  answerPreviewSuccess: {
    borderColor: '#2F8F4E',
    backgroundColor: '#EEF9F0',
  },
  answerPreviewError: {
    borderColor: '#B94A48',
    backgroundColor: '#FDE9E8',
  },
  answerSlot: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#FFF9EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSlotActive: {
    borderColor: '#D99A3B',
    backgroundColor: '#FFF3DB',
  },
  answerSlotLocked: {
    backgroundColor: '#E8D3B2',
    borderColor: '#B88243',
  },
  answerSlotCorrect: {
    backgroundColor: '#F7FFF8',
  },
  answerSlotSuccess: {
    backgroundColor: '#3F8F55',
    borderColor: '#2F6E40',
  },
  answerSlotError: {
    backgroundColor: '#B94A48',
    borderColor: '#913534',
  },
  answerSlotText: {
    fontSize: 22,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  answerSlotTextOnTone: {
    color: '#FFF8EB',
  },
  placeholderText: {
    color: '#9A7C5D',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  validationText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  validationSuccess: {
    color: '#B8F5C8',
  },
  validationHint: {
    color: '#EFD8B5',
  },
  statusRow: {
    marginTop: 6,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusText: {
    color: '#FFF3DC',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  attemptsText: {
    color: '#F7D9A8',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  toolButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#8A623B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BC9360',
  },
  toolButtonCompact: {
    minWidth: '22%',
  },
  toolLabel: {
    color: '#FFF3DC',
    fontSize: 14,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  submitButton: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  submitButtonCompact: {
    minWidth: '100%',
    flexBasis: '100%',
  },
  submitLabel: {
    color: '#FFF8EB',
    fontSize: 15,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  letterBank: {
    marginTop: 12,
    minHeight: 168,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 247, 232, 0.14)',
    borderWidth: 1.5,
    borderColor: '#BC9360',
    padding: 10,
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 12,
    justifyContent: 'center',
    alignContent: 'flex-start',
  },
  letterBankCompact: {
    minHeight: 0,
    rowGap: 10,
    columnGap: 8,
  },
  letterButton: {
    width: '15%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  letterButtonCompact: {
    width: '15.5%',
    minWidth: 44,
    height: 46,
  },
  letterButtonText: {
    fontSize: 22,
    fontWeight: '900',
  },
  letterHelp: {
    color: '#F6EAD4',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  rtlFullText: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
