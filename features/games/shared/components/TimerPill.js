import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../utils/gameHelpers';

export default function TimerPill({ seconds = 0 }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{formatDuration(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
