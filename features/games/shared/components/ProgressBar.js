import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

function decodeUnicodeEscapes(value) {
  if (typeof value !== 'string' || !value.includes('\\u')) return value;

  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

export default function ProgressBar({
  progress = 0,
  currentStep,
  totalSteps,
  label,
}) {
  const safeProgress = Math.max(0, Math.min(progress, 100));
  const resolvedLabel = decodeUnicodeEscapes(label || 'Progress');

  return (
    <View style={styles.wrapper}>
      <View style={styles.metaRow}>
        <Text style={styles.label}>{resolvedLabel}</Text>
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
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  steps: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'left',
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
