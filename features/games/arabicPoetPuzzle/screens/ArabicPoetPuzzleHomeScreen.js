import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View, Pressable } from 'react-native';
import { ScreenContainer, GameCard } from '../../shared';
import { arabicPoetPuzzleLevels } from '../data/levels';
import { desertTheme } from '../utils/theme';
import desertThemeBgImage from '../assets/desert-theme-bg.png';
import { getCompletedArabicPoetPuzzleLevels } from '../services/levelProgressService';
import { getStudentGameSessions } from '../../shared/services/gameSessionService';

export default function ArabicPoetPuzzleHomeScreen({ navigation, studentId = 'demo-student-id' }) {
  const colors = desertTheme.colors;
  const [completedLevels, setCompletedLevels] = useState([]);

  const loadCompletedLevels = useCallback(() => {
    Promise.all([
      getCompletedArabicPoetPuzzleLevels(studentId),
      getStudentGameSessions(studentId, 'arabic_poet_puzzle').catch(() => []),
    ])
      .then(([localLevels, gameSessions]) => {
        const savedLevels = (gameSessions || [])
          .filter((session) => session.status === 'completed' && session.level_id)
          .map((session) => session.level_id);
        setCompletedLevels(Array.from(new Set([...(localLevels || []), ...savedLevels])));
      })
      .catch(() => setCompletedLevels([]));
  }, [studentId]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', loadCompletedLevels);
    loadCompletedLevels();

    return unsubscribe;
  }, [loadCompletedLevels, navigation]);

  return (
    <ImageBackground
      source={desertThemeBgImage}
      resizeMode="cover"
      style={styles.flex}
    >
      <ScreenContainer scroll style={styles.transparent}>
        <View style={styles.topBanner}>
          <Pressable onPress={() => navigation?.navigate?.('games')} style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}>
            <Text style={styles.exitButtonText}>{'\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0623\u0644\u0639\u0627\u0628'}</Text>
          </Pressable>
          <Text style={styles.mainTitle}>{'\u0643\u0646\u0648\u0632 \u0627\u0644\u0623\u0644\u0641\u0627\u0638'}</Text>
          <Text style={styles.mainSubtitle}>
            {'\u0623\u0644\u0641\u0627\u0638 \u0634\u0639\u0631\u064a\u0629 \u0642\u062f\u064a\u0645\u0629 \u2022 \u0644\u0639\u0628\u0629 \u0643\u0644\u0645\u0627\u062a \u0639\u0631\u0628\u064a\u0629'}
          </Text>
        </View>

        <GameCard style={[styles.heroCard, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.ink }]}>{'\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u0644\u0639\u0628'}</Text>
          <Text style={[styles.body, { color: colors.ink }]}>
            {
              '\u0627\u062e\u062a\u0631 \u062e\u0631\u064a\u0637\u0629 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a \u0623\u062f\u0646\u0627\u0647\u060c \u062b\u0645 \u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0631\u0642\u0645 \u0627\u0644\u0643\u0644\u0645\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0628\u0643\u0629\u060c \u0648\u0627\u0642\u0631\u0623 \u0627\u0644\u062a\u0644\u0645\u064a\u062d\u060c \u062b\u0645 \u0643\u0648\u0651\u0646 \u0627\u0644\u0644\u0641\u0638 \u0627\u0644\u0635\u062d\u064a\u062d \u0648\u062b\u0628\u0651\u062a\u0647.'
            }
          </Text>
        </GameCard>

        {arabicPoetPuzzleLevels.map((level, index) => {
          const previousLevel = arabicPoetPuzzleLevels[index - 1];
          const isUnlocked = index === 0 || completedLevels.includes(previousLevel?.id);
          const isCompleted = completedLevels.includes(level.id);

          return (
            <GameCard
              key={level.id}
              style={[
                styles.levelCard,
                {
                  backgroundColor: 'rgba(232,216,191,0.94)',
                  borderColor: colors.cardBorder,
                  opacity: isUnlocked ? 1 : 0.72,
                },
              ]}
            >
              <Text style={[styles.levelTitle, { color: colors.ink }]}>{level.subtitle}</Text>
              <Text style={[styles.levelTheme, { color: colors.accentDark }]}>
                {level.themeLabel || level.theme}
              </Text>
              {isCompleted ? <Text style={styles.completedText}>مكتمل ✓</Text> : null}
              {!isUnlocked ? (
                <Text style={styles.lockedText}>
                  {`\u064a\u064f\u0641\u062a\u062d \u0628\u0639\u062f \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u0633\u062a\u0648\u0649 ${index}`}
                </Text>
              ) : null}

              <Pressable
                onPress={() =>
                  isUnlocked
                    ? navigation?.navigate?.('ArabicPoetPuzzleLevel', {
                        levelId: level.id,
                        studentId,
                      })
                    : null
                }
                disabled={!isUnlocked}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: isUnlocked ? colors.accent : '#B7A28A',
                    borderColor: isUnlocked ? colors.accentDark : '#9B866D',
                  },
                  pressed && isUnlocked && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>
                  {isUnlocked
                    ? isCompleted
                      ? `أعد لعب المستوى ${index + 1}`
                      : `\u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u0633\u062a\u0648\u0649 ${index + 1}`
                    : `\u0627\u0644\u0645\u0633\u062a\u0648\u0649 ${index + 1} \u0645\u0642\u0641\u0644`}
                </Text>
              </Pressable>
            </GameCard>
          );
        })}
      </ScreenContainer>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  topBanner: {
    marginBottom: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exitButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(247, 228, 190, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(247, 228, 190, 0.42)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 10,
  },
  exitButtonText: {
    color: '#F7E4BE',
    fontSize: 13,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  mainTitle: {
    color: '#F7E4BE',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  mainSubtitle: {
    marginTop: 4,
    color: '#E8D4AF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroCard: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  button: {
    marginTop: 14,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF8EB',
    fontSize: 19,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  levelCard: {
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  levelTheme: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lockedText: {
    marginTop: 8,
    color: '#8F5B32',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  completedText: {
    marginTop: 8,
    color: '#2F7D45',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
