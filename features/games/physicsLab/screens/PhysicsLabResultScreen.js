import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, GameHeader, ChoiceButton, GameCard, ScoreChip } from '../../shared';
import { physicsLabLevels } from '../data/levels';

export default function PhysicsLabResultScreen({ route, navigation }) {
  const levelId = route?.params?.levelId;
  const result = route?.params?.result || {};
  const level = physicsLabLevels.find((item) => item.id === levelId) || physicsLabLevels[0];
  const nextLevel = result?.nextLevel || null;

  return (
    <ScreenContainer scroll>
      <GameHeader title="Level Complete" subtitle={level.title} />

      <GameCard style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{result?.summary?.title || level.title}</Text>
        <Text style={styles.summaryBody}>{result?.summary?.body || level.summary}</Text>

        <View style={styles.chips}>
          <ScoreChip label="Attempts" value={result?.summary?.attemptsLabel || '0 attempts'} />
          <ScoreChip label="Interest" value={result?.analytics?.interestSignal ?? 0} />
        </View>

        <View style={styles.topSubjects}>
          {(result?.topSubjects || []).map((item) => (
            <Text key={item.subjectCode} style={styles.subjectText}>
              • {item.subjectCode}: {item.score}
            </Text>
          ))}
        </View>
      </GameCard>

      <GameCard style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>What you practiced</Text>
        <Text style={styles.feedbackText}>{level.summary}</Text>
      </GameCard>

      {nextLevel ? (
        <ChoiceButton
          title={`Next: ${nextLevel.title}`}
          description={nextLevel.subtitle}
          variant="secondary"
          onPress={() => navigation?.replace?.('PhysicsLabLevel', { levelId: nextLevel.id })}
        />
      ) : null}

      <ChoiceButton
        title="Back to Physics Lab"
        description="Choose another level"
        onPress={() => navigation?.navigate?.('PhysicsLabHome')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryBody: {
    marginTop: 8,
    color: '#334155',
    fontSize: 15,
    lineHeight: 24,
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
  subjectText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 22,
  },
  feedbackCard: {
    marginBottom: 16,
  },
  feedbackTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackText: {
    marginTop: 8,
    color: '#334155',
    fontSize: 15,
    lineHeight: 24,
  },
});
