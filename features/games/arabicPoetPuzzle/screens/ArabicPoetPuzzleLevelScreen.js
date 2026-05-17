import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ProgressBar, ScreenContainer } from '../../shared';
import FeedbackPanel from '../components/FeedbackPanel';
import HintCard from '../components/HintCard';
import PoetPuzzleBoard from '../components/PoetPuzzleBoard';
import WordAnswerPanel from '../components/WordAnswerPanel';
import WordListChips from '../components/WordListChips';
import desertThemeBgImage from '../assets/desert-theme-bg.png';
import { useArabicPoetPuzzle } from '../hooks/useArabicPoetPuzzle';
import { markArabicPoetPuzzleLevelCompleted } from '../services/levelProgressService';
import { isHorizontalWord } from '../utils/puzzleHelpers';
import { desertTheme } from '../utils/theme';

const WIN_CELEBRATION_DURATION_MS = 1450;

function getDirectionLabel(selectedWord) {
  if (!selectedWord) return '';

  return isHorizontalWord(selectedWord)
    ? '\u0645\u0646 \u0627\u0644\u064a\u0645\u064a\u0646 \u0625\u0644\u0649 \u0627\u0644\u064a\u0633\u0627\u0631'
    : '\u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649 \u0625\u0644\u0649 \u0627\u0644\u0623\u0633\u0641\u0644';
}

export default function ArabicPoetPuzzleLevelScreen({ route, navigation }) {
  const levelId = route?.params?.levelId || 'arabic_poet_puzzle_level_1';
  const studentId = route?.params?.studentId || null;
  const colors = desertTheme.colors;
  const { width } = useWindowDimensions();
  const isPhoneLayout = width < 1100;
  const isWideLayout = width >= 1280;

  const {
    level,
    selectedWord,
    selectWord,
    clearSelectedWord,
    draftSlots,
    lockedSlots,
    activeSlotIndex,
    appendLetter,
    selectDraftSlot,
    removeLastLetter,
    clearDraftAnswer,
    shuffleDraftLetters,
    solvedMap,
    isDraftComplete,
    draftMatchesSelectedWord,
    submissionEffect,
    feedback,
    progress,
    wrongAttempts,
    elapsedMs,
    selectedWordSolved,
    remainingAttempts,
    startLevel,
    submitAnswer,
    abandonSession,
    session,
    selectedWordId,
  } = useArabicPoetPuzzle({ levelId });

  const boardCellSize = isPhoneLayout
    ? Math.max(22, Math.min(34, Math.floor((width - 78) / Math.max(level?.board?.cols || 1, 1))))
    : 24;

  const [submitting, setSubmitting] = useState(false);
  const [isAnswerModalVisible, setIsAnswerModalVisible] = useState(false);
  const [modalWordId, setModalWordId] = useState(null);
  const [winCelebrationTick, setWinCelebrationTick] = useState(0);

  const solvedWordsCount = Object.keys(solvedMap).length;
  const minutes = Math.floor((elapsedMs || 0) / 60000);
  const seconds = Math.floor(((elapsedMs || 0) % 60000) / 1000);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const selectedWordDirectionLabel = getDirectionLabel(selectedWord);
  const submitLabel = !selectedWord
    ? '\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0623\u0648\u0644\u0627'
    : selectedWordSolved
    ? '\u062a\u0645 \u0627\u0644\u062a\u062b\u0628\u064a\u062a \u2705'
    : isDraftComplete
    ? '\u062b\u0628\u0651\u062a \u0627\u0644\u0643\u0644\u0645\u0629'
    : '\u0623\u0643\u0645\u0644 \u0627\u0644\u062d\u0631\u0648\u0641';
  const wordStatus = !selectedWord
    ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0643\u0644\u0645\u0629: \u0644\u0645 \u064a\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0643\u0644\u0645\u0629'
    : selectedWordSolved
    ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0643\u0644\u0645\u0629: \u0645\u062b\u0628\u062a\u0629 \u2705'
    : isDraftComplete
    ? '\u062d\u0627\u0644\u0629 \u0627\u0644\u0643\u0644\u0645\u0629: \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u062b\u0628\u064a\u062a'
    : '\u062d\u0627\u0644\u0629 \u0627\u0644\u0643\u0644\u0645\u0629: \u0625\u062c\u0627\u0628\u0629 \u0646\u0627\u0642\u0635\u0629';

  useEffect(() => {
    if (!studentId) return;
    startLevel(studentId).catch(() => {});
  }, [startLevel, studentId]);

  useEffect(() => {
    if (!isPhoneLayout) {
      setIsAnswerModalVisible(false);
      setModalWordId(null);
      return;
    }
  }, [isPhoneLayout]);

  function handleSelectWord(wordId) {
    if (isPhoneLayout && selectedWordId === wordId) {
      setModalWordId(wordId);
      setIsAnswerModalVisible(true);
      return;
    }

    selectWord(wordId);

    if (isPhoneLayout) {
      setModalWordId(wordId);
      setIsAnswerModalVisible(true);
    }
  }

  function handleCloseAnswerModal() {
    setIsAnswerModalVisible(false);
    setModalWordId(null);
    clearSelectedWord();
  }

  async function handleBackToLevels() {
    try {
      if (session?.id) {
        await abandonSession?.({ currentSceneId: level.id });
      }
    } catch (error) {
      console.warn('Arabic puzzle abandonSession failed:', error?.message || error);
    } finally {
      navigation?.navigate?.('ArabicPoetPuzzleHome', { studentId });
    }
  }

  async function handleBackToGames() {
    try {
      if (session?.id) {
        await abandonSession?.({ currentSceneId: level.id });
      }
    } catch (error) {
      console.warn('Arabic puzzle abandonSession failed:', error?.message || error);
    } finally {
      navigation?.navigate?.('games');
    }
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const result = await submitAnswer();

      if (result?.completed) {
        setWinCelebrationTick((prev) => prev + 1);
        if (studentId) await markArabicPoetPuzzleLevelCompleted(level.id, studentId);
        await new Promise((resolve) => {
          setTimeout(resolve, WIN_CELEBRATION_DURATION_MS);
        });
        navigation?.replace?.('ArabicPoetPuzzleResult', {
          levelId,
          studentId,
          result,
          stats: result?.stats,
        });
        return;
      }

      if (result?.correct && isPhoneLayout) {
        handleCloseAnswerModal();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ImageBackground source={desertThemeBgImage} resizeMode="cover" style={styles.flex}>
      <ScreenContainer scroll style={styles.transparent}>
        <View
          style={[
            styles.titleCard,
            {
              backgroundColor: 'rgba(242, 229, 206, 0.92)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.titleGlow} />
          <Pressable style={styles.levelsBackButton} onPress={handleBackToLevels}>
            <Text style={styles.levelsBackText}>{'\u0631\u062c\u0648\u0639 \u0644\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a'}</Text>
          </Pressable>
          <Pressable style={[styles.levelsBackButton, styles.gamesBackButton]} onPress={handleBackToGames}>
            <Text style={styles.levelsBackText}>{'\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0623\u0644\u0639\u0627\u0628'}</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.ink }]}>{level.title}</Text>
          <Text style={[styles.subtitle, { color: colors.accentDark }]}>{level.subtitle}</Text>
          <Text style={[styles.instruction, { color: colors.ink }]}>
            {
              '\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0645\u0646 \u0627\u0644\u062e\u0631\u064a\u0637\u0629\u060c \u0627\u0642\u0631\u0623 \u0627\u0644\u062a\u0644\u0645\u064a\u062d\u060c \u062b\u0645 \u0643\u0648\u0651\u0646 \u0627\u0644\u0643\u0644\u0645\u0629 \u0643\u0645\u0627 \u062a\u064f\u0642\u0631\u0623 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0645\u0646 \u0627\u0644\u064a\u0645\u064a\u0646 \u0625\u0644\u0649 \u0627\u0644\u064a\u0633\u0627\u0631.'
            }
          </Text>
        </View>

        <ProgressBar
          progress={progress}
          currentStep={solvedWordsCount}
          totalSteps={level.words.length}
          label="\u062a\u0642\u062f\u0645 \u0627\u0644\u0643\u0644\u0645\u0627\u062a"
        />

        <View style={styles.metaRow}>
          <View style={[styles.metaCard, { borderColor: colors.cardBorder }]}>
            <Text style={styles.metaLabel}>{'\u0627\u0644\u0648\u0642\u062a'}</Text>
            <Text style={[styles.metaValue, { color: colors.ink }]}>{formattedTime}</Text>
          </View>
          <View style={[styles.metaCard, { borderColor: colors.cardBorder }]}>
            <Text style={styles.metaLabel}>{'\u0627\u0644\u0623\u062e\u0637\u0627\u0621'}</Text>
            <Text style={[styles.metaValue, { color: colors.ink }]}>{wrongAttempts}</Text>
          </View>
          <View style={[styles.metaCard, { borderColor: colors.cardBorder }]}>
            <Text style={styles.metaLabel}>{'\u0627\u0644\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0645\u0644\u0629'}</Text>
            <Text style={[styles.metaValue, { color: colors.ink }]}>
              {solvedWordsCount}/{level.words.length}
            </Text>
          </View>
        </View>

        <View style={[styles.contentRow, isWideLayout && styles.contentRowWide]}>
          <View
            style={[
              styles.boardCard,
              isWideLayout && styles.boardCardWide,
              {
                backgroundColor: 'rgba(247, 235, 214, 0.9)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.boardAccentRow}>
              <View style={[styles.boardAccent, { backgroundColor: colors.selectedGlow }]} />
              <View style={[styles.boardAccent, { backgroundColor: colors.accent }]} />
              <View style={[styles.boardAccent, { backgroundColor: colors.solved }]} />
            </View>

            <Text style={[styles.mapLabel, { color: colors.ink }]}>{'\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0643\u0644\u0645\u0627\u062a'}</Text>

            <WordListChips
              words={level.words}
              solvedMap={solvedMap}
              selectedWordId={selectedWordId}
              onSelectWord={handleSelectWord}
              celebrationTick={winCelebrationTick}
            />

            <PoetPuzzleBoard
              board={level.board}
              words={level.words}
              selectedWord={selectedWord}
              solvedMap={solvedMap}
              cellSize={boardCellSize}
              onPressWord={handleSelectWord}
            />
          </View>

          {!isPhoneLayout ? (
            <View style={[styles.bottomStack, isWideLayout && styles.sidePanelWide]}>
              <HintCard selectedWord={selectedWord} />
              <WordAnswerPanel
                selectedWord={selectedWord}
                draftSlots={draftSlots}
                lockedSlots={lockedSlots}
                activeSlotIndex={activeSlotIndex}
                isDraftComplete={isDraftComplete}
                isDraftCorrect={draftMatchesSelectedWord}
                submissionEffect={submissionEffect}
                statusLabel={wordStatus}
                attemptsRemaining={selectedWord ? remainingAttempts : null}
                submitLabel={submitLabel}
                submitDisabled={selectedWordSolved || !selectedWord || !isDraftComplete}
                onAppendLetter={appendLetter}
                onSelectSlot={selectDraftSlot}
                onRemoveLetter={removeLastLetter}
                onClear={clearDraftAnswer}
                onShuffle={shuffleDraftLetters}
                onSubmit={handleSubmit}
                disabled={submitting}
              />
              <FeedbackPanel feedback={feedback} />
            </View>
          ) : (
            <View style={styles.mobileHintWrap}>
              <HintCard selectedWord={selectedWord} />
              <FeedbackPanel feedback={feedback} />
            </View>
          )}
        </View>

        {isPhoneLayout ? (
          <Modal
            visible={isAnswerModalVisible}
            transparent
            animationType="slide"
            onRequestClose={handleCloseAnswerModal}
          >
            <Pressable style={styles.modalOverlay} onPress={handleCloseAnswerModal}>
              <Pressable
                style={[
                  styles.modalSheet,
                  {
                    backgroundColor: 'rgba(112, 72, 37, 0.98)',
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => {}}
              >
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedWord
                      ? `\u0627\u0644\u0643\u0644\u0645\u0629 \u0631\u0642\u0645 ${selectedWord.number}`
                      : modalWordId
                      ? `\u0627\u0644\u0643\u0644\u0645\u0629 \u0631\u0642\u0645 ${level.words.find((word) => word.id === modalWordId)?.number || ''}`
                      : '\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629'}
                  </Text>
                  <Pressable style={styles.modalCloseBtn} onPress={handleCloseAnswerModal}>
                    <Text style={styles.modalCloseText}>{'\u0625\u063a\u0644\u0627\u0642'}</Text>
                  </Pressable>
                </View>

                <HintCard selectedWord={selectedWord} />
                <View style={styles.modalSpacer} />
                <WordAnswerPanel
                  selectedWord={selectedWord}
                  draftSlots={draftSlots}
                  lockedSlots={lockedSlots}
                  activeSlotIndex={activeSlotIndex}
                  isDraftComplete={isDraftComplete}
                  isDraftCorrect={draftMatchesSelectedWord}
                  submissionEffect={submissionEffect}
                  statusLabel={wordStatus}
                  attemptsRemaining={selectedWord ? remainingAttempts : null}
                  submitLabel={submitLabel}
                  submitDisabled={selectedWordSolved || !selectedWord || !isDraftComplete}
                  onAppendLetter={appendLetter}
                  onSelectSlot={selectDraftSlot}
                  onRemoveLetter={removeLastLetter}
                  onClear={clearDraftAnswer}
                  onShuffle={shuffleDraftLetters}
                  onSubmit={handleSubmit}
                  disabled={submitting}
                  compact
                />
                <View style={styles.modalSpacer} />
                <FeedbackPanel feedback={feedback} />
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </ScreenContainer>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  titleCard: {
    borderWidth: 2,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#55351D',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  titleGlow: {
    position: 'absolute',
    top: -24,
    left: 24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 244, 214, 0.45)',
  },
  levelsBackButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(112, 72, 37, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(112, 72, 37, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  levelsBackText: {
    color: '#6E4727',
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  gamesBackButton: {
    marginTop: -4,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  instruction: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  mapLabel: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  metaRow: {
    marginTop: 10,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaCard: {
    flex: 1,
    minWidth: 105,
    backgroundColor: 'rgba(250, 240, 221, 0.92)',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: {
    color: '#8A623B',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  metaValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  boardCard: {
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    marginBottom: 12,
    minHeight: 320,
    shadowColor: '#6E4727',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  contentRow: {
    gap: 12,
  },
  contentRowWide: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
  },
  boardCardWide: {
    flex: 1.1,
    marginBottom: 0,
    minHeight: 520,
  },
  boardAccentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  boardAccent: {
    width: 28,
    height: 6,
    borderRadius: 999,
  },
  bottomStack: {
    gap: 12,
  },
  mobileHintWrap: {
    gap: 12,
  },
  sidePanelWide: {
    flex: 0.72,
    minWidth: 360,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 12, 7, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '86%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 243, 220, 0.55)',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    color: '#FFF3DC',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  modalCloseBtn: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  modalCloseText: {
    color: '#FFF8EB',
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  modalSpacer: {
    height: 10,
  },
});
