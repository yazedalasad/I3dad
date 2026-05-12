import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSession, useGameTimer } from '../../shared';
import { arabicPoetPuzzleLevels } from '../data/levels';
import { answersMatch, answersMatchReversed } from '../utils/normalizeArabic';
import {
  buildBoardMap,
  getCellsForWord,
  getCompletionPercent,
  getWordById,
  isHorizontalWord,
  normalizePuzzleWord,
} from '../utils/puzzleHelpers';

const MAX_ATTEMPTS_PER_WORD = 3;
function getDirectionGuidance(word) {
  if (!word) return '';

  return isHorizontalWord(word)
    ? '\u0645\u0646 \u0627\u0644\u064a\u0645\u064a\u0646 \u0625\u0644\u0649 \u0627\u0644\u064a\u0633\u0627\u0631'
    : '\u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649 \u0625\u0644\u0649 \u0627\u0644\u0623\u0633\u0641\u0644';
}

function composeDraftAnswer(word, slots = []) {
  const joined = slots.join('');
  if (!joined) return '';

  return joined;
}

function getTraversalIndexes(word, length = 0) {
  return Array.from({ length }, (_, index) => index);
}

function getFirstEditableIndex(word, locked = [], slots = []) {
  const traversalIndexes = getTraversalIndexes(word, slots.length);
  const nextIndex = traversalIndexes.find((index) => !locked[index] && !slots[index]);

  if (typeof nextIndex === 'number') {
    return nextIndex;
  }

  return traversalIndexes.find((index) => !locked[index]) ?? 0;
}

function getNextEditableIndex(word, startIndex, locked = [], slots = []) {
  const traversalIndexes = getTraversalIndexes(word, slots.length);
  const startTraversalIndex = Math.max(0, traversalIndexes.indexOf(startIndex));

  for (let index = startTraversalIndex; index < traversalIndexes.length; index += 1) {
    const slotIndex = traversalIndexes[index];
    if (!locked[slotIndex] && !slots[slotIndex]) return slotIndex;
  }

  for (let index = 0; index < startTraversalIndex; index += 1) {
    const slotIndex = traversalIndexes[index];
    if (!locked[slotIndex] && !slots[slotIndex]) return slotIndex;
  }

  return traversalIndexes[startTraversalIndex] ?? 0;
}

function getPreviousFilledIndex(word, startIndex, locked = [], slots = []) {
  const traversalIndexes = getTraversalIndexes(word, slots.length);
  const startTraversalIndex = traversalIndexes.indexOf(startIndex);

  for (let index = startTraversalIndex; index >= 0; index -= 1) {
    const slotIndex = traversalIndexes[index];
    if (!locked[slotIndex] && slots[slotIndex]) return slotIndex;
  }

  for (let index = traversalIndexes.length - 1; index > startTraversalIndex; index -= 1) {
    const slotIndex = traversalIndexes[index];
    if (!locked[slotIndex] && slots[slotIndex]) return slotIndex;
  }

  return -1;
}

export function useArabicPoetPuzzle({ levelId = 'arabic_poet_puzzle_level_1' } = {}) {
  const sessionApi = useGameSession();
  const timerApi = useGameTimer(false);
  const hasStartedLevelRef = useRef(false);

  const rawLevel = useMemo(
    () => arabicPoetPuzzleLevels.find((item) => item.id === levelId) || arabicPoetPuzzleLevels[0],
    [levelId]
  );

  const level = useMemo(
    () => ({
      ...rawLevel,
      words: (rawLevel.words || []).map((word) => normalizePuzzleWord(word)),
    }),
    [rawLevel]
  );

  useEffect(() => {
    hasStartedLevelRef.current = false;
  }, [level.id]);

  const [selectedWordId, setSelectedWordId] = useState(null);
  const [draftSlots, setDraftSlots] = useState([]);
  const [lockedSlots, setLockedSlots] = useState([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [solvedMap, setSolvedMap] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [wordAttemptsMap, setWordAttemptsMap] = useState({});
  const [submissionEffect, setSubmissionEffect] = useState({ tick: 0, tone: null });

  const boardMap = useMemo(() => buildBoardMap(level.words || []), [level.words]);

  const selectedWord = useMemo(
    () => (level.words || []).find((word) => word.id === selectedWordId) || null,
    [level, selectedWordId]
  );

  const progress = useMemo(
    () => getCompletionPercent(level.words || [], solvedMap),
    [level, solvedMap]
  );

  const draftAnswer = useMemo(() => composeDraftAnswer(selectedWord, draftSlots), [draftSlots, selectedWord]);
  const selectedWordSolved = !!(selectedWord && solvedMap[selectedWord.id]);
  const selectedWordAttempts = selectedWord ? wordAttemptsMap[selectedWord.id] || 0 : 0;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS_PER_WORD - selectedWordAttempts);

  const draftMatchesSelectedWord = useMemo(() => {
    if (!selectedWord) return false;
    if (draftSlots.length !== selectedWord.length) return false;
    if (draftSlots.some((letter) => !letter)) return false;
    return answersMatch(draftAnswer, selectedWord.answer);
  }, [draftAnswer, draftSlots, selectedWord]);

  const isDraftComplete = useMemo(() => {
    if (!selectedWord) return false;
    if (draftSlots.length !== selectedWord.length) return false;
    return draftSlots.every((letter) => !!letter);
  }, [draftSlots, selectedWord]);

  async function logAnswerSafely(payload) {
    try {
      await sessionApi.logAction(payload);
      return true;
    } catch (error) {
      console.warn('Arabic puzzle logAction failed:', error);
      return false;
    }
  }

  async function completeSessionSafely(payload) {
    try {
      return await sessionApi.completeSession(payload);
    } catch (error) {
      console.warn('Arabic puzzle completeSession failed:', error);
      return {
        session: sessionApi.session || null,
        scores: sessionApi.analytics?.normalizedScores || {},
        topSubjects: sessionApi.analytics?.topSubjects || [],
        analytics: {
          ...(sessionApi.analytics || {}),
          engagementScore: 0,
        },
      };
    }
  }

  function buildDraftState(word) {
    if (!word) {
      return { slots: [], locked: [], nextIndex: 0 };
    }

    if (solvedMap[word.id]) {
      return {
        slots: Array.from(word.answer || ''),
        locked: Array.from({ length: word.length }, () => true),
        nextIndex: 0,
      };
    }

    const cells = getCellsForWord(word);
    const slots = Array.from({ length: word.length }, () => '');
    const locked = Array.from({ length: word.length }, () => false);

    cells.forEach((cell) => {
      const boardCell = boardMap[`${cell.row}-${cell.col}`];
      const intersectingSolvedWord = boardCell?.words.find(
        (entry) => entry.wordId !== word.id && solvedMap[entry.wordId]
      );

      if (!intersectingSolvedWord) return;

      const solvedWord = getWordById(level.words || [], intersectingSolvedWord.wordId);
      const solvedLetter = Array.from(solvedWord?.answer || '')[intersectingSolvedWord.index] || '';

      if (solvedLetter) {
        slots[cell.index] = solvedLetter;
        locked[cell.index] = true;
      }
    });

    const nextIndex = getFirstEditableIndex(word, locked, slots);

    return {
      slots,
      locked,
      nextIndex,
    };
  }

  const startLevel = useCallback(async (studentId = 'demo-student-id') => {
    if (!hasStartedLevelRef.current) {
      hasStartedLevelRef.current = true;
      timerApi.restart();
      setWrongAttempts(0);
      setWordAttemptsMap({});
    }

    if (!sessionApi.session?.id) {
      try {
        await sessionApi.startSession({
          studentId,
          gameId: level.gameId || 'arabic_poet_puzzle',
          levelId: level.id,
          language: 'ar',
          currentSceneId: level.id,
        });
      } catch (error) {
        console.warn('Arabic puzzle startSession failed:', error);
      }
    }

    return true;
  }, [level.id, sessionApi.session?.id, sessionApi.startSession, timerApi.restart]);

  function selectWord(wordId) {
    const word = (level.words || []).find((item) => item.id === wordId) || null;
    const nextDraft = buildDraftState(word);
    setSelectedWordId(wordId);
    setDraftSlots(nextDraft.slots);
    setLockedSlots(nextDraft.locked);
    setActiveSlotIndex(nextDraft.nextIndex);
    setFeedback(null);
  }

  function clearSelectedWord() {
    setSelectedWordId(null);
    setDraftSlots([]);
    setLockedSlots([]);
    setActiveSlotIndex(0);
  }

  function selectDraftSlot(index) {
    if (lockedSlots[index]) return;
    setActiveSlotIndex(index);
  }

  function appendLetter(letter) {
    if (!selectedWord) return;

    setDraftSlots((prev) => {
      const next = [...prev];
      const targetIndex = getNextEditableIndex(selectedWord, activeSlotIndex, lockedSlots, next);

      if (lockedSlots[targetIndex] || next[targetIndex]) return prev;

      next[targetIndex] = letter;
      setActiveSlotIndex(getNextEditableIndex(selectedWord, targetIndex, lockedSlots, next));
      return next;
    });
  }

  function removeLastLetter() {
    setDraftSlots((prev) => {
      const next = [...prev];

      if (!next.length) return prev;

      const targetIndex = getPreviousFilledIndex(selectedWord, activeSlotIndex, lockedSlots, next);

      if (targetIndex >= 0 && !lockedSlots[targetIndex]) {
        next[targetIndex] = '';
        setActiveSlotIndex(targetIndex);
      }

      return next;
    });
  }

  function clearDraftAnswer() {
    const nextDraft = buildDraftState(selectedWord);
    setDraftSlots(nextDraft.slots);
    setLockedSlots(nextDraft.locked);
    setActiveSlotIndex(nextDraft.nextIndex);
  }

  function shuffleDraftLetters() {
    if (!selectedWord) return;

    setDraftSlots((prev) => {
      const editableIndexes = prev
        .map((_, index) => index)
        .filter((index) => !lockedSlots[index]);

      if (editableIndexes.length <= 1) return prev;

      const editableLetters = editableIndexes
        .map((index) => prev[index])
        .filter(Boolean);

      if (editableLetters.length <= 1) return prev;

      const shuffled = [...editableLetters];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }

      const next = [...prev];
      let letterPointer = 0;
      editableIndexes.forEach((index) => {
        next[index] = shuffled[letterPointer] || '';
        if (shuffled[letterPointer]) {
          letterPointer += 1;
        }
      });
      return next;
    });
  }

  async function submitAnswer() {
    if (!selectedWord) {
      setFeedback({
        tone: 'info',
        title: '\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0623\u0648\u0644\u0627',
        body:
          '\u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0645\u0646 \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0623\u0648\u0644\u0627 \u062d\u062a\u0649 \u0646\u0639\u0631\u0641 \u0639\u062f\u062f \u0627\u0644\u062d\u0631\u0648\u0641 \u0648\u0627\u062a\u062c\u0627\u0647\u0647\u0627 \u0642\u0628\u0644 \u0627\u0644\u062a\u062b\u0628\u064a\u062a.',
      });
      return { completed: false, correct: false, reason: 'no_word' };
    }

    if (selectedWordSolved) {
      setFeedback({
        tone: 'info',
        title: '\u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629 \u0645\u062b\u0628\u062a\u0629',
        body: `\u062a\u0645 \u062d\u0644 \u0643\u0644\u0645\u0629 ${selectedWord.answer} \u0645\u0633\u0628\u0642\u0627. \u0627\u062e\u062a\u0631 \u0643\u0644\u0645\u0629 \u0623\u062e\u0631\u0649 \u0645\u0646 \u0627\u0644\u062e\u0631\u064a\u0637\u0629.`,
      });
      return { completed: false, correct: false, reason: 'already_solved' };
    }

    if (!isDraftComplete) {
      setFeedback({
        tone: 'info',
        title: '\u0623\u0643\u0645\u0644 \u0627\u0644\u062d\u0631\u0648\u0641 \u0623\u0648\u0644\u0627',
        body: `\u0623\u0643\u0645\u0644 \u062c\u0645\u064a\u0639 \u0627\u0644\u062e\u0627\u0646\u0627\u062a \u0642\u0628\u0644 \u0627\u0644\u062a\u062b\u0628\u064a\u062a. \u0627\u062a\u062c\u0627\u0647 \u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629: ${getDirectionGuidance(selectedWord)}.`,
      });
      return { completed: false, correct: false, reason: 'incomplete' };
    }

    const correct = answersMatch(draftAnswer, selectedWord.answer);
    const reversed = !correct && answersMatchReversed(draftAnswer, selectedWord.answer);
    const acceptedAnswer = correct || reversed;

    await logAnswerSafely({
      sceneId: level.id,
      choiceId: selectedWord.id,
      actionType: 'answer',
      timeToChooseMs: timerApi.elapsedMs,
      isOptimal: acceptedAnswer,
      subjectWeights: level.subjectWeights,
      isAnswer: true,
      isCorrect: acceptedAnswer,
    });

    if (acceptedAnswer) {
      const nextSolved = {
        ...solvedMap,
        [selectedWord.id]: true,
      };
      const solvedWord = selectedWord;

      setSolvedMap(nextSolved);
      setFeedback({
        tone: 'success',
        title: '\u0625\u062c\u0627\u0628\u0629 \u0635\u062d\u064a\u062d\u0629',
        body: reversed
          ? `\u062a\u0645 \u062a\u062b\u0628\u064a\u062a \u0643\u0644\u0645\u0629 ${selectedWord.answer}. \u0642\u0628\u0644\u0646\u0627 \u0627\u0644\u0623\u062d\u0631\u0641 \u0628\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0645\u0639\u0627\u0643\u0633 \u0648\u0635\u062d\u062d\u0646\u0627 \u062a\u0631\u062a\u064a\u0628\u0647\u0627 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627.`
          : `\u0623\u062d\u0633\u0646\u062a. \u062a\u0645 \u062a\u062b\u0628\u064a\u062a \u0643\u0644\u0645\u0629 ${selectedWord.answer} \u0641\u064a \u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0628\u0627\u062a\u062c\u0627\u0647\u0647\u0627 \u0627\u0644\u0635\u062d\u064a\u062d.`,
      });
      setSubmissionEffect((prev) => ({ tick: prev.tick + 1, tone: 'success' }));

      const allSolved = (level.words || []).every((word) => nextSolved[word.id]);

      if (allSolved) {
        const result = await completeSessionSafely({
          currentSceneId: level.id,
          totalTimeMs: timerApi.elapsedMs,
          trustScore: 80,
        });

        return {
          completed: true,
          result,
          stats: {
            solvedWords: Object.keys(nextSolved).length,
            totalWords: level.words.length,
            wrongAttempts,
            elapsedMs: timerApi.elapsedMs,
          },
        };
      }

      const nextWord =
        (level.words || []).find((word) => !nextSolved[word.id] && word.id !== solvedWord.id) || null;

      if (nextWord) {
        const nextDraft = buildDraftState(nextWord);
        setSelectedWordId(nextWord.id);
        setDraftSlots(nextDraft.slots);
        setLockedSlots(nextDraft.locked);
        setActiveSlotIndex(nextDraft.nextIndex);
      } else {
        setSelectedWordId(null);
        setDraftSlots([]);
        setLockedSlots([]);
        setActiveSlotIndex(0);
      }

      return {
        completed: false,
        correct: true,
        nextWordId: nextWord?.id || null,
      };
    }

    const nextAttemptsForWord = selectedWordAttempts + 1;

    setWrongAttempts((prev) => prev + 1);
    setWordAttemptsMap((prev) => ({
      ...prev,
      [selectedWord.id]: nextAttemptsForWord,
    }));
    setSubmissionEffect((prev) => ({ tick: prev.tick + 1, tone: 'error' }));
    setFeedback({
      tone: reversed ? 'info' : 'warning',
      title: reversed
        ? '\u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d'
        : '\u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629',
      body: reversed
        ? `\u0627\u0644\u062d\u0631\u0648\u0641 \u0635\u062d\u064a\u062d\u0629\u060c \u0644\u0643\u0646 \u062a\u0631\u062a\u064a\u0628\u0647\u0627 \u0645\u0639\u0643\u0648\u0633. \u0627\u0643\u062a\u0628 \u0627\u0644\u0643\u0644\u0645\u0629 ${getDirectionGuidance(selectedWord)}.`
        : nextAttemptsForWord >= 2
        ? `\u0627\u0644\u0643\u0644\u0645\u0629 \u0644\u0645 \u062a\u062b\u0628\u062a \u0644\u0623\u0646\u0647\u0627 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629. \u062a\u0644\u0645\u064a\u062d \u0625\u0636\u0627\u0641\u064a: \u062a\u0628\u062f\u0623 \u0628\u062d\u0631\u0641 ${Array.from(selectedWord.answer)[0]}.`
        : `\u0627\u0644\u0643\u0644\u0645\u0629 \u0644\u0645 \u062a\u062b\u0628\u062a. \u0631\u0627\u062c\u0639 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u062d\u0631\u0648\u0641 \u0644\u0623\u0646 \u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629 \u062a\u0643\u062a\u0628 ${getDirectionGuidance(selectedWord)}.`,
    });

    return {
      completed: false,
      correct: false,
      reason: reversed ? 'reversed_order' : 'incorrect',
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS_PER_WORD - nextAttemptsForWord),
    };
  }

  return {
    ...sessionApi,
    ...timerApi,
    level,
    selectedWord,
    selectedWordId,
    selectWord,
    clearSelectedWord,
    draftAnswer,
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
    selectedWordSolved,
    selectedWordAttempts,
    remainingAttempts,
    startLevel,
    submitAnswer,
  };
}
