import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { desertTheme } from '../utils/theme';
import { isHorizontalWord } from '../utils/puzzleHelpers';

function getDirectionLabel(selectedWord) {
  if (!selectedWord) return '';

  return isHorizontalWord(selectedWord)
    ? '\u0645\u0646 \u0627\u0644\u064a\u0645\u064a\u0646 \u0625\u0644\u0649 \u0627\u0644\u064a\u0633\u0627\u0631'
    : '\u0645\u0646 \u0627\u0644\u0623\u0639\u0644\u0649 \u0625\u0644\u0649 \u0627\u0644\u0623\u0633\u0641\u0644';
}

export default function HintCard({ selectedWord }) {
  const colors = desertTheme.colors;

  if (!selectedWord) {
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.headRow}>
        <View style={styles.iconWrap}>
          <FontAwesome name="lightbulb-o" size={16} color={colors.accentDark} />
        </View>
        <Text style={[styles.label, { color: colors.accentDark }]}>
          {`\u0627\u0644\u062a\u0644\u0645\u064a\u062d \u2022 \u0631\u0642\u0645 ${selectedWord.number}`}
        </Text>
      </View>

      <Text style={[styles.hint, { color: colors.ink }]}>{selectedWord.hint}</Text>

      <View style={styles.metaStack}>
        <Text style={[styles.metaLine, { color: colors.accentDark }]}>
          {`\u0639\u062f\u062f \u0627\u0644\u062d\u0631\u0648\u0641: ${selectedWord.length}`}
        </Text>
        <Text style={[styles.metaLine, { color: colors.accentDark }]}>
          {`\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0643\u0644\u0645\u0629: ${getDirectionLabel(selectedWord)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hint: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  metaStack: {
    marginTop: 10,
    gap: 4,
  },
  metaLine: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
