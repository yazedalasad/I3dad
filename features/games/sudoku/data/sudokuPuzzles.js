import {
  filterValidPuzzles,
  generateBalancedPuzzleFromSolution,
  gridToPuzzleString,
} from '../utils/sudokuUtils.js';

const PUZZLE_SOLUTIONS = {
  very_easy:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  easy:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  medium_light:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  medium:
    '435269781682571493197834562826195347374682915951743628519326874248957136763418259',
  hard:
    '693784512487512936125963874932651487568247391741398625319475268856129743274836159',
};

const PUZZLE_TIERS = ['very_easy', 'easy', 'medium_light', 'medium', 'hard'];
const PUZZLES_PER_TIER = 3;

const rawSudokuPuzzles = PUZZLE_TIERS.flatMap((difficulty) =>
  Array.from({ length: PUZZLES_PER_TIER }, (_, seed) => {
    const solution = PUZZLE_SOLUTIONS[difficulty];
    const puzzleGrid = generateBalancedPuzzleFromSolution(solution, difficulty, seed);

    return {
      id: `${difficulty}-${seed + 1}`,
      difficulty,
      puzzle: gridToPuzzleString(puzzleGrid),
      solution,
    };
  })
);

export const sudokuPuzzles = filterValidPuzzles(rawSudokuPuzzles);

if (sudokuPuzzles.length !== rawSudokuPuzzles.length) {
  console.warn(
    `[Sudoku] Loaded ${sudokuPuzzles.length}/${rawSudokuPuzzles.length} valid puzzles after validation`
  );
}

export const SUDOKU_DIFFICULTIES = PUZZLE_TIERS;

export const SUDOKU_SUBJECT_WEIGHTS = {
  math: 4,
  psychology: 2,
  computer_science: 3,
  engineering: 2,
};

export function getValidPuzzleCountByDifficulty(difficulty) {
  return sudokuPuzzles.filter((p) => p.difficulty === difficulty).length;
}
