import { useCallback, useMemo, useRef, useState } from 'react';
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

function isLocalSession(session) {
  return String(session?.id || '').startsWith('local-');
}

function isExpectedSessionFallback(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes('Failed to fetch') ||
    message.includes('Network request failed')
  );
}

export function useGameSession() {
  const [session, setSession] = useState(null);
  const [scores, setScores] = useState(createEmptyScores());
  const [actions, setActions] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scoresRef = useRef(createEmptyScores());
  const actionsRef = useRef([]);
  const correctAnswersRef = useRef(0);
  const totalAnswersRef = useRef(0);

  const resetLocalState = useCallback(() => {
    setSession(null);
    setScores(createEmptyScores());
    setActions([]);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setError(null);
    scoresRef.current = createEmptyScores();
    actionsRef.current = [];
    correctAnswersRef.current = 0;
    totalAnswersRef.current = 0;
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

      let created;
      try {
        created = await createGameSession({
          studentId,
          gameId,
          levelId,
          language,
          currentSceneId,
        });
      } catch (sessionError) {
        if (!isExpectedSessionFallback(sessionError)) {
          throw sessionError;
        }
        console.warn('Game session will continue locally:', sessionError?.message || sessionError);
        created = {
          id: `local-${gameId || 'game'}-${levelId || 'level'}-${Date.now()}`,
          student_id: studentId,
          game_id: gameId,
          level_id: levelId,
          language,
          current_scene_id: currentSceneId,
          status: 'in_progress',
          created_at: new Date().toISOString(),
          localOnly: true,
        };
      }

      setSession(created);
      setScores(createEmptyScores());
      setActions([]);
      setCorrectAnswers(0);
      setTotalAnswers(0);
      scoresRef.current = createEmptyScores();
      actionsRef.current = [];
      correctAnswersRef.current = 0;
      totalAnswersRef.current = 0;

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

    const updatedScores = applySubjectWeights(scoresRef.current, subjectWeights);
    scoresRef.current = updatedScores;
    setScores(updatedScores);

    const actionRecord = {
      sessionId: session.id,
      sceneId,
      choiceId,
      actionType,
      timeToChooseMs,
      isOptimal,
    };

    if (!isLocalSession(session)) {
      await createGameActionLog(actionRecord);
    }
    actionsRef.current = [...actionsRef.current, actionRecord];
    setActions(actionsRef.current);

    if (isAnswer) {
      totalAnswersRef.current += 1;
      setTotalAnswers(totalAnswersRef.current);
      if (isCorrect) {
        correctAnswersRef.current += 1;
        setCorrectAnswers(correctAnswersRef.current);
      }
    }

    return updatedScores;
  }, [session?.id]);

  const completeSession = useCallback(async ({
    currentSceneId,
    totalTimeMs = 0,
    trustScore = undefined,
    hebrewScore = undefined,
    medicalReasoningScore = undefined,
  } = {}) => {
    if (!session?.id) {
      throw new Error('No active session');
    }

    const averageDecisionTimeMs =
      actionsRef.current.length > 0
        ? Math.round(
            actionsRef.current
              .map((item) => item.timeToChooseMs)
              .filter((item) => typeof item === 'number')
              .reduce((sum, value, _, arr) => sum + value / arr.length, 0)
          )
        : 0;

    const completionRate = 1;
    const engagementScore = estimateEngagementScore({
      actionsCount: actionsRef.current.length,
      completionRate,
      averageDecisionTimeMs,
    });

    const analytics = buildSessionAnalytics({
      rawScores: scoresRef.current,
      totalAnswers: totalAnswersRef.current,
      correctAnswers: correctAnswersRef.current,
      totalTimeMs,
      actions: actionsRef.current,
      completionRate,
    });
    const finalEngagementScore = Math.round(
      Math.max(engagementScore, analytics.behavior?.engagement || 0)
    );
    const finalTrustScore =
      typeof trustScore === 'number'
        ? trustScore
        : Math.round(analytics.behavior?.understanding || analytics.accuracy || 0);

    const completedPayload = {
      status: 'completed',
      currentSceneId,
      endedAt: new Date().toISOString(),
      interestSignal: analytics.interestSignal,
      engagementScore: finalEngagementScore,
      trustScore: finalTrustScore,
      hebrewScore,
      medicalReasoningScore,
    };

    const updated = isLocalSession(session)
      ? {
          ...session,
          status: 'completed',
          current_scene_id: currentSceneId,
          ended_at: completedPayload.endedAt,
          interest_signal: analytics.interestSignal,
          engagement_score: finalEngagementScore,
          trust_score: finalTrustScore,
          hebrew_score: hebrewScore,
          medical_reasoning_score: medicalReasoningScore,
        }
      : await updateGameSession(session.id, completedPayload);

    setSession(updated);

    return {
      session: updated,
      scores: analytics.normalizedScores,
      topSubjects: analytics.topSubjects,
      analytics: {
        ...analytics,
        engagementScore: finalEngagementScore,
        trustScore: finalTrustScore,
      },
    };
  }, [session?.id]);

  const abandonSession = useCallback(async ({ currentSceneId } = {}) => {
    if (!session?.id) {
      throw new Error('No active session');
    }

    const updated = isLocalSession(session)
      ? {
          ...session,
          status: 'abandoned',
          current_scene_id: currentSceneId,
          ended_at: new Date().toISOString(),
        }
      : await updateGameSession(session.id, {
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
