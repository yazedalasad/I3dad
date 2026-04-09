import { createSubjectScoreMap } from '../types/gameSchemas';

export function createEmptyScores() {
  return createSubjectScoreMap();
}

export function applySubjectWeights(currentScores, subjectWeights = {}) {
  const nextScores = { ...currentScores };

  Object.entries(subjectWeights).forEach(([subjectCode, value]) => {
    const numericValue = Number(value) || 0;
    nextScores[subjectCode] = (nextScores[subjectCode] || 0) + numericValue;
  });

  return nextScores;
}

export function mergeScoreMaps(...maps) {
  return maps.reduce((acc, map) => applySubjectWeights(acc, map), createEmptyScores());
}

export function sumScores(scores) {
  return Object.values(scores || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function normalizeScores(scores) {
  const max = Math.max(...Object.values(scores || {}), 0);

  if (max <= 0) {
    return { ...(scores || {}) };
  }

  return Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, Math.round((Number(value) / max) * 100)])
  );
}

export function clampScore(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function getTopSubjects(scores, limit = 3) {
  return Object.entries(scores || {})
    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
    .slice(0, limit)
    .map(([subjectCode, score]) => ({ subjectCode, score: Number(score) || 0 }));
}

export function getInterestSignal(scores) {
  const normalized = normalizeScores(scores);
  const values = Object.values(normalized);

  if (values.length === 0) return 0;

  return Math.round(values.reduce((sum, current) => sum + current, 0) / values.length);
}

export function getDominantSubject(scores) {
  const [first] = getTopSubjects(scores, 1);
  return first || null;
}

export function calculateAccuracy(correctCount = 0, totalCount = 0) {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function scoreSwipeDirection(direction, mapping = {}) {
  return mapping[direction] || {};
}
