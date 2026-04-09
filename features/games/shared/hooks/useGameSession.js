import { useCallback, useMemo, useState } from 'react';
import { createGameSession, updateGameSession } from '../services/gameSessionService';
import { createGameActionLog } from '../services/gameActionLogService';
import {
  createEmptyScores,
  applySubjectWeights,
  normalizeScores,
  getInterestSignal,
  getTopSubjects,
} from '../utils/gameScoring';
import { buildSessionAnalytics, estimateEngagementScore } from '../utils/gameAnalytics';

export function useGameSession() {
  const [session, setSession] = useState(null);
  const [scores, setScores] = useState(createEmptyScores());
  const [actions, setActions] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetLocalState = useCallback(() => {
    setSession(null);
    setScores(createEmptyScores());
    setActions([]);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setError(null);
  }, []);

  const startSession = useCallback(async ({
    studentId,
    gameId,
    levelId,
    language,
    currentSceneId,
  }) => {
    try {
      setLoading(true);
      setError(null);

      const created = await createGameSession({
        studentId,
        gameId,
        levelId,
        language,
        currentSceneId,
      });

      setSession(created);
      setScores(createEmptyScores());
      setActions([]);
      setCorrectAnswers(0);
      setTotalAnswers(0);

      return created;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logAction = useCallback(async ({
    sceneId,
    choiceId,
    actionType = 'choice',
    timeToChooseMs,
    isOptimal = false,
    subjectWeights = {},
    isAnswer = false,
    isCorrect = false,
  }) => {
    if (!session?.id) {
      throw new Error('No active session');
    }

    const updatedScores = applySubjectWeights(scores, subjectWeights);
    setScores(updatedScores);

    const actionRecord = {
      sessionId: session.id,
      sceneId,
      choiceId,
      actionType,
      timeToChooseMs,
      isOptimal,
    };

    await createGameActionLog(actionRecord);
    setActions((prev) => [...prev, actionRecord]);

    if (isAnswer) {
      setTotalAnswers((prev) => prev + 1);
      if (isCorrect) {
        setCorrectAnswers((prev) => prev + 1);
      }
    }

    return updatedScores;
  }, [scores, session?.id]);

  const completeSession = useCallback(async ({
    currentSceneId,
    totalTimeMs = 0,
    trustScore = 0,
    hebrewScore = undefined,
    medicalReasoningScore = undefined,
  } = {}) => {
    if (!session?.id) {
      throw new Error('No active session');
    }

    const averageDecisionTimeMs =
      actions.length > 0
        ? Math.round(
            actions
              .map((item) => item.timeToChooseMs)
              .filter((item) => typeof item === 'number')
              .reduce((sum, value, _, arr) => sum + value / arr.length, 0)
          )
        : 0;

    const completionRate = 1;
    const engagementScore = estimateEngagementScore({
      actionsCount: actions.length,
      completionRate,
      averageDecisionTimeMs,
    });

    const analytics = buildSessionAnalytics({
      rawScores: scores,
      totalAnswers,
      correctAnswers,
      totalTimeMs,
    });

    const updated = await updateGameSession(session.id, {
      status: 'completed',
      currentSceneId,
      endedAt: new Date().toISOString(),
      interestSignal: analytics.interestSignal,
      engagementScore,
      trustScore,
      hebrewScore,
      medicalReasoningScore,
    });

    setSession(updated);

    return {
      session: updated,
      scores: analytics.normalizedScores,
      topSubjects: analytics.topSubjects,
      analytics: {
        ...analytics,
        engagementScore,
      },
    };
  }, [actions, correctAnswers, scores, session?.id, totalAnswers]);

  const abandonSession = useCallback(async ({ currentSceneId } = {}) => {
    if (!session?.id) {
      throw new Error('No active session');
    }

    const updated = await updateGameSession(session.id, {
      status: 'abandoned',
      currentSceneId,
      endedAt: new Date().toISOString(),
    });

    setSession(updated);
    return updated;
  }, [session?.id]);

  const analytics = useMemo(() => {
    const normalized = normalizeScores(scores);
    return {
      normalizedScores: normalized,
      topSubjects: getTopSubjects(normalized, 3),
      interestSignal: getInterestSignal(normalized),
      totalAnswers,
      correctAnswers,
    };
  }, [scores, totalAnswers, correctAnswers]);

  return {
    session,
    scores,
    actions,
    loading,
    error,
    analytics,
    startSession,
    logAction,
    completeSession,
    abandonSession,
    resetLocalState,
  };
}
