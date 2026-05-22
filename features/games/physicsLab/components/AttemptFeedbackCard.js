import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AttemptFeedbackCard({ feedback, details, onRetry }) {
  if (!feedback) return null;

  const isSuccess = feedback.tone === 'success';
  const hasArrivalTime = Number.isFinite(details?.meta?.arrivalTimeSec);
  const targetTimeSec = details?.meta?.targetTimeSec;

  return (
    <View style={[styles.card, isSuccess ? styles.successCard : styles.warningCard]}>
      <Text style={styles.title}>{feedback.title}</Text>
      <Text style={styles.body}>{feedback.body}</Text>

      {details ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {hasArrivalTime ? `Travel time: ${details.meta.arrivalTimeSec} s` : `Distance: ${details.distance} m`}
          </Text>
          <Text style={styles.metaText}>
            {hasArrivalTime ? `Target time: ${targetTimeSec} s` : `Target: ${details.targetDistance} m`}
          </Text>
        </View>
      ) : null}

      {!isSuccess && onRetry ? (
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <Text style={styles.retryLabel}>Retry From Start</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  successCard: {
    backgroundColor: '#0F3B25',
    borderColor: '#1F8F54',
  },
  warningCard: {
    backgroundColor: '#3C2D10',
    borderColor: '#C98A13',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  body: {
    marginTop: 6,
    color: '#E7EEF5',
    fontSize: 16,
    lineHeight: 21,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#D3DFEA',
    fontSize: 17,
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: '#F59E0B',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  retryLabel: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
