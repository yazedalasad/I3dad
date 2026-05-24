const GRID_SIZE = 9;

export function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

export function isGridShapeValid(grid) {
  return (
    Array.isArray(grid) &&
    grid.length === 9 &&
    grid.every((row) => Array.isArray(row) && row.length === 9)
  );
}

export function parseCellValue(value) {
  if (value === '.' || value === '0' || value === 0 || value == null) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 9 ? numeric : 0;
}

export function puzzleStringToGrid(str) {
  const safe = String(str || '').replace(/\./g, '0');

  if (safe.length !== 81) {
    console.warn('[Sudoku] Invalid puzzle string length:', safe.length);
    return createEmptyGrid();
  }

  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => {
      const value = Number(safe[row * 9 + col]);
      return Number.isInteger(value) && value >= 0 && value <= 9 ? value : 0;
    })
  );
}

export function stringToGrid(puzzleString = '') {
  return puzzleStringToGrid(puzzleString);
}

export function cloneGrid(grid) {
  if (!isGridShapeValid(grid)) return createEmptyGrid();
  return grid.map((row) => [...row]);
}

export function getNumberUsage(grid) {
  const usage = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
  };

  if (!Array.isArray(grid)) return usage;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = Number(grid?.[row]?.[col]);
      if (value >= 1 && value <= 9) {
        usage[value] += 1;
      }
    }
  }

  return usage;
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function isFixedCell(puzzleGrid, row, col) {
  return Number(puzzleGrid?.[row]?.[col] || 0) > 0;
}

export function getBlockStart(row, col) {
  return {
    row: Math.floor(row / 3) * 3,
    col: Math.floor(col / 3) * 3,
  };
}

export function isSameBlock(rowA, colA, rowB, colB) {
  const blockA = getBlockStart(rowA, colA);
  const blockB = getBlockStart(rowB, colB);
  return blockA.row === blockB.row && blockA.col === blockB.col;
}

export function isRelatedCell(selected, row, col) {
  if (!selected) return false;
  if (selected.row === row && selected.col === col) return false;
  return (
    selected.row === row ||
    selected.col === col ||
    isSameBlock(selected.row, selected.col, row, col)
  );
}

export function isBoardComplete(userGrid, solutionGrid) {
  if (!isGridShapeValid(userGrid) || !isGridShapeValid(solutionGrid)) return false;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (Number(userGrid[row][col]) !== Number(solutionGrid[row][col])) {
        return false;
      }
    }
  }
  return true;
}

export function countEmptyCells(grid = []) {
  if (!isGridShapeValid(grid)) return 81;
  return grid.reduce(
    (total, row) => total + row.filter((value) => !Number(value)).length,
    0
  );
}

export function hasDuplicateInUnit(values) {
  const seen = new Set();

  for (const raw of values) {
    const value = Number(raw);
    if (!value || value < 1 || value > 9) continue;

    if (seen.has(value)) return true;
    seen.add(value);
  }

  return false;
}

export function getBoardConflicts(grid) {
  if (!isGridShapeValid(grid)) {
    return [];
  }

  const conflicts = [];

  const addConflict = (row, col, reason) => {
    if (row < 0 || row > 8 || col < 0 || col > 8 || !reason) {
      return;
    }

    if (!conflicts.some((x) => x.row === row && x.col === col && x.reason === reason)) {
      conflicts.push({ row, col, reason });
    }
  };

  for (let row = 0; row < 9; row++) {
    const positionsByValue = {};

    for (let col = 0; col < 9; col++) {
      const value = Number(grid?.[row]?.[col]);
      if (!value) continue;

      positionsByValue[value] = positionsByValue[value] || [];
      positionsByValue[value].push({ row, col });
    }

    Object.values(positionsByValue).forEach((positions) => {
      if (positions.length > 1) {
        positions.forEach((p) => addConflict(p.row, p.col, 'row'));
      }
    });
  }

  for (let col = 0; col < 9; col++) {
    const positionsByValue = {};

    for (let row = 0; row < 9; row++) {
      const value = Number(grid?.[row]?.[col]);
      if (!value) continue;

      positionsByValue[value] = positionsByValue[value] || [];
      positionsByValue[value].push({ row, col });
    }

    Object.values(positionsByValue).forEach((positions) => {
      if (positions.length > 1) {
        positions.forEach((p) => addConflict(p.row, p.col, 'column'));
      }
    });
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const positionsByValue = {};

      for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
          const value = Number(grid?.[row]?.[col]);
          if (!value) continue;

          positionsByValue[value] = positionsByValue[value] || [];
          positionsByValue[value].push({ row, col });
        }
      }

      Object.values(positionsByValue).forEach((positions) => {
        if (positions.length > 1) {
          positions.forEach((p) => addConflict(p.row, p.col, 'box'));
        }
      });
    }
  }

  return conflicts;
}

export function isValidSudokuBoard(grid, { allowEmpty = true } = {}) {
  if (!isGridShapeValid(grid)) return false;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = Number(grid[row][col]);

      if (!value) {
        if (!allowEmpty) return false;
        continue;
      }

      if (value < 1 || value > 9) return false;
    }
  }

  return getBoardConflicts(grid).length === 0;
}

export function findSudokuConflicts(grid, row, col, value) {
  if (!isGridShapeValid(grid)) return [];
  if (row == null || col == null || row < 0 || row > 8 || col < 0 || col > 8) return [];
  if (!value) return [];

  const conflicts = [];
  const num = Number(value);

  const add = (r, c, reason) => {
    if (r === row && c === col) return;

    if (!conflicts.some((x) => x.row === r && x.col === c)) {
      conflicts.push({ row: r, col: c, reason });
    }
  };

  for (let c = 0; c < 9; c++) {
    if (Number(grid[row][c]) === num) add(row, c, 'row');
  }

  for (let r = 0; r < 9; r++) {
    if (Number(grid[r][col]) === num) add(r, col, 'column');
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (Number(grid[r][c]) === num) add(r, c, 'box');
    }
  }

  return conflicts;
}

export function countFixedCellsInBox(grid, boxRow, boxCol) {
  let count = 0;

  for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
    for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
      const value = Number(grid?.[row]?.[col]);
      if (value >= 1 && value <= 9) count++;
    }
  }

  return count;
}

export function getFixedCellsPerBox(grid) {
  const counts = [];

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      let count = 0;

      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          const value = Number(grid?.[row]?.[col]);
          if (value >= 1 && value <= 9) count += 1;
        }
      }

      counts.push(count);
    }
  }

  return counts;
}

export function logSudokuGridDebug(grid, fixedSourceGrid = grid) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  if (!isGridShapeValid(grid)) {
    console.log('[Sudoku] grid debug: invalid grid shape');
    return;
  }

  console.log('[Sudoku] rows:', grid.length);
  console.log('[Sudoku] row sizes:', grid.map((row) => row.length));
  console.log('[Sudoku] Fixed cells per 3x3 box:', getFixedCellsPerBox(fixedSourceGrid));
}

export function isPuzzleBalancedByBoxes(grid, difficulty = 'easy') {
  if (!isGridShapeValid(grid)) return false;

  const counts = getFixedCellsPerBox(grid);
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  const rules = {
    very_easy: { minBox: 6, maxBox: 8, maxSpread: 2 },
    easy: { minBox: 4, maxBox: 6, maxSpread: 3 },
    medium_light: { minBox: 3, maxBox: 5, maxSpread: 3 },
    medium: { minBox: 2, maxBox: 4, maxSpread: 4 },
    hard: { minBox: 1, maxBox: 5, maxSpread: 4 },
  };

  const rule = rules[difficulty] || rules.medium;

  return min >= rule.minBox && max <= rule.maxBox && max - min <= rule.maxSpread;
}

const BOX_GIVENS_BY_DIFFICULTY = {
  very_easy: [7, 7, 7, 7, 7, 7, 7, 7, 7],
  easy: [5, 5, 5, 5, 5, 5, 5, 5, 5],
  medium_light: [4, 4, 4, 4, 4, 4, 4, 4, 4],
  medium: [3, 3, 3, 3, 3, 3, 3, 3, 3],
  hard: [2, 2, 2, 3, 2, 2, 2, 2, 2],
};

function shuffleArray(items = []) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function generateBalancedPuzzleFromSolution(solutionStr, difficulty = 'medium', seed = 0) {
  const solutionGrid = stringToGrid(solutionStr);
  if (!isValidSudokuBoard(solutionGrid, { allowEmpty: false })) {
    return createEmptyGrid();
  }

  const perBoxTargets = BOX_GIVENS_BY_DIFFICULTY[difficulty] || BOX_GIVENS_BY_DIFFICULTY.medium;
  const puzzleGrid = createEmptyGrid();

  for (let boxIndex = 0; boxIndex < 9; boxIndex += 1) {
    const boxRow = Math.floor(boxIndex / 3);
    const boxCol = boxIndex % 3;
    const target = perBoxTargets[boxIndex];
    const cells = [];

    for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
      for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
        cells.push({ row, col });
      }
    }

    const orderedCells = shuffleArray(cells).sort((a, b) => {
      const aScore = (a.row + a.col + seed + boxIndex) % 9;
      const bScore = (b.row + b.col + seed + boxIndex) % 9;
      return aScore - bScore;
    });

    orderedCells.slice(0, target).forEach(({ row, col }) => {
      puzzleGrid[row][col] = solutionGrid[row][col];
    });
  }

  return puzzleGrid;
}

export function gridToPuzzleString(grid) {
  if (!isGridShapeValid(grid)) return ''.padEnd(81, '0');
  return grid.flat().map((value) => String(Number(value) || 0)).join('');
}

export function validateSudokuPuzzle(puzzleGrid, solutionGrid, difficulty = 'medium') {
  const errors = [];

  if (!isGridShapeValid(puzzleGrid) || !isGridShapeValid(solutionGrid)) {
    errors.push('Puzzle or solution grid shape is invalid');
    return { valid: false, errors };
  }

  if (!isValidSudokuBoard(puzzleGrid, { allowEmpty: true })) {
    errors.push('Puzzle has duplicate numbers or invalid values');
  }

  if (!isValidSudokuBoard(solutionGrid, { allowEmpty: false })) {
    errors.push('Solution is not a valid complete Sudoku board');
  }

  if (!isPuzzleBalancedByBoxes(puzzleGrid, difficulty)) {
    errors.push('Puzzle fixed cells are not balanced across 3x3 boxes');
  }

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const puzzleValue = Number(puzzleGrid[row][col]);
      const solutionValue = Number(solutionGrid[row][col]);

      if (puzzleValue && puzzleValue !== solutionValue) {
        errors.push(`Puzzle value mismatch at row ${row}, col ${col}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isValidPuzzleStrings(puzzle, solution) {
  const puzzleStr = String(puzzle || '');
  const solutionStr = String(solution || '');

  if (puzzleStr.length !== 81 || solutionStr.length !== 81) return false;
  if (!/^[0-9.]+$/.test(puzzleStr)) return false;
  if (!/^[1-9]+$/.test(solutionStr)) return false;

  return true;
}

export function validatePuzzleRecord(puzzleRecord) {
  const errors = [];
  const { id, difficulty, puzzle, solution } = puzzleRecord || {};

  if (!id) errors.push('Missing puzzle id');
  if (!difficulty) errors.push('Missing difficulty');

  if (!isValidPuzzleStrings(puzzle, solution)) {
    errors.push('Invalid puzzle or solution string format/length');
  }

  const puzzleGrid = stringToGrid(puzzle);
  const solutionGrid = stringToGrid(solution);
  const validation = validateSudokuPuzzle(puzzleGrid, solutionGrid, difficulty);

  if (!validation.valid) {
    errors.push(...validation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    puzzleGrid,
    solutionGrid,
  };
}

export function filterValidPuzzles(puzzles = []) {
  const valid = [];

  for (const record of puzzles) {
    const result = validatePuzzleRecord(record);
    if (result.valid) {
      valid.push(record);
    } else {
      console.warn(
        `[Sudoku] Skipping invalid puzzle "${record?.id}" (${record?.difficulty}):`,
        result.errors.join('; ')
      );
    }
  }

  return valid;
}

export function pickValidRandomPuzzle(puzzles = [], difficulty = 'easy') {
  const pool = puzzles.filter((item) => item.difficulty === difficulty);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** @deprecated Use pickValidRandomPuzzle with pre-filtered puzzles */
export function pickRandomPuzzle(puzzles = [], difficulty = 'easy') {
  return pickValidRandomPuzzle(puzzles, difficulty);
}

export function formatDifficultyLevelId(difficulty, puzzleId) {
  return `sudoku_${difficulty}_${puzzleId}`;
}

export function conflictKey(row, col) {
  return `${row}-${col}`;
}

export function buildConflictKeySet(conflicts = []) {
  return new Set(conflicts.map((c) => conflictKey(c.row, c.col)));
}
