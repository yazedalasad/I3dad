import { useMemo, useState } from 'react';
import { useGameSession, useGameTimer } from '../../shared';
import { arabicPoetPuzzleLevels } from '../data/levels';
import { answersMatch } from '../utils/normalizeArabic';
import { getCompletionPercent } from '../utils/puzzleHelpers';

export function useArabicPoetPuzzle({ levelId = 'arabic_poet_puzzle_level_1' } = {}) {
  const sessionApi = useGameSession();
  const timerApi = useGameTimer(false);

  const level = useMemo(
    () => arabicPoetPuzzleLevels.find((item) => item.id === levelId) || arabicPoetPuzzleLevels[0],
    [levelId]
  );

  const [selectedWordId, setSelectedWordId] = useState(null);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [solvedMap, setSolvedMap] = useState({});
  const [feedback, setFeedback] = useState(null);

  const selectedWord = useMemo(
    () => (level.words || []).find((word) => word.id === selectedWordId) || null,
    [level, selectedWordId]
  );

  const progress = useMemo(
    () => getCompletionPercent(level.words || [], solvedMap),
    [level, solvedMap]
  );

  async function startLevel(studentId = 'demo-student-id') {
    if (!sessionApi.session?.id) {
      await sessionApi.startSession({
        studentId,
        gameId: 'arabic_poet_puzzle',
        levelId: level.id,
        language: 'ar',
        currentSceneId: level.id,
      });
    }

    timerApi.restart();
    return true;
  }

  function selectWord(wordId) {
    setSelectedWordId(wordId);
    setDraftAnswer('');
    setFeedback(null);
  }

  async function submitAnswer() {
    if (!selectedWord) return null;

    const correct = answersMatch(draftAnswer, selectedWord.answer);

    await sessionApi.logAction({
      sceneId: level.id,
      choiceId: selectedWord.id,
      actionType: 'answer',
      timeToChooseMs: timerApi.elapsedMs,
      isOptimal: correct,
      subjectWeights: level.subjectWeights,
      isAnswer: true,
      isCorrect: correct,
    });

    if (correct) {
      const nextSolved = {
        ...solvedMap,
        [selectedWord.id]: true,
      };

      setSolvedMap(nextSolved);
      setFeedback({
        tone: 'success',
        title: 'إجابة صحيحة',
        body: `أحسنت. الكلمة هي: ${selectedWord.answer}`,
      });
      setDraftAnswer('');

      const allSolved = (level.words || []).every((word) => nextSolved[word.id]);

      if (allSolved) {
        const result = await sessionApi.completeSession({
          currentSceneId: level.id,
          totalTimeMs: timerApi.elapsedMs,
          trustScore: 80,
        });

        return {
          completed: true,
          result,
        };
      }

      return {
        completed: false,
        correct: true,
      };
    }

    setFeedback({
      tone: 'warning',
      title: 'ليست هذه الكلمة',
      body: 'حاول مرة أخرى أو اختر موضعًا آخر لتقرأ تلميحه.',
    });

    return {
      completed: false,
      correct: false,
    };
  }

  return {
    ...sessionApi,
    ...timerApi,
    level,
    selectedWord,
    selectedWordId,
    selectWord,
    draftAnswer,
    setDraftAnswer,
    solvedMap,
    feedback,
    progress,
    startLevel,
    submitAnswer,
  };
}
