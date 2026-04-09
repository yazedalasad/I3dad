import { useMemo, useState } from 'react';
import {
  useGameLanguage,
  useGameProgress,
  useGameSession,
  useGameTimer,
} from '../shared';
import { doctorSorokaLevels } from '../data/levels';
import { getInitialScene, getSceneById, getNextSceneFromChoice, isLevelCompletedByChoice } from '../utils/caseEngine';
import { computeDoctorSorokaSummary } from '../utils/diagnosticScoring';

export function useDoctorSorokaGame({ levelId = 'doctor_soroka_level_1' } = {}) {
  const languageApi = useGameLanguage('he');
  const sessionApi = useGameSession();
  const timerApi = useGameTimer(false);
  const [activeSceneId, setActiveSceneId] = useState(null);

  const level = useMemo(
    () => doctorSorokaLevels.find((item) => item.id === levelId) || doctorSorokaLevels[0],
    [levelId]
  );

  const initialScene = useMemo(() => getInitialScene(level), [level]);
  const resolvedSceneId = activeSceneId || initialScene?.id;
  const currentScene = useMemo(() => getSceneById(level, resolvedSceneId), [level, resolvedSceneId]);

  const currentIndex = useMemo(
    () => (level?.scenes || []).findIndex((scene) => scene.id === resolvedSceneId),
    [level, resolvedSceneId]
  );

  const progressApi = useGameProgress(currentIndex < 0 ? 0 : currentIndex, level?.scenes?.length || 0);

  async function startGame(studentId) {
    const created = await sessionApi.startSession({
      studentId,
      gameId: 'doctor_soroka',
      levelId: level.id,
      language: 'he',
      currentSceneId: initialScene?.id,
    });

    setActiveSceneId(initialScene?.id || null);
    timerApi.restart();
    return created;
  }

  async function choose(choice) {
    const nextScene = getNextSceneFromChoice(level, choice);

    await sessionApi.logAction({
      sceneId: currentScene?.id,
      choiceId: choice?.id,
      actionType: 'choice',
      timeToChooseMs: timerApi.elapsedMs,
      isOptimal: Boolean(choice?.isOptimal),
      subjectWeights: choice?.subjectWeights || {},
      isAnswer: currentScene?.id === 'l1_results_basic' || currentScene?.id === 'l2_results',
      isCorrect: Boolean(choice?.isOptimal),
    });

    if (isLevelCompletedByChoice(choice)) {
      const result = await sessionApi.completeSession({
        currentSceneId: currentScene?.id,
        totalTimeMs: timerApi.elapsedMs,
        trustScore: 70,
        medicalReasoningScore: 80,
      });

      timerApi.pause();

      return {
        completed: true,
        result,
      };
    }

    if (!nextScene) {
      return { completed: false, nextScene: null };
    }

    setActiveSceneId(nextScene.id);
    timerApi.restart();

    return {
      completed: false,
      nextScene,
    };
  }

  function getSummary() {
    return computeDoctorSorokaSummary({
      rawScores: sessionApi.scores,
      totalAnswers: sessionApi.analytics.totalAnswers,
      correctAnswers: sessionApi.analytics.correctAnswers,
      totalTimeMs: timerApi.elapsedMs,
    });
  }

  function resetLevel() {
    setActiveSceneId(initialScene?.id || null);
    timerApi.reset();
  }

  return {
    ...languageApi,
    ...sessionApi,
    ...timerApi,
    level,
    currentScene,
    progressApi,
    startGame,
    choose,
    getSummary,
    resetLevel,
  };
}
