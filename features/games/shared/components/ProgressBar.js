import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProgressBar({
  progress = 0,
  currentStep,
  totalSteps,
  label,
}) {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <View style={styles.wrapper}>
      <View style={styles.metaRow}>
        <Text style={styles.label}>{label || 'Progress'}</Text>
        {typeof currentStep === 'number' && typeof totalSteps === 'number' ? (
          <Text style={styles.steps}>
            {currentStep}/{totalSteps}
          </Text>
        ) : null}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${safeProgress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  steps: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
});
