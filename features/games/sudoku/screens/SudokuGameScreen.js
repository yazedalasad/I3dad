import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../shared';
import GameHeader from '../components/GameHeader';
import SudokuBoard from '../components/SudokuBoard';
import NumberPad from '../components/NumberPad';
import { useSudokuGame } from '../hooks/useSudokuGame';
import { getSudokuLevelLabel, getSudokuLocale, getSudokuMistakeRuleLabel, getSudokuSkillLabel, getSudokuText } from '../utils/sudokuCopy';
import { normalizeSudokuLevel } from '../utils/sudokuLevels';
import { getBoardMetrics, SUDOKU_COLORS, SUDOKU_LAYOUT } from '../utils/sudokuTheme';

export default function SudokuGameScreen({ navigation, route, studentId: propStudentId = null }) {
  const { i18n } = useTranslation();
  const locale = getSudokuLocale(i18n.language);
  const isRTL = locale === 'ar' || locale === 'he';
  const level = normalizeSudokuLevel(route?.params?.level ?? 1);
  const studentId = route?.params?.studentId || propStudentId;
  const startedRef = useRef(false);

  const { width: screenWidth } = useWindowDimensions();
  const boardMetrics = useMemo(() => getBoardMetrics(screenWidth), [screenWidth]);
  const game = useSudokuGame({ level, studentId });
  const [wrongCell, setWrongCell] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  useEffect(() => {
    startedRef.current = false;
  }, [level]);

  useEffect(() => {
    if (!studentId || startedRef.current) return;
    startedRef.current = true;
    game.startGame().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, level]);

  const levelSubtitle = useMemo(() => {
    const parts = [getSudokuLevelLabel(i18n.language, level)];
    parts.push(getSudokuMistakeRuleLabel(i18n.language, game.hasMistakeLimit));
    return parts.join(' • ');
  }, [i18n.language, level, game.hasMistakeLimit]);

  const headerLabels = {
    time: getSudokuText(i18n.language, 'time'),
    mistakes: getSudokuText(i18n.language, 'mistakes'),
    hints: getSudokuText(i18n.language, 'hints'),
    pause: game.gameStatus === 'paused' ? getSudokuText(i18n.language, 'resume') : getSudokuText(i18n.language, 'pause'),
    reset: getSudokuText(i18n.language, 'reset'),
    hint: getSudokuText(i18n.language, 'hint'),
    exit: getSudokuText(i18n.language, 'exit'),
  };

  const padLabels = useMemo(
    () => ({
      remaining: getSudokuText(i18n.language, 'numberRemaining'),
      done: getSudokuText(i18n.language, 'numberDone'),
    }),
    [i18n.language]
  );

  const selectedPadNumber = useMemo(() => {
    if (!game.selectedCell) return null;
    const { row, col } = game.selectedCell;
    const value = Number(game.userGrid?.[row]?.[col]);
    return value > 0 ? value : null;
  }, [game.selectedCell, game.userGrid]);

  async function handleNumberPress(number) {
    if (game.gameStatus !== 'playing' || !game.selectedCell) return;

    const remaining = 9 - (Number(game.numberUsage?.[number]) || 0);
    if (remaining <= 0) return;

    const result = await game.applyNumber(number);

    if (result?.reason === 'duplicate') {
      setDuplicateWarning(getSudokuText(i18n.language, 'duplicateBlocked'));
      setTimeout(() => setDuplicateWarning(null), 2800);
      return;
    }

    setDuplicateWarning(null);

    if (result?.reason === 'wrong') {
      const { row, col } = game.selectedCell;
      setWrongCell({ row, col });
      setTimeout(() => setWrongCell(null), 450);
    }
  }

  const showResult = Boolean(game.gameResult) && (game.gameStatus === 'won' || game.gameStatus === 'lost');
  const resultMetadata = game.gameResult?.metadata || {};
  const skillHighlights =
    game.gameResult?.skillHighlights ||
    Object.entries(resultMetadata.skill_signals || {})
      .map(([key, value]) => ({ key, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <View style={styles.inner}>
          <GameHeader
            title={getSudokuText(i18n.language, 'title')}
            subtitle={levelSubtitle}
            seconds={game.elapsedSeconds}
            mistakes={game.mistakes}
            maxMistakes={game.maxMistakes}
            hasMistakeLimit={game.hasMistakeLimit}
            hintsLeft={game.hintsLeft}
            maxHints={game.maxHints}
            onPause={game.togglePause}
            onReset={game.resetGame}
            onHint={() => game.useHint()}
            onExit={() => navigation?.navigate?.('SudokuHome', { studentId })}
            labels={headerLabels}
            isRTL={isRTL}
            isPaused={game.gameStatus === 'paused'}
          />

          {game.gameStatus === 'paused' ? (
            <View style={styles.pausedBanner}>
              <Text style={[styles.pausedText, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'paused')}
              </Text>
            </View>
          ) : null}

          {game.gameStatus === 'error' ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'noValidPuzzle')}
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.instruction,
                  duplicateWarning && styles.warningText,
                  isRTL && styles.rtlText,
                ]}
              >
                {duplicateWarning || getSudokuText(i18n.language, 'pickCell')}
              </Text>

              <View style={[styles.playArea, { width: boardMetrics.boardSize }]}>
                <SudokuBoard
                  puzzleGrid={game.puzzleGrid}
                  userGrid={game.userGrid}
                  solutionGrid={game.solutionGrid}
                  selectedCell={game.selectedCell}
                  onSelectCell={game.selectCell}
                  wrongCell={wrongCell}
                  highlightConflicts={game.highlightConflicts}
                  selectedConflictCell={game.selectedConflictCell}
                  boardConflicts={game.boardConflicts}
                />

                <NumberPad
                  onNumberPress={handleNumberPress}
                  inputDisabled={game.gameStatus !== 'playing' || !game.selectedCell}
                  isRTL={isRTL}
                  numberUsage={game.numberUsage}
                  selectedNumber={selectedPadNumber}
                  labels={padLabels}
                  boardWidth={boardMetrics.boardSize}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isRTL && styles.rtlAlign]}>
            <Text style={[styles.modalTitle, isRTL && styles.rtlText]}>
              {getSudokuText(i18n.language, game.gameStatus === 'won' ? 'wonTitle' : 'lostTitle')}
            </Text>
            <Text style={[styles.modalBody, isRTL && styles.rtlText]}>
              {getSudokuText(i18n.language, game.gameStatus === 'won' ? 'wonBody' : 'lostBody')}
            </Text>
            <View style={styles.resultStats}>
              <Text style={[styles.resultStat, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'levelCompleted')}: {getSudokuLevelLabel(i18n.language, level)}
              </Text>
              <Text style={[styles.resultStat, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'time')}: {game.formattedTime}
              </Text>
              <Text style={[styles.resultStat, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'mistakes')}: {game.mistakes}
              </Text>
              <Text style={[styles.resultStat, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'hintsUsed')}: {resultMetadata.hints_used ?? game.maxHints - game.hintsLeft}
              </Text>
              <Text style={[styles.resultStat, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'score')}: {game.gameResult?.score ?? 0}
              </Text>
            </View>

            {game.gameStatus === 'won' && skillHighlights.length > 0 ? (
              <View style={styles.skillBlock}>
                <Text style={[styles.skillTitle, isRTL && styles.rtlText]}>
                  {getSudokuText(i18n.language, 'skillsImproved')}
                </Text>
                {skillHighlights.map((skill) => (
                  <Text key={skill.key} style={[styles.skillItem, isRTL && styles.rtlText]}>
                    {getSudokuSkillLabel(i18n.language, skill.key)} — {Math.round(skill.value)}%
                  </Text>
                ))}
              </View>
            ) : null}

            {game.gameStatus === 'won' ? (
              <Text style={[styles.recommendationNote, isRTL && styles.rtlText]}>
                {getSudokuText(i18n.language, 'recommendationImpact')}
              </Text>
            ) : null}
            <Pressable
              style={styles.modalBtn}
              onPress={() => {
                game.resetLocalState();
                game.restartWithNewPuzzle();
                startedRef.current = false;
                game.startGame().catch(() => {});
              }}
            >
              <Text style={styles.modalBtnText}>{getSudokuText(i18n.language, 'playAgain')}</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => navigation?.navigate?.('SudokuHome', { studentId })}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextSecondary]}>
                {getSudokuText(i18n.language, 'changeLevel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: SUDOKU_COLORS.pageBg,
    paddingBottom: SUDOKU_LAYOUT.playAreaBottomPadding,
  },
  page: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: SUDOKU_COLORS.pageBg,
  },
  inner: {
    width: '100%',
    maxWidth: SUDOKU_LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pausedBanner: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  pausedText: {
    color: '#854D0E',
    fontWeight: '800',
    fontSize: 14,
  },
  playArea: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
  },
  instruction: {
    color: SUDOKU_COLORS.chipLabel,
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
    minHeight: 40,
  },
  warningText: {
    color: '#B42318',
    fontWeight: '800',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  errorText: {
    color: '#B42318',
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rtlAlign: {
    alignItems: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 104, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    gap: 10,
    borderWidth: 1.5,
    borderColor: SUDOKU_COLORS.chipBorder,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: SUDOKU_COLORS.primaryDark,
  },
  modalBody: {
    fontSize: 16,
    color: SUDOKU_COLORS.chipLabel,
    lineHeight: 24,
  },
  resultStats: {
    marginTop: 4,
    gap: 4,
  },
  resultStat: {
    fontSize: 17,
    fontWeight: '800',
    color: SUDOKU_COLORS.primary,
  },
  skillBlock: {
    gap: 4,
    marginTop: 4,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: SUDOKU_COLORS.primaryDark,
  },
  skillItem: {
    fontSize: 15,
    fontWeight: '700',
    color: SUDOKU_COLORS.chipLabel,
  },
  recommendationNote: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    color: SUDOKU_COLORS.primary,
    textAlign: 'center',
  },
  modalBtn: {
    marginTop: 8,
    backgroundColor: SUDOKU_COLORS.primary,
    borderRadius: 14,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: SUDOKU_COLORS.chipBorder,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  modalBtnTextSecondary: {
    color: SUDOKU_COLORS.primary,
  },
});
