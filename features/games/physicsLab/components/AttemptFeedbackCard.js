import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AttemptFeedbackCard({ feedback, details }) {
  if (!feedback) return null;

  const isSuccess = feedback.tone === 'success';

  return (
    <View style={[styles.card, isSuccess ? styles.successCard : styles.warningCard]}>
      <Text style={styles.title}>{feedback.title}</Text>
      <Text style={styles.body}>{feedback.body}</Text>

      {details ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Distance: {details.distance} m</Text>
          <Text style={styles.metaText}>Target: {details.targetDistance} m</Text>
        </View>
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
    fontSize: 14,
    lineHeight: 21,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#D3DFEA',
    fontSize: 12,
    fontWeight: '700',
  },
});
