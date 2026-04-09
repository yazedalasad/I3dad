import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function StatPill({ label, value }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#13293B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2E5778',
  },
  label: {
    color: '#9CCFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
