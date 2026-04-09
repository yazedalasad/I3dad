import { getInterestSignal, getTopSubjects, normalizeScores, calculateAccuracy } from './gameScoring';

export function buildSessionAnalytics({
  rawScores = {},
  totalAnswers = 0,
  correctAnswers = 0,
  totalTimeMs = 0,
}) {
  const normalizedScores = normalizeScores(rawScores);
  const interestSignal = getInterestSignal(normalizedScores);
  const topSubjects = getTopSubjects(normalizedScores, 3);
  const accuracy = calculateAccuracy(correctAnswers, totalAnswers);

  return {
    normalizedScores,
    interestSignal,
    topSubjects,
    accuracy,
    totalTimeMs,
  };
}

export function estimateEngagementScore({
  actionsCount = 0,
  completionRate = 0,
  averageDecisionTimeMs = 0,
}) {
  const actionScore = Math.min(actionsCount * 2, 40);
  const completionScore = Math.min(Math.round(completionRate * 40), 40);

  let speedScore = 20;
  if (averageDecisionTimeMs > 0 && averageDecisionTimeMs < 45000) {
    speedScore = 20;
  } else if (averageDecisionTimeMs >= 45000) {
    speedScore = 10;
  }

  return Math.min(actionScore + completionScore + speedScore, 100);
}
