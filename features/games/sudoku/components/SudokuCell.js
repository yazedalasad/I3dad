import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SudokuCell({
  value,
  fixed = false,
  selected = false,
  related = false,
  sameNumber = false,
  incorrect = false,
  hasConflict = false,
  selectedConflict = false,
  onPress,
  size,
  fontSize = 26,
}) {
  const displayValue = value ? String(value) : '';

  let backgroundColor = '#FFFFFF';
  if (selectedConflict) backgroundColor = '#FECACA';
  else if (hasConflict) backgroundColor = '#FEE2E2';
  else if (incorrect) backgroundColor = '#FEE2E2';
  else if (selected) backgroundColor = '#DBEAFE';
  else if (sameNumber && !selected) backgroundColor = '#E8F0FF';
  else if (related) backgroundColor = '#F1F5FF';
  else if (fixed) backgroundColor = '#EEF4FF';

  return (
    <Pressable
      onPress={onPress}
      disabled={fixed}
      style={[styles.pressable, { width: size, height: size }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.cell,
            {
              width: size,
              height: size,
              backgroundColor,
              opacity: pressed && !fixed ? 0.94 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.text,
              {
                fontSize,
                color:
                  hasConflict || selectedConflict || incorrect
                    ? '#B42318'
                    : fixed
                      ? '#102A68'
                      : '#1E4FBF',
                fontWeight: '900',
              },
            ]}
          >
            {displayValue}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    margin: 0,
    padding: 0,
  },
  cell: {
    margin: 0,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
