export function isHorizontalWord(word) {
  return word?.direction === 'across' || word?.direction === 'rtl';
}

export function isVerticalWord(word) {
  return word?.direction === 'down' || word?.direction === 'vertical';
}

function getDefaultNumberCell(word) {
  if (isVerticalWord(word)) {
    return {
      row: (typeof word.row === 'number' ? word.row : word.startRow || 0) - 1,
      col: typeof word.col === 'number' ? word.col : word.startCol || 0,
    };
  }

  return {
    row: typeof word.row === 'number' ? word.row : word.startRow || 0,
    col: (typeof word.col === 'number' ? word.col : word.startCol || 0) + 1,
  };
}

export function normalizePuzzleWord(word = {}) {
  const answer = String(word.answer || '');
  const direction = isVerticalWord(word)
    ? word?.direction === 'vertical'
      ? 'vertical'
      : 'down'
    : word?.direction === 'rtl'
    ? 'rtl'
    : 'across';

  const normalized = {
    ...word,
    answer,
    hint: word.hint || word.clue || '',
    clue: word.clue || word.hint || '',
    direction,
    row: typeof word.row === 'number' ? word.row : word.startRow || 0,
    col: typeof word.col === 'number' ? word.col : word.startCol || 0,
    length: word.length || Array.from(answer).length,
  };

  const fallbackNumberCell = getDefaultNumberCell(normalized);

  return {
    ...normalized,
    letterChoices: Array.isArray(word.letterChoices) ? word.letterChoices : word.lettersByWord,
    numberCell: {
      row:
        typeof word?.numberCell?.row === 'number'
          ? word.numberCell.row
          : fallbackNumberCell.row,
      col:
        typeof word?.numberCell?.col === 'number'
          ? word.numberCell.col
          : fallbackNumberCell.col,
    },
  };
}

export function getCellsForWord(word) {
  const normalizedWord = normalizePuzzleWord(word);
  const cells = [];

  for (let i = 0; i < normalizedWord.length; i += 1) {
    cells.push({
      row: isVerticalWord(normalizedWord) ? normalizedWord.row + i : normalizedWord.row,
      col: normalizedWord.direction === 'rtl'
        ? normalizedWord.col - i
        : isHorizontalWord(normalizedWord)
        ? normalizedWord.col + i
        : normalizedWord.col,
      index: i,
      wordId: normalizedWord.id,
    });
  }

  return cells;
}

export function buildBoardMap(words = []) {
  const map = {};

  words.forEach((rawWord) => {
    const word = normalizePuzzleWord(rawWord);
    const cells = getCellsForWord(word);
    const letters = Array.from(word.answer || '');

    cells.forEach((cell) => {
      const key = `${cell.row}-${cell.col}`;
      const correctLetter = letters[cell.index] || '';

      if (!map[key]) {
        map[key] = {
          row: cell.row,
          col: cell.col,
          correctLetter,
          words: [],
        };
      } else if (map[key].correctLetter && correctLetter && map[key].correctLetter !== correctLetter) {
        console.warn('Arabic puzzle grid conflict:', key, map[key].correctLetter, correctLetter);
      }

      map[key].words.push({
        wordId: word.id,
        index: cell.index,
        number: word.number,
      });
    });

    const numberKey = `${word.numberCell.row}-${word.numberCell.col}`;
    if (!map[numberKey]) {
      map[numberKey] = {
        row: word.numberCell.row,
        col: word.numberCell.col,
        kind: 'number',
        words: [
          {
            wordId: word.id,
            index: -1,
            number: word.number,
          },
        ],
      };
    } else {
      console.warn('Arabic puzzle number cell conflict:', numberKey, word.id);
    }
  });

  return map;
}

export function getWordById(words = [], wordId) {
  const word = words.find((item) => item.id === wordId) || null;
  return word ? normalizePuzzleWord(word) : null;
}

export function getCompletionPercent(words = [], solvedMap = {}) {
  if (!words.length) return 0;

  const solvedCount = words.filter((word) => solvedMap[word.id]).length;
  return Math.round((solvedCount / words.length) * 100);
}
