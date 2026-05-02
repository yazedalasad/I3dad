import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildBoardMap, getCellsForWord, isHorizontalWord } from '../utils/puzzleHelpers';
import { desertTheme } from '../utils/theme';

function isCellInSelectedWord(cell, selectedWord) {
  if (!selectedWord) return false;

  if (selectedWord.direction === 'rtl') {
    return (
      cell.row === selectedWord.row &&
      cell.col <= selectedWord.col &&
      cell.col > selectedWord.col - selectedWord.length
    );
  }

  if (selectedWord.direction === 'across') {
    return (
      cell.row === selectedWord.row &&
      cell.col >= selectedWord.col &&
      cell.col < selectedWord.col + selectedWord.length
    );
  }

  return cell.col === selectedWord.col && cell.row >= selectedWord.row && cell.row < selectedWord.row + selectedWord.length;
}

function isNumberCellSelected(cell, selectedWord) {
  if (!selectedWord?.numberCell) return false;

  return cell.row === selectedWord.numberCell.row && cell.col === selectedWord.numberCell.col;
}

export default function PoetPuzzleBoard({
  board,
  words,
  selectedWord,
  solvedMap,
  onPressWord,
  cellSize = 24,
}) {
  const boardMap = useMemo(() => buildBoardMap(words), [words]);
  const columnIndexes = useMemo(
    () => Array.from({ length: board.cols }, (_, index) => board.cols - index - 1),
    [board.cols]
  );
  const colors = desertTheme.colors;
  const gapSize = Math.max(1.5, Math.round(cellSize * 0.06 * 10) / 10);
  const radius = Math.max(6, Math.round(cellSize * 0.24));
  const numberFontSize = Math.max(9, Math.round(cellSize * 0.36));
  const letterFontSize = Math.max(13, Math.round(cellSize * 0.56));
  const letterLineHeight = Math.max(letterFontSize + 2, Math.round(cellSize * 0.64));
  const letterMap = useMemo(() => {
    const nextMap = {};

    words.forEach((word) => {
      if (!solvedMap[word.id]) return;

      const letters = Array.from(word.answer || '');
      getCellsForWord(word).forEach((cell) => {
        nextMap[`${cell.row}-${cell.col}`] = {
          letter: letters[cell.index] || '',
          solved: true,
        };
      });
    });

    return nextMap;
  }, [solvedMap, words]);

  return (
    <View style={styles.wrapper}>
      {Array.from({ length: board.rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {columnIndexes.map((colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const cell = boardMap[key];

            if (!cell) {
              return (
                <View
                  key={key}
                  style={[styles.emptySlot, { width: cellSize, height: cellSize, margin: gapSize }]}
                />
              );
            }

            const primaryWordId = cell.words[0]?.wordId;
            const word = words.find((item) => item.id === primaryWordId);
            const selectedCell = { row: rowIndex, col: colIndex };
            const selected =
              cell.kind === 'number'
                ? isNumberCellSelected(selectedCell, selectedWord)
                : isCellInSelectedWord(selectedCell, selectedWord);
            const solved = cell.words.some((item) => solvedMap[item.wordId]);
            const isResolved = solved;
            const cellLetter = letterMap[key];
            const isNumberCell = cell.kind === 'number';
            const numberLabel = `${word?.number || ''}${isHorizontalWord(word) ? ' \u2190' : ' \u2193'}`;

            return (
              <Pressable
                key={key}
                onPress={() => onPressWord(primaryWordId)}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    margin: gapSize,
                    borderRadius: radius,
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    transform: [{ scale: selected ? 1.08 : 1 }],
                    shadowOpacity: selected ? 0.28 : 0.08,
                    shadowRadius: selected ? 8 : 2,
                    elevation: selected ? 6 : 1,
                  },
                ]}
              >
                {isNumberCell ? (
                  <View
                    style={[
                      styles.numberCell,
                      {
                        width: Math.max(24, Math.round(cellSize * 0.82)),
                        height: Math.max(24, Math.round(cellSize * 0.82)),
                        borderRadius: Math.max(8, Math.round(radius * 0.86)),
                        backgroundColor: isResolved
                          ? colors.solved
                          : selected
                          ? colors.selected
                          : colors.accent,
                        borderColor: isResolved ? '#2F6E40' : selected ? colors.accentDark : colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberBadgeText,
                        {
                          fontSize: Math.max(9, Math.round(numberFontSize * 0.8)),
                          color: '#FFF8EB',
                        },
                      ]}
                    >
                      {numberLabel}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.letterCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radius,
                        backgroundColor: isResolved
                          ? colors.solved
                          : selected
                          ? colors.selected
                          : colors.emptyCell,
                        borderColor: isResolved ? '#2F8F4E' : selected ? colors.accentDark : colors.line,
                        borderWidth: isResolved ? 2.2 : 1.4,
                      },
                    ]}
                  >
                    {cellLetter?.letter ? (
                      <Text
                        style={[
                          styles.letter,
                          {
                            fontSize: letterFontSize,
                            lineHeight: letterLineHeight,
                            color: cellLetter.solved ? '#FFF8EB' : selected ? colors.accentDark : '#7A5732',
                          },
                        ]}
                      >
                        {cellLetter.letter}
                      </Text>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
  },
  emptySlot: {
    backgroundColor: 'transparent',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    position: 'relative',
  },
  letterCell: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
  },
  numberCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.6,
    shadowColor: '#000000',
  },
  numberBadgeText: {
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  letter: {
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
