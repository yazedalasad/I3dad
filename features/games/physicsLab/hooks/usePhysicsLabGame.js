import { useState, useMemo } from 'react';
import { useGameSession, useGameTimer } from '../../shared';
import { physicsLabLevels } from '../data/levels';
import { buildDefaultParams, roundToStep, simulateLevel } from '../utils/physicsEngine';
import { getAttemptFeedback, getLevelSummary } from '../utils/feedbackEngine';
import { getLevelById, getNextLevel } from '../utils/worldHelpers';

export function usePhysicsLabGame({ levelId = 'physics_lab_level_1' } = {}) {
  const sessionApi = useGameSession();
  const timerApi = useGameTimer(false);

  const level = useMemo(() => getLevelById(physicsLabLevels, levelId) || physicsLabLevels[0], [levelId]);
  const [params, setParams] = useState(buildDefaultParams(level));
  const [attempts, setAttempts] = useState([]);
  const [lastAttempt, setLastAttempt] = useState(null);

  function updateParam(control, direction) {
    const current = Number(params[control.key]) || 0;
    const delta = direction === 'increase' ? control.step : -control.step;
    const nextValue = roundToStep(current + delta, control.step, control.min, control.max);
    setParams((prev) => ({ ...prev, [control.key]: Number(nextValue.toFixed(2)) }));
  }

  async function startLevel(studentId = 'demo-student-id') {
    if (!sessionApi.session?.id) {
      await sessionApi.startSession({
        studentId,
        gameId: 'physics_lab',
        levelId: level.id,
        language: 'en',
        currentSceneId: level.id,
      });
    }
    timerApi.restart();
    return true;
  }

  async function runAttempt() {
    const attempt = simulateLevel(level, params);
    const feedback = getAttemptFeedback(level, attempt);
    const attemptRecord = {
      ...attempt,
      feedback,
      params: { ...params },
      elapsedMs: timerApi.elapsedMs,
      createdAt: new Date().toISOString(),
    };

    setAttempts((prev) => [...prev, attemptRecord]);
    setLastAttempt(attemptRecord);

    await sessionApi.logAction({
      sceneId: level.id,
      choiceId: `run_${attempts.length + 1}`,
      actionType: 'answer',
      timeToChooseMs: timerApi.elapsedMs,
      isOptimal: attempt.success,
      subjectWeights: level.subjectWeights,
      isAnswer: true,
      isCorrect: attempt.success,
    });

    timerApi.restart();
    return attemptRecord;
  }

  async function finishLevel() {
    const attemptsCount = attempts.length;
    const successful = attempts.some((item) => item.success) || lastAttempt?.success;

    const result = await sessionApi.completeSession({
      currentSceneId: level.id,
      totalTimeMs: timerApi.elapsedMs,
      trustScore: successful ? 76 : 45,
    });

    return {
      ...result,
      summary: getLevelSummary(level, attemptsCount),
      nextLevel: getNextLevel(physicsLabLevels, level.id),
    };
  }

  return {
    ...sessionApi,
    ...timerApi,
    level,
    params,
    attempts,
    lastAttempt,
    updateParam,
    startLevel,
    runAttempt,
    finishLevel,
  };
}
