import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getNumberPadMetrics } from '../utils/sudokuTheme';

export default function NumberPad({
  onNumberPress,
  inputDisabled = false,
  isRTL = true,
  numberUsage = {},
  selectedNumber = null,
  labels = {},
  boardWidth,
}) {
  const { width: screenWidth } = useWindowDimensions();
  const metrics = useMemo(
    () => getNumberPadMetrics(boardWidth || screenWidth - 32, screenWidth),
    [boardWidth, screenWidth]
  );

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={[styles.wrapper, { maxWidth: metrics.maxWidth }]}>
      <View
        style={[
          styles.grid,
          {
            gap: metrics.gap,
            maxWidth: metrics.maxWidth,
          },
          isRTL && styles.rtlRow,
        ]}
      >
        {numbers.map((number) => {
          const usedCount = Number(numberUsage?.[number]) || 0;
          const remaining = 9 - usedCount;
          const isCompleted = remaining <= 0;
          const isSelected = selectedNumber === number;
          const isDisabled = inputDisabled || isCompleted;
          const statusLabel = isCompleted
            ? labels.done || 'done'
            : `${labels.remaining || 'left'} ${remaining}`;

          return (
            <Pressable
              key={number}
              disabled={isDisabled}
              onPress={() => onNumberPress(number)}
              style={({ pressed }) => [
                styles.key,
                {
                  width: metrics.buttonSize,
                  minHeight: metrics.buttonSize + 8,
                  borderRadius: Math.min(18, metrics.buttonSize * 0.3),
                },
                isCompleted && styles.keyCompleted,
                !isCompleted && !isSelected && styles.keyAvailable,
                isSelected && !isCompleted && styles.keySelected,
                pressed && !isDisabled && !isSelected && styles.keyPressed,
              ]}
            >
              <Text
                style={[
                  styles.keyText,
                  isSelected && !isCompleted && styles.keyTextSelected,
                  isCompleted && styles.keyTextCompleted,
                ]}
              >
                {number}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  isSelected && !isCompleted && styles.statusTextSelected,
                  isCompleted && styles.statusTextCompleted,
                  isRTL && styles.rtlText,
                ]}
              >
                {statusLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 20,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  key: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  keyAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E4FBF',
  },
  keySelected: {
    backgroundColor: '#1E4FBF',
    borderColor: '#1E4FBF',
  },
  keyCompleted: {
    backgroundColor: '#E5E7EB',
    borderColor: '#CBD5E1',
    opacity: 0.85,
  },
  keyPressed: {
    backgroundColor: '#EFF6FF',
    transform: [{ scale: 0.97 }],
  },
  keyText: {
    color: '#1E4FBF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  keyTextSelected: {
    color: '#FFFFFF',
  },
  keyTextCompleted: {
    color: '#94A3B8',
  },
  statusText: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusTextSelected: {
    color: '#E0ECFF',
  },
  statusTextCompleted: {
    color: '#94A3B8',
  },
  rtlText: {
    writingDirection: 'rtl',
  },
});
