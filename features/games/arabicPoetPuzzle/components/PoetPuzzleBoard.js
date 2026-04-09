import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buildBoardMap } from '../utils/puzzleHelpers';
import { desertTheme } from '../utils/theme';

function isCellInSelectedWord(cell, selectedWord) {
  if (!selectedWord) return false;

  if (selectedWord.direction === 'across') {
    return cell.row === selectedWord.row && cell.col >= selectedWord.col && cell.col < selectedWord.col + selectedWord.length;
  }

  return cell.col === selectedWord.col && cell.row >= selectedWord.row && cell.row < selectedWord.row + selectedWord.length;
}

export default function PoetPuzzleBoard({ board, words, selectedWord, solvedMap, onPressWord }) {
  const boardMap = useMemo(() => buildBoardMap(words), [words]);
  const colors = desertTheme.colors;

  return (
    <View style={styles.wrapper}>
      {Array.from({ length: board.rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: board.cols }).map((__, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const cell = boardMap[key];

            if (!cell) {
              return <View key={key} style={styles.emptySlot} />;
            }

            const primaryWordId = cell.words[0]?.wordId;
            const word = words.find((item) => item.id === primaryWordId);
            const selected = isCellInSelectedWord({ row: rowIndex, col: colIndex }, selectedWord);
            const solved = cell.words.some((item) => solvedMap[item.wordId]);

            return (
              <Pressable
                key={key}
                onPress={() => onPressWord(primaryWordId)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: solved
                      ? colors.solved
                      : selected
                      ? colors.selected
                      : colors.emptyCell,
                    borderColor: solved ? '#6A8A58' : selected ? colors.accentDark : colors.line,
                    transform: [{ scale: selected ? 1.08 : 1 }],
                    shadowOpacity: selected ? 0.28 : 0.08,
                    shadowRadius: selected ? 8 : 2,
                    elevation: selected ? 6 : 1,
                  },
                ]}
              >
                {cell.words.some((item) => item.index === 0) ? (
                  <Text style={[styles.number, { color: solved ? '#F7EEDD' : colors.ink }]}>
                    {word?.number}
                  </Text>
                ) : null}
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
  },
  row: {
    flexDirection: 'row-reverse',
  },
  emptySlot: {
    width: 30,
    height: 30,
    margin: 2,
    backgroundColor: 'transparent',
  },
  cell: {
    width: 30,
    height: 30,
    margin: 2,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    shadowColor: '#000000',
  },
  number: {
    fontSize: 10,
    fontWeight: '900',
  },
});
