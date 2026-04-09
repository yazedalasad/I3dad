export function getCellsForWord(word) {
  const cells = [];

  for (let i = 0; i < word.length; i += 1) {
    cells.push({
      row: word.direction === 'down' ? word.row + i : word.row,
      col: word.direction === 'across' ? word.col + i : word.col,
      index: i,
      wordId: word.id,
    });
  }

  return cells;
}

export function buildBoardMap(words = []) {
  const map = {};

  words.forEach((word) => {
    const cells = getCellsForWord(word);

    cells.forEach((cell) => {
      const key = `${cell.row}-${cell.col}`;

      if (!map[key]) {
        map[key] = {
          row: cell.row,
          col: cell.col,
          words: [],
        };
      }

      map[key].words.push({
        wordId: word.id,
        index: cell.index,
        number: word.number,
      });
    });
  });

  return map;
}

export function getWordById(words = [], wordId) {
  return words.find((word) => word.id === wordId) || null;
}

export function getCompletionPercent(words = [], solvedMap = {}) {
  if (!words.length) return 0;

  const solvedCount = words.filter((word) => solvedMap[word.id]).length;
  return Math.round((solvedCount / words.length) * 100);
}
