export const MAX_SUDOKU_LEVEL = 20;

export const SUDOKU_LEVEL_CONFIG = [
  { level: 1, puzzleDifficulty: 'very_easy', hints: 10, mistakeLimit: null },
  { level: 2, puzzleDifficulty: 'very_easy', hints: 9, mistakeLimit: null },
  { level: 3, puzzleDifficulty: 'very_easy', hints: 8, mistakeLimit: null },
  { level: 4, puzzleDifficulty: 'easy', hints: 7, mistakeLimit: null },
  { level: 5, puzzleDifficulty: 'easy', hints: 6, mistakeLimit: null },
  { level: 6, puzzleDifficulty: 'easy', hints: 5, mistakeLimit: null },
  { level: 7, puzzleDifficulty: 'medium_light', hints: 4, mistakeLimit: null },
  { level: 8, puzzleDifficulty: 'medium_light', hints: 3, mistakeLimit: null },
  { level: 9, puzzleDifficulty: 'medium_light', hints: 3, mistakeLimit: null },
  { level: 10, puzzleDifficulty: 'medium_light', hints: 3, mistakeLimit: null },
  { level: 11, puzzleDifficulty: 'medium', hints: 3, mistakeLimit: 3 },
  { level: 12, puzzleDifficulty: 'medium', hints: 3, mistakeLimit: 3 },
  { level: 13, puzzleDifficulty: 'medium', hints: 3, mistakeLimit: 3 },
  { level: 14, puzzleDifficulty: 'medium', hints: 3, mistakeLimit: 3 },
  { level: 15, puzzleDifficulty: 'medium', hints: 3, mistakeLimit: 3 },
  { level: 16, puzzleDifficulty: 'hard', hints: 3, mistakeLimit: 3 },
  { level: 17, puzzleDifficulty: 'hard', hints: 3, mistakeLimit: 3 },
  { level: 18, puzzleDifficulty: 'hard', hints: 3, mistakeLimit: 3 },
  { level: 19, puzzleDifficulty: 'hard', hints: 3, mistakeLimit: 3 },
  { level: 20, puzzleDifficulty: 'hard', hints: 3, mistakeLimit: 3 },
];

export const SUDOKU_LEVELS = SUDOKU_LEVEL_CONFIG.map((entry) => entry.level);

const LEGACY_DIFFICULTY_BY_LEVEL = {
  easy: 1,
  medium: 11,
  hard: 16,
};

export function getSudokuLevelConfig(level) {
  const normalized = normalizeSudokuLevel(level);
  return (
    SUDOKU_LEVEL_CONFIG.find((entry) => entry.level === normalized) ||
    SUDOKU_LEVEL_CONFIG[0]
  );
}

export function getDifficultyForLevel(level) {
  return getSudokuLevelConfig(level).puzzleDifficulty;
}

export function getLevelForDifficulty(difficulty) {
  return LEGACY_DIFFICULTY_BY_LEVEL[difficulty] || 1;
}

export function normalizeSudokuLevel(value) {
  const level = Number(value);
  if (!Number.isFinite(level)) return 1;
  if (level < 1) return 1;
  if (level > MAX_SUDOKU_LEVEL) return MAX_SUDOKU_LEVEL;
  return Math.floor(level);
}

export function isSudokuLevelUnlocked(level, unlockedLevel) {
  return normalizeSudokuLevel(level) <= normalizeSudokuLevel(unlockedLevel);
}

export function hasMistakeLimit(level) {
  return getSudokuLevelConfig(level).mistakeLimit != null;
}

export function getHintsForLevel(level) {
  return getSudokuLevelConfig(level).hints;
}

export function getMistakeLimitForLevel(level) {
  return getSudokuLevelConfig(level).mistakeLimit;
}
