import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSession } from '../../shared/hooks/useGameSession';
import { sudokuPuzzles, SUDOKU_SUBJECT_WEIGHTS } from '../data/sudokuPuzzles';
import { buildSudokuSessionMetadata, calculateSudokuScore, getTopSudokuSkillSignals } from '../service';
import { getSudokuUnlockedLevel, unlockSudokuLevelAfterCompletion } from '../services/levelProgressService';
import { getLevelForDifficulty, getSudokuLevelConfig, normalizeSudokuLevel } from '../utils/sudokuLevels';
import {
  cloneGrid,
  createEmptyGrid,
  findSudokuConflicts,
  formatTime,
  getBoardConflicts,
  getNumberUsage,
  isBoardComplete,
  isFixedCell,
  isGridShapeValid,
  logSudokuGridDebug,
  stringToGrid,
  validatePuzzleRecord,
} from '../utils/sudokuUtils';

const EMPTY_GRID = createEmptyGrid();

function shouldFailFromMistakes(mistakes, mistakeLimit) {
  return mistakeLimit != null && mistakes >= mistakeLimit;
}

function registerMistake({
  statsRef,
  mistakes,
  setMistakes,
  sessionApi,
  puzzleId,
  elapsedMs,
  row,
  col,
  number,
  tag,
}) {
  statsRef.current.wrongMoves += 1;
  const nextMistakes = mistakes + 1;
  setMistakes(nextMistakes);

  if (sessionApi.session?.id) {
    sessionApi.logAction({
      sceneId: puzzleId,
      choiceId: `${tag}_${row}_${col}_${number}`,
      actionType: 'answer',
      timeToChooseMs: elapsedMs,
      isOptimal: false,
      subjectWeights: SUDOKU_SUBJECT_WEIGHTS,
      isAnswer: true,
      isCorrect: false,
    }).catch(() => {});
  }

  return nextMistakes;
}

export function useSudokuGame({ difficulty = 'easy', level = null, studentId = null } = {}) {
  const activeLevel = normalizeSudokuLevel(level ?? getLevelForDifficulty(difficulty));
  const levelConfig = useMemo(() => getSudokuLevelConfig(activeLevel), [activeLevel]);
  const puzzleDifficulty = levelConfig.puzzleDifficulty;
  const maxHints = levelConfig.hints;
  const mistakeLimit = levelConfig.mistakeLimit;
  const sessionApi = useGameSession();
  const statsRef = useRef({
    correctMoves: 0,
    wrongMoves: 0,
    hintsUsed: 0,
    restarts: 0,
    duplicateAttempts: 0,
  });

  const [puzzle, setPuzzle] = useState(null);
  const [puzzleLoadError, setPuzzleLoadError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(maxHints);
  const [gameStatus, setGameStatus] = useState('playing');
  const [gameResult, setGameResult] = useState(null);
  const [userGrid, setUserGrid] = useState(EMPTY_GRID);
  const [highlightConflicts, setHighlightConflicts] = useState([]);
  const [selectedConflictCell, setSelectedConflictCell] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedMsRef = useRef(0);

  useEffect(() => {
    elapsedMsRef.current = elapsedSeconds * 1000;
  }, [elapsedSeconds]);

  const puzzleGrid = useMemo(() => stringToGrid(puzzle?.puzzle), [puzzle]);
  const solutionGrid = useMemo(() => stringToGrid(puzzle?.solution), [puzzle]);

  const boardConflicts = useMemo(() => {
    if (!isGridShapeValid(userGrid)) return [];
    return getBoardConflicts(userGrid);
  }, [userGrid]);

  const numberUsage = useMemo(() => getNumberUsage(userGrid), [userGrid]);

  useEffect(() => {
    if (gameStatus !== 'playing') return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus]);

  const loadValidPuzzle = useCallback(() => {
    const pool = sudokuPuzzles.filter((item) => item.difficulty === puzzleDifficulty);

    if (!pool.length) {
      const message = `No valid Sudoku puzzles for level ${activeLevel} (${puzzleDifficulty})`;
      console.error(`[Sudoku] ${message}`);
      setPuzzle(null);
      setPuzzleLoadError(message);
      setUserGrid(EMPTY_GRID);
      setGameStatus('error');
      return null;
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const candidate of shuffled) {
      const check = validatePuzzleRecord(candidate);
      if (check.valid) {
        setPuzzleLoadError(null);
        return candidate;
      }
      console.warn(
        `[Sudoku] Skipping invalid puzzle "${candidate.id}" (${candidate.difficulty}):`,
        check.errors.join('; ')
      );
    }

    const message = `No valid Sudoku puzzles passed validation for level ${activeLevel}`;
    console.error(`[Sudoku] ${message}`);
    setPuzzleLoadError(message);
    setGameStatus('error');
    return null;
  }, [activeLevel, puzzleDifficulty]);

  const initializeBoard = useCallback(
    (nextPuzzle) => {
      if (!nextPuzzle?.puzzle) return;

      const check = validatePuzzleRecord(nextPuzzle);
      if (!check.valid) {
        console.error(
          `[Sudoku] Refusing to start invalid puzzle "${nextPuzzle.id}" (${nextPuzzle.difficulty}):`,
          check.errors.join('; ')
        );
        return false;
      }

      const nextGrid = isGridShapeValid(check.puzzleGrid) ? cloneGrid(check.puzzleGrid) : EMPTY_GRID;
      setUserGrid(nextGrid);
      setSelectedCell(null);
      setMistakes(0);
      setHintsLeft(maxHints);
      setElapsedSeconds(0);
      setGameStatus('playing');
      setGameResult(null);
      setHighlightConflicts([]);
      setSelectedConflictCell(null);
      setPuzzleLoadError(null);
      return true;
    },
    [maxHints]
  );

  useEffect(() => {
    const nextPuzzle = loadValidPuzzle();
    if (nextPuzzle) {
      setPuzzle(nextPuzzle);
      initializeBoard(nextPuzzle);
    }
  }, [activeLevel, puzzleDifficulty, loadValidPuzzle, initializeBoard]);

  useEffect(() => {
    if (!isGridShapeValid(userGrid)) return;
    logSudokuGridDebug(userGrid, puzzleGrid);
  }, [userGrid, puzzleGrid]);

  const startGame = useCallback(async () => {
    if (!studentId || !puzzle?.id) return false;

    if (!sessionApi.session?.id) {
      await sessionApi.startSession({
        studentId,
        gameId: 'sudoku',
        levelId: `sudoku_level_${activeLevel}`,
        language: 'ar',
        currentSceneId: puzzle.id,
      });
    }

    return true;
  }, [studentId, sessionApi, puzzle?.id, puzzleDifficulty, activeLevel]);

  const finishGame = useCallback(
    async (completed, unlockedLevel = null) => {
      const score = calculateSudokuScore({
        difficulty: puzzleDifficulty,
        elapsedMs: elapsedMsRef.current,
        mistakes,
        completed,
        hintsUsed: statsRef.current.hintsUsed,
      });

      const metadata = buildSudokuSessionMetadata({
        difficulty: puzzleDifficulty,
        level: activeLevel,
        puzzleId: puzzle?.id,
        mistakes,
        hintsUsed: statsRef.current.hintsUsed,
        correctMoves: statsRef.current.correctMoves,
        wrongMoves: statsRef.current.wrongMoves,
        duplicateAttempts: statsRef.current.duplicateAttempts,
        restarts: statsRef.current.restarts,
        completed,
        score,
        elapsedMs: elapsedMsRef.current,
        unlockedLevel,
      });

      const trustScore = completed
        ? Math.max(metadata.completion_score, 40)
        : Math.max(20, Math.round(metadata.completion_score * 0.5));

      const result = sessionApi.session?.id
        ? await sessionApi.completeSession({
            currentSceneId: puzzle?.id,
            totalTimeMs: elapsedMsRef.current,
            trustScore,
            metadata,
          })
        : null;

      return {
        ...result,
        score,
        metadata,
        skillHighlights: getTopSudokuSkillSignals(metadata.skill_signals, 3),
      };
    },
    [puzzleDifficulty, activeLevel, mistakes, puzzle?.id, sessionApi]
  );

  const endWithStatus = useCallback(
    async (status) => {
      if (gameStatus === 'won' || gameStatus === 'lost') {
        return gameResult;
      }
      setGameStatus(status);
      const completed = status === 'won';
      let unlockedLevel = null;
      if (completed) {
        unlockedLevel = await unlockSudokuLevelAfterCompletion(activeLevel, studentId);
      } else {
        unlockedLevel = await getSudokuUnlockedLevel(studentId);
      }
      const payload = await finishGame(completed, unlockedLevel);
      const result = { status, ...payload };
      setGameResult(result);
      return result;
    },
    [finishGame, gameStatus, gameResult, activeLevel, studentId]
  );

  const clearConflictHighlight = useCallback(() => {
    setHighlightConflicts([]);
    setSelectedConflictCell(null);
  }, []);

  const selectCell = useCallback(
    (row, col) => {
      if (gameStatus !== 'playing') return;
      if (isFixedCell(puzzleGrid, row, col)) return;
      clearConflictHighlight();
      setSelectedCell({ row, col });
    },
    [gameStatus, puzzleGrid, clearConflictHighlight]
  );

  const applyNumber = useCallback(
    async (number) => {
      if (gameStatus !== 'playing' || !selectedCell || !puzzle) {
        return { placed: false };
      }

      const { row, col } = selectedCell;
      if (isFixedCell(puzzleGrid, row, col)) {
        return { placed: false };
      }

      if (numberUsage[number] >= 9) {
        return { placed: false, blocked: true, reason: 'completed' };
      }

      const ruleConflicts = isGridShapeValid(userGrid)
        ? findSudokuConflicts(userGrid, row, col, number)
        : [];
      if (ruleConflicts.length > 0) {
        statsRef.current.duplicateAttempts += 1;
        setHighlightConflicts(ruleConflicts);
        setSelectedConflictCell({ row, col });

        const nextMistakes = registerMistake({
          statsRef,
          mistakes,
          setMistakes,
          sessionApi,
          puzzleId: puzzle.id,
          elapsedMs: elapsedMsRef.current,
          row,
          col,
          number,
          tag: 'duplicate',
        });

        if (shouldFailFromMistakes(nextMistakes, mistakeLimit)) {
          await endWithStatus('lost');
        }

        return { placed: false, blocked: true, reason: 'duplicate', conflicts: ruleConflicts };
      }

      clearConflictHighlight();

      const expected = solutionGrid[row][col];
      const isCorrect = Number(number) === Number(expected);

      if (!isCorrect) {
        const nextMistakes = registerMistake({
          statsRef,
          mistakes,
          setMistakes,
          sessionApi,
          puzzleId: puzzle.id,
          elapsedMs: elapsedMsRef.current,
          row,
          col,
          number,
          tag: 'mistake',
        });

        if (shouldFailFromMistakes(nextMistakes, mistakeLimit)) {
          await endWithStatus('lost');
        }
        return { placed: false, blocked: true, reason: 'wrong', conflicts: [] };
      }

      statsRef.current.correctMoves += 1;

      if (sessionApi.session?.id) {
        await sessionApi.logAction({
          sceneId: puzzle.id,
          choiceId: `fill_${row}_${col}_${number}`,
          actionType: 'answer',
          timeToChooseMs: elapsedMsRef.current,
          isOptimal: true,
          subjectWeights: SUDOKU_SUBJECT_WEIGHTS,
          isAnswer: true,
          isCorrect: true,
        });
      }

      setUserGrid((prev) => {
        const next = cloneGrid(prev);
        next[row][col] = number;
        if (isBoardComplete(next, solutionGrid)) {
          queueMicrotask(() => {
            endWithStatus('won');
          });
        }
        return next;
      });

      return { placed: true };
    },
    [
      gameStatus,
      selectedCell,
      puzzle,
      puzzleGrid,
      solutionGrid,
      userGrid,
      numberUsage,
      mistakes,
      sessionApi,
      mistakeLimit,
      endWithStatus,
      clearConflictHighlight,
    ]
  );

  const useHint = useCallback(async () => {
    if (gameStatus !== 'playing' || hintsLeft <= 0 || !puzzle) return false;

    const target =
      selectedCell && !isFixedCell(puzzleGrid, selectedCell.row, selectedCell.col)
        ? selectedCell
        : findFirstEmptyCell(userGrid, puzzleGrid);

    if (!target) return false;

    const { row, col } = target;
    const value = solutionGrid[row][col];
    const ruleConflicts = isGridShapeValid(userGrid)
      ? findSudokuConflicts(userGrid, row, col, value)
      : [];

    if (ruleConflicts.length > 0) {
      console.warn(`[Sudoku] Hint blocked by conflicts at ${row},${col}`);
      return false;
    }

    setSelectedCell({ row, col });
    setHintsLeft((current) => current - 1);
    statsRef.current.hintsUsed += 1;
    clearConflictHighlight();

    if (sessionApi.session?.id) {
      await sessionApi.logAction({
        sceneId: puzzle.id,
        choiceId: `hint_${row}_${col}`,
        actionType: 'hint',
        timeToChooseMs: elapsedMsRef.current,
        subjectWeights: SUDOKU_SUBJECT_WEIGHTS,
      });
    }

    setUserGrid((prev) => {
      const next = cloneGrid(prev);
      next[row][col] = value;
      if (isBoardComplete(next, solutionGrid)) {
        queueMicrotask(() => {
          endWithStatus('won');
        });
      }
      return next;
    });

    return true;
  }, [
    gameStatus,
    hintsLeft,
    selectedCell,
    puzzleGrid,
    solutionGrid,
    userGrid,
    sessionApi,
    puzzle,
    endWithStatus,
    clearConflictHighlight,
  ]);

  const resetGame = useCallback(() => {
    if (!puzzle) return;
    statsRef.current.restarts += 1;
    initializeBoard(puzzle);
    clearConflictHighlight();
  }, [initializeBoard, puzzle, clearConflictHighlight]);

  const togglePause = useCallback(() => {
    if (gameStatus === 'playing') {
      setGameStatus('paused');
      return;
    }
    if (gameStatus === 'paused') {
      setGameStatus('playing');
    }
  }, [gameStatus]);

  const restartWithNewPuzzle = useCallback(() => {
    const nextPuzzle = loadValidPuzzle();
    if (!nextPuzzle) return;
    setPuzzle(nextPuzzle);
    initializeBoard(nextPuzzle);
    clearConflictHighlight();
  }, [loadValidPuzzle, initializeBoard, clearConflictHighlight]);

  const startTimer = useCallback(() => {
    setGameStatus('playing');
  }, []);

  const pauseTimer = useCallback(() => {
    setGameStatus('paused');
  }, []);

  const restartTimer = useCallback(() => {
    setElapsedSeconds(0);
    setGameStatus('playing');
  }, []);

  const resetTimer = useCallback(() => {
    setElapsedSeconds(0);
  }, []);

  return {
    ...sessionApi,
    puzzle,
    puzzleGrid,
    solutionGrid,
    userGrid,
    numberUsage,
    selectedCell,
    level: activeLevel,
    levelConfig,
    puzzleDifficulty,
    mistakes,
    maxMistakes: mistakeLimit,
    hasMistakeLimit: mistakeLimit != null,
    hintsLeft,
    maxHints,
    gameStatus,
    gameResult,
    puzzleLoadError,
    difficulty: puzzleDifficulty,
    elapsedSeconds,
    elapsedMs: elapsedSeconds * 1000,
    seconds: elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    isRunning: gameStatus === 'playing',
    start: startTimer,
    pause: pauseTimer,
    restart: restartTimer,
    reset: resetTimer,
    highlightConflicts,
    selectedConflictCell,
    boardConflicts,
    selectCell,
    applyNumber,
    useHint,
    resetGame,
    togglePause,
    restartWithNewPuzzle,
    startGame,
    endWithStatus,
    clearConflictHighlight,
  };
}

function findFirstEmptyCell(userGrid, puzzleGrid) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!isFixedCell(puzzleGrid, row, col) && !Number(userGrid?.[row]?.[col])) {
        return { row, col };
      }
    }
  }
  return null;
}
