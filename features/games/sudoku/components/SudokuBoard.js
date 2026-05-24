import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import SudokuCell from './SudokuCell';
import { buildConflictKeySet, conflictKey, isFixedCell, isRelatedCell } from '../utils/sudokuUtils';
import { getBoardMetrics, getCellFontSize } from '../utils/sudokuTheme';

const THICK_LINE = 3;
const THIN_LINE = 1;
const THICK_COLOR = '#1E3A8A';
const THIN_COLOR = '#CBD5E1';

function SudokuGridLines({ boardSize, cellSize }) {
  const verticalLines = [];
  const horizontalLines = [];

  for (let index = 1; index < 9; index += 1) {
    const isThick = index === 3 || index === 6;
    const lineWidth = isThick ? THICK_LINE : THIN_LINE;
    const color = isThick ? THICK_COLOR : THIN_COLOR;
    const offset = cellSize * index - (isThick ? 1 : 0);

    verticalLines.push(
      <View
        key={`v-${index}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: offset,
          top: 0,
          width: lineWidth,
          height: boardSize,
          backgroundColor: color,
        }}
      />
    );

    horizontalLines.push(
      <View
        key={`h-${index}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: offset,
          left: 0,
          height: lineWidth,
          width: boardSize,
          backgroundColor: color,
        }}
      />
    );
  }

  return (
    <>
      {verticalLines}
      {horizontalLines}
    </>
  );
}

export default function SudokuBoard({
  puzzleGrid,
  userGrid,
  solutionGrid,
  selectedCell,
  onSelectCell,
  wrongCell = null,
  highlightConflicts = [],
  selectedConflictCell = null,
  boardConflicts = [],
}) {
  const { width } = useWindowDimensions();
  const { boardSize, cellSize } = useMemo(() => getBoardMetrics(width), [width]);
  const fontSize = useMemo(() => getCellFontSize(cellSize, width), [cellSize, width]);

  const conflictKeys = useMemo(() => {
    const merged = [...boardConflicts, ...highlightConflicts];
    return buildConflictKeySet(merged);
  }, [boardConflicts, highlightConflicts]);

  const selectedValue = useMemo(() => {
    if (!selectedCell) return null;
    const { row, col } = selectedCell;
    const value = Number(userGrid?.[row]?.[col]);
    if (value > 0) return value;
    return Number(puzzleGrid?.[row]?.[col]) || null;
  }, [selectedCell, userGrid, puzzleGrid]);

  if (!Array.isArray(userGrid) || userGrid.length !== 9) {
    return null;
  }

  return (
    <View style={[styles.boardShell, { width: boardSize, direction: 'ltr' }]}>
      <View
        style={[
          styles.board,
          {
            width: boardSize,
            height: boardSize,
            direction: 'ltr',
          },
        ]}
      >
        {userGrid.map((row, rowIndex) => {
          if (!Array.isArray(row) || row.length !== 9) return null;

          return (
            <View
              key={`row-${rowIndex}`}
              style={[
                styles.row,
                {
                  flexDirection: 'row',
                  height: cellSize,
                  width: boardSize,
                  direction: 'ltr',
                },
              ]}
            >
              {row.map((_, colIndex) => {
                const fixed = isFixedCell(puzzleGrid, rowIndex, colIndex);
                const displayValue = Number(userGrid?.[rowIndex]?.[colIndex]) || 0;
                const isSelected =
                  selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const isRelated = isRelatedCell(selectedCell, rowIndex, colIndex);
                const isWrong =
                  wrongCell?.row === rowIndex &&
                  wrongCell?.col === colIndex &&
                  displayValue > 0 &&
                  displayValue !== Number(solutionGrid[rowIndex][colIndex]);
                const isSameNumber =
                  !isSelected &&
                  selectedValue > 0 &&
                  displayValue > 0 &&
                  displayValue === selectedValue;
                const key = conflictKey(rowIndex, colIndex);
                const hasConflict = conflictKeys.has(key);
                const selectedConflict =
                  selectedConflictCell?.row === rowIndex &&
                  selectedConflictCell?.col === colIndex;

                return (
                  <SudokuCell
                    key={`${rowIndex}-${colIndex}`}
                    value={displayValue || null}
                    fixed={fixed}
                    selected={isSelected}
                    related={isRelated}
                    sameNumber={isSameNumber}
                    incorrect={isWrong}
                    hasConflict={hasConflict}
                    selectedConflict={selectedConflict}
                    size={cellSize}
                    fontSize={fontSize}
                    onPress={() => onSelectCell?.(rowIndex, colIndex)}
                  />
                );
              })}
            </View>
          );
        })}

        <SudokuGridLines boardSize={boardSize} cellSize={cellSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardShell: {
    alignSelf: 'center',
    marginTop: 4,
    direction: 'ltr',
  },
  board: {
    borderWidth: 3,
    borderColor: '#1E4FBF',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 0,
    direction: 'ltr',
  },
  row: {
    flexDirection: 'row',
    margin: 0,
    padding: 0,
    direction: 'ltr',
  },
});
