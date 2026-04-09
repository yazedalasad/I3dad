import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { desertTheme } from '../utils/theme';

export default function HintCard({ selectedWord }) {
  const colors = desertTheme.colors;

  if (!selectedWord) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[styles.placeholder, { color: colors.ink }]}>
          اضغط على موضع كلمة داخل الشبكة ليظهر التلميح هنا
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={styles.headRow}>
        <Text style={[styles.meta, { color: colors.accentDark }]}>
          {selectedWord.length} أحرف
        </Text>
        <Text style={[styles.label, { color: colors.accentDark }]}>
          التلميح • رقم {selectedWord.number}
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.ink }]}>{selectedWord.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  headRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
  },
  label: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
  },
  hint: {
    marginTop: 10,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 31,
    textAlign: 'right',
  },
  meta: {
    fontSize: 13,
    fontWeight: '800',
  },
});
