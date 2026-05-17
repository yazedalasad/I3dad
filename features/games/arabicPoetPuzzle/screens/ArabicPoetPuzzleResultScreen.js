import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet, Text } from 'react-native';

import { ScreenContainer, ChoiceButton, GameCard } from '../../shared';
import { arabicPoetPuzzleLevels } from '../data/levels';
import desertThemeBgImage from '../assets/desert-theme-bg.png';
import { desertTheme } from '../utils/theme';
import { markArabicPoetPuzzleLevelCompleted } from '../services/levelProgressService';

export default function ArabicPoetPuzzleResultScreen({ route, navigation }) {
  const colors = desertTheme.colors;
  const levelId = route?.params?.levelId;
  const studentId = route?.params?.studentId || null;
  const stats = route?.params?.result?.stats || route?.params?.stats || {};
  const level = arabicPoetPuzzleLevels.find((item) => item.id === levelId) || arabicPoetPuzzleLevels[0];
  const solvedWords = stats?.solvedWords || level.words.length;
  const totalWords = stats?.totalWords || level.words.length;
  const wrongAttempts = stats?.wrongAttempts || 0;
  const elapsedMs = stats?.elapsedMs || 0;
  const minutes = String(Math.floor(elapsedMs / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0');

  useEffect(() => {
    if (!studentId) return;
    markArabicPoetPuzzleLevelCompleted(level.id, studentId).catch(() => {});
  }, [level.id, studentId]);

  return (
    <ImageBackground source={desertThemeBgImage} resizeMode="cover" style={styles.flex}>
      <ScreenContainer scroll style={styles.transparent}>
        <GameCard style={[styles.card, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.ink }]}>{level.subtitle}</Text>
          <Text style={[styles.body, { color: colors.ink }]}>{level.successMessage}</Text>
          <Text style={[styles.stats, { color: colors.ink }]}>
            {`\u0627\u0644\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0645\u0644\u0629: ${solvedWords}/${totalWords}`}
          </Text>
          <Text style={[styles.stats, { color: colors.ink }]}>
            {`\u0627\u0644\u0623\u062e\u0637\u0627\u0621: ${wrongAttempts}`}
          </Text>
          <Text style={[styles.stats, { color: colors.ink }]}>
            {`\u0627\u0644\u0648\u0642\u062a: ${minutes}:${seconds}`}
          </Text>
          <Text style={[styles.summary, { color: colors.accentDark }]}>{level.summary}</Text>
        </GameCard>

        <ChoiceButton
          title="العودة إلى البداية"
          description="شاشة اللعبة الرئيسية"
          onPress={() => navigation?.navigate?.('ArabicPoetPuzzleHome', { studentId })}
        />
        <ChoiceButton
          title="العودة للألعاب"
          description="صفحة الألعاب التعليمية"
          variant="secondary"
          onPress={() => navigation?.navigate?.('games')}
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
    writingDirection: 'rtl',
  },
  body: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stats: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summary: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
