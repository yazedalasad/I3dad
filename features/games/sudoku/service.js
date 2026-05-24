const BASE_SCORE_BY_DIFFICULTY = {
  very_easy: 400,
  easy: 550,
  medium_light: 700,
  medium: 900,
  hard: 1200,
};

export const SUDOKU_SKILL_TAGS = [
  'logical_reasoning',
  'analytical_thinking',
  'pattern_recognition',
  'attention_to_detail',
  'patience',
  'problem_solving',
  'math_readiness',
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function calculateSudokuScore({
  difficulty = 'easy',
  elapsedMs = 0,
  mistakes = 0,
  completed = false,
  hintsUsed = 0,
}) {
  const base = BASE_SCORE_BY_DIFFICULTY[difficulty] || BASE_SCORE_BY_DIFFICULTY.easy;
  const timePenalty = Math.floor((Number(elapsedMs) || 0) / 1000);
  const mistakesPenalty = (Number(mistakes) || 0) * 50;
  const hintPenalty = (Number(hintsUsed) || 0) * 25;
  const completionBonus = completed ? 200 : 0;

  return Math.max(0, base - timePenalty - mistakesPenalty - hintPenalty + completionBonus);
}

export function calculateSudokuCompletionScore({
  level = 1,
  completed = false,
  mistakesCount = 0,
  hintsUsed = 0,
  timeSpentSeconds = 0,
}) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const base = safeLevel * 8;
  const completionBonus = completed ? 30 : 0;
  const isTrainingLevel = safeLevel <= 10;
  const mistakePenalty = isTrainingLevel
    ? Math.min(mistakesCount, 3)
    : Math.min(mistakesCount * 3, 25);
  const hintPenalty = Math.min(hintsUsed * 2, 20);
  const timePenalty = Math.min(Math.floor(timeSpentSeconds / 60), 20);

  return clamp(base + completionBonus - mistakePenalty - hintPenalty - timePenalty, 0, 100);
}

export function getSudokuSkillSignals(completionScore = 0, completed = false) {
  const score = clamp(completionScore);
  const multiplier = completed ? 1 : 0.35;

  return {
    logical_reasoning: clamp(score * multiplier),
    analytical_thinking: clamp(score * 0.92 * multiplier),
    pattern_recognition: clamp(score * 0.9 * multiplier),
    attention_to_detail: clamp(score * 0.88 * multiplier),
    patience: clamp(score * 0.82 * multiplier),
    problem_solving: clamp(score * 0.95 * multiplier),
    math_readiness: clamp(score * 0.86 * multiplier),
  };
}

export function getTopSudokuSkillSignals(skillSignals = {}, limit = 3) {
  return Object.entries(skillSignals)
    .map(([key, value]) => ({ key, value: clamp(value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function buildSudokuSessionMetadata({
  difficulty,
  level = null,
  puzzleId,
  mistakes,
  hintsUsed,
  correctMoves,
  wrongMoves,
  duplicateAttempts = 0,
  restarts,
  completed,
  score,
  elapsedMs,
  unlockedLevel = null,
}) {
  const timeSpentSeconds = Math.floor((Number(elapsedMs) || 0) / 1000);
  const completionScore = calculateSudokuCompletionScore({
    level,
    completed,
    mistakesCount: mistakes,
    hintsUsed,
    timeSpentSeconds,
  });
  const skillSignals = getSudokuSkillSignals(completionScore, completed);

  return {
    game_key: 'sudoku',
    level,
    difficulty,
    puzzleId,
    completed: Boolean(completed),
    time_spent_seconds: timeSpentSeconds,
    mistakes_count: Number(mistakes) || 0,
    hints_used: Number(hintsUsed) || 0,
    correct_moves: Number(correctMoves) || 0,
    wrong_moves: Number(wrongMoves) || 0,
    duplicate_attempts: Number(duplicateAttempts) || 0,
    restarts_count: Number(restarts) || 0,
    completion_score: completionScore,
    unlocked_level: unlockedLevel,
    skill_signals: skillSignals,
    score,
    elapsedMs,
    timeSpentSeconds,
  };
}
