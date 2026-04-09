import React from 'react';
import { ImageBackground, StyleSheet, Text } from 'react-native';
import { ScreenContainer, ChoiceButton, GameCard } from '../../shared';
import { desertTheme } from '../utils/theme';
import { arabicPoetPuzzleLevels } from '../data/levels';

export default function ArabicPoetPuzzleResultScreen({ route, navigation }) {
  const colors = desertTheme.colors;
  const levelId = route?.params?.levelId;
  const level = arabicPoetPuzzleLevels.find((item) => item.id === levelId) || arabicPoetPuzzleLevels[0];

  return (
    <ImageBackground
      source={require('../assets/desert-theme-bg.png')}
      resizeMode="cover"
      style={styles.flex}
    >
      <ScreenContainer scroll style={styles.transparent}>
        <GameCard style={[styles.card, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.ink }]}>أكملت المستوى الأول</Text>
          <Text style={[styles.body, { color: colors.ink }]}>{level.successMessage}</Text>
          <Text style={[styles.summary, { color: colors.accentDark }]}>{level.summary}</Text>
        </GameCard>

        <ChoiceButton
          title="العودة إلى البداية"
          description="شاشة اللعبة الرئيسية"
          onPress={() => navigation?.navigate?.('ArabicPoetPuzzleHome')}
        />
      </ScreenContainer>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'right',
  },
  summary: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
});
