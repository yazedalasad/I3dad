import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ScoreChip({ label, value }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 6,
  },
  label: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
});
