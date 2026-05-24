import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SUDOKU_DIFFICULTIES } from '../data/sudokuPuzzles';

const DIFFICULTY_COLORS = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
};

export default function DifficultySelector({
  selectedDifficulty,
  onSelect,
  labels = {},
  isRTL = true,
}) {
  return (
    <View style={[styles.wrapper, isRTL && styles.rtl]}>
      {SUDOKU_DIFFICULTIES.map((difficulty) => {
        const active = selectedDifficulty === difficulty;
        return (
          <Pressable
            key={difficulty}
            onPress={() => onSelect(difficulty)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? DIFFICULTY_COLORS[difficulty] : '#EFF6FF',
                borderColor: active ? DIFFICULTY_COLORS[difficulty] : '#BFDBFE',
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive, isRTL && styles.rtlText]}>
              {labels[difficulty] || difficulty}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  rtl: {
    flexDirection: 'row-reverse',
  },
  chip: {
    minWidth: 96,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    color: '#1E3A8A',
    fontSize: 17,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rtlText: {
    writingDirection: 'rtl',
  },
});
