import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameCard, SectionTitle } from '../shared';

export default function PatientInfoCard({ title, body }) {
  return (
    <GameCard style={styles.card}>
      <SectionTitle title={title} subtitle="נתוני המטופל והסיפור הקליני" />
      <Text style={styles.body}>{body}</Text>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1E293B',
  },
});
