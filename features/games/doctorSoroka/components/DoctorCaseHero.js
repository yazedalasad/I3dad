import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameCard, SceneImage } from '../shared';

export default function DoctorCaseHero({ image, title, subtitle }) {
  return (
    <GameCard style={styles.card}>
      <SceneImage source={image} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 12,
  },
  content: {
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
});
