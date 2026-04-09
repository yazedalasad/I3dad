import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ScoreChip, TimerPill } from '../shared';

export default function DoctorStatusBar({ seconds = 0, currentStep = 0, totalSteps = 0 }) {
  return (
    <View style={styles.row}>
      <TimerPill seconds={seconds} />
      <ScoreChip label="שלב" value={`${currentStep}/${totalSteps}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
