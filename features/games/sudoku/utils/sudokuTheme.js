export const SUDOKU_COLORS = {
  pageBg: '#F6F8FF',
  primary: '#1E4FBF',
  primaryDark: '#102A68',
  blockBorder: '#1E3A8A',
  cellBorder: '#CBD5E1',
  boardBg: '#FFFFFF',
  fixedBg: '#EEF4FF',
  fixedText: '#102A68',
  userText: '#1E4FBF',
  selectedBg: '#DBEAFE',
  relatedBg: '#F1F5FF',
  sameNumberBg: '#E8F0FF',
  incorrectBg: '#FEE2E2',
  incorrectText: '#B42318',
  chipBg: '#FFFFFF',
  chipBorder: '#BFDBFE',
  chipLabel: '#64748B',
  chipValue: '#102A68',
};

export const SUDOKU_LAYOUT = {
  maxContentWidth: 820,
  maxBoardWidth: 540,
  boardPaddingHorizontal: 32,
  boardBorderRadius: 20,
  boardOuterBorder: 3,
  playAreaBottomPadding: 56,
};

export function getBoardMetrics(windowWidth) {
  const targetWidth = Math.min(
    windowWidth - SUDOKU_LAYOUT.boardPaddingHorizontal,
    SUDOKU_LAYOUT.maxBoardWidth
  );
  const cellSize = Math.floor(targetWidth / 9);
  const boardSize = cellSize * 9;

  return { boardSize, cellSize };
}

export function getCellFontSize(cellSize, windowWidth) {
  const isCompact = windowWidth < 480;
  const scaled = cellSize * (isCompact ? 0.52 : 0.56);
  return Math.round(Math.min(isCompact ? 26 : 32, Math.max(isCompact ? 22 : 26, scaled)));
}

export function getNumberPadMetrics(boardSize, windowWidth) {
  const gap = 8;
  const maxButton = windowWidth >= 768 ? 64 : windowWidth >= 480 ? 56 : 54;
  const minButton = windowWidth >= 768 ? 56 : windowWidth >= 480 ? 50 : 46;
  const padWidth = boardSize;

  let buttonsPerRow = 9;
  let buttonSize = Math.floor((padWidth - gap * (buttonsPerRow - 1)) / buttonsPerRow);

  if (buttonSize < minButton) {
    buttonsPerRow = 5;
    buttonSize = Math.floor((padWidth - gap * (buttonsPerRow - 1)) / buttonsPerRow);
  }

  buttonSize = Math.min(maxButton, Math.max(minButton, buttonSize));

  return {
    buttonSize,
    gap,
    maxWidth: padWidth,
    buttonsPerRow,
  };
}

/** UI-only: digits fully placed correctly on the board */
export function getCompletedNumbers(userGrid = [], solutionGrid = []) {
  const counts = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, 0]));

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = Number(userGrid?.[row]?.[col]);
      if (value > 0 && value === Number(solutionGrid?.[row]?.[col])) {
        counts[value] += 1;
      }
    }
  }

  return new Set(
    Object.entries(counts)
      .filter(([, count]) => count >= 9)
      .map(([digit]) => Number(digit))
  );
}

// Backward-compatible helper
export function getBoardSize(windowWidth) {
  return getBoardMetrics(windowWidth).boardSize;
}
