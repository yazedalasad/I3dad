import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { desertTheme } from '../utils/theme';

export default function WordListChips({ words = [], solvedMap = {} }) {
  const colors = desertTheme.colors;

  return (
    <View style={styles.wrap}>
      {words.map((word) => {
        const solved = solvedMap[word.id];

        return (
          <View
            key={word.id}
            style={[
              styles.chip,
              {
                backgroundColor: solved ? colors.solved : colors.chipBg,
                borderColor: solved ? '#6E8F60' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.chipText }]}>
              {word.number}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'center',
  },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
