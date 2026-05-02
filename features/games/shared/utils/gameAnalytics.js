import { getInterestSignal, getTopSubjects, normalizeScores, calculateAccuracy } from './gameScoring';

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function average(values = []) {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function scoreDecisionPacing(averageDecisionTimeMs = 0) {
  if (!averageDecisionTimeMs) return 55;
  if (averageDecisionTimeMs >= 2500 && averageDecisionTimeMs <= 35000) return 100;
  if (averageDecisionTimeMs < 1200) return 62;
  if (averageDecisionTimeMs <= 60000) return 76;
  return 50;
}

export function buildBehaviorSignals({
  actions = [],
  totalAnswers = 0,
  correctAnswers = 0,
  totalTimeMs = 0,
  completionRate = 1,
}) {
  const decisionTimes = actions
    .map((item) => Number(item?.timeToChooseMs))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageDecisionTimeMs = Math.round(average(decisionTimes));
  const optimalCount = actions.filter((item) => item?.isOptimal === true).length;
  const answerAccuracy = calculateAccuracy(correctAnswers, totalAnswers);
  const optimalRate = actions.length ? Math.round((optimalCount / actions.length) * 100) : answerAccuracy;
  const retryCount = Math.max(totalAnswers - correctAnswers, 0);
  const persistence = clamp(55 + Math.min(actions.length * 4, 25) + Math.min(retryCount * 8, 20));
  const pacing = scoreDecisionPacing(averageDecisionTimeMs);
  const exploration = clamp(
    45 +
      Math.min(new Set(actions.map((item) => item?.sceneId).filter(Boolean)).size * 8, 25) +
      Math.min(actions.length * 3, 30)
  );
  const completion = clamp(completionRate * 100);
  const timeInvestment = totalTimeMs > 0 ? clamp(Math.log10(totalTimeMs / 1000 + 1) * 28, 20, 100) : 55;

  const understanding = Math.round(
    clamp(answerAccuracy * 0.5 + optimalRate * 0.25 + pacing * 0.15 + persistence * 0.1)
  );
  const interest = Math.round(
    clamp(completion * 0.3 + persistence * 0.25 + exploration * 0.2 + timeInvestment * 0.15 + pacing * 0.1)
  );
  const engagement = Math.round(
    clamp(completion * 0.35 + persistence * 0.25 + exploration * 0.2 + pacing * 0.2)
  );

  return {
    averageDecisionTimeMs,
    optimalRate,
    answerAccuracy,
    retryCount,
    persistence,
    pacing,
    exploration,
    understanding,
    interest,
    engagement,
  };
}

export function buildSessionAnalytics({
  rawScores = {},
  totalAnswers = 0,
  correctAnswers = 0,
  totalTimeMs = 0,
  actions = [],
  completionRate = 1,
}) {
  const normalizedScores = normalizeScores(rawScores);
  const behavior = buildBehaviorSignals({
    actions,
    totalAnswers,
    correctAnswers,
    totalTimeMs,
    completionRate,
  });
  const subjectInterestSignal = getInterestSignal(normalizedScores);
  const interestSignal = Math.round(
    clamp(subjectInterestSignal * 0.45 + behavior.interest * 0.55)
  );
  const topSubjects = getTopSubjects(normalizedScores, 3);
  const accuracy = calculateAccuracy(correctAnswers, totalAnswers);

  return {
    normalizedScores,
    subjectInterestSignal,
    interestSignal,
    topSubjects,
    accuracy,
    totalTimeMs,
    behavior,
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
