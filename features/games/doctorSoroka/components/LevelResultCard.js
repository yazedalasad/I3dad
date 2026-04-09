import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameCard, SectionTitle, ScoreChip } from '../shared';

export default function LevelResultCard({ summary }) {
  return (
    <GameCard>
      <SectionTitle
        title="סיכום רפואי"
        subtitle="כך נראתה החשיבה שלך בשלב הזה"
      />

      <Text style={styles.text}>{summary?.recommendationText}</Text>

      <View style={styles.chips}>
        <ScoreChip label="אות עניין" value={summary?.interestSignal ?? 0} />
        <ScoreChip label="דיוק" value={`${summary?.accuracy ?? 0}%`} />
        <ScoreChip label="תחום מוביל" value={summary?.dominantSubject || 'medicine'} />
      </View>

      <View style={styles.topSubjects}>
        {(summary?.topSubjects || []).map((item) => (
          <Text key={item.subjectCode} style={styles.subjectRow}>
            • {item.subjectCode}: {item.score}
          </Text>
        ))}
      </View>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1E293B',
  },
  chips: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  topSubjects: {
    marginTop: 14,
  },
  subjectRow: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
});
