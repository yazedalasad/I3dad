import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer, GameCard } from '../../shared';
import LevelSelector from '../components/LevelSelector';
import { getSudokuUnlockedLevel } from '../services/levelProgressService';
import {
  getSudokuHintsLabel,
  getSudokuLevelLabel,
  getSudokuLocale,
  getSudokuMistakeRuleLabel,
  getSudokuText,
} from '../utils/sudokuCopy';
import { isSudokuLevelUnlocked, normalizeSudokuLevel } from '../utils/sudokuLevels';

export default function SudokuHomeScreen({ navigation, studentId = null }) {
  const { i18n } = useTranslation();
  const locale = getSudokuLocale(i18n.language);
  const isRTL = locale === 'ar' || locale === 'he';
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [lockMessage, setLockMessage] = useState(null);

  const labels = useMemo(
    () => ({
      locked: getSudokuText(i18n.language, 'locked'),
    }),
    [i18n.language]
  );

  const loadUnlockedLevel = useCallback(async () => {
    const nextUnlocked = await getSudokuUnlockedLevel(studentId);
    setUnlockedLevel(normalizeSudokuLevel(nextUnlocked));
  }, [studentId]);

  useEffect(() => {
    loadUnlockedLevel();
    const unsubscribe = navigation?.addListener?.('focus', loadUnlockedLevel);
    return unsubscribe;
  }, [loadUnlockedLevel, navigation]);

  function handleLevelPress(level) {
    if (!isSudokuLevelUnlocked(level, unlockedLevel)) {
      setLockMessage(getSudokuText(i18n.language, 'unlockPreviousLevel'));
      return;
    }

    setLockMessage(null);
    navigation?.navigate?.('SudokuGame', {
      level,
      studentId,
    });
  }

  function handleLockedPress() {
    setLockMessage(getSudokuText(i18n.language, 'unlockPreviousLevel'));
  }

  return (
    <ScreenContainer scroll>
      <View style={[styles.hero, isRTL && styles.rtl]}>
        <Pressable
          onPress={() => navigation?.navigate?.('games')}
          style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}
        >
          <Text style={styles.exitText}>{getSudokuText(i18n.language, 'backToGames')}</Text>
        </Pressable>
        <Text style={[styles.title, isRTL && styles.rtlText]}>{getSudokuText(i18n.language, 'title')}</Text>
        <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{getSudokuText(i18n.language, 'subtitle')}</Text>
      </View>

      <GameCard style={styles.card}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
          {getSudokuText(i18n.language, 'selectLevel')}
        </Text>
        <LevelSelector
          unlockedLevel={unlockedLevel}
          onSelect={handleLevelPress}
          onLockedPress={handleLockedPress}
          labels={labels}
          isRTL={isRTL}
          getLevelLabel={(level) => getSudokuLevelLabel(i18n.language, level)}
          getHintsLabel={(count) => getSudokuHintsLabel(i18n.language, count)}
          getMistakeRuleLabel={(hasLimit) => getSudokuMistakeRuleLabel(i18n.language, hasLimit)}
        />
        {lockMessage ? (
          <Text style={[styles.lockMessage, isRTL && styles.rtlText]}>{lockMessage}</Text>
        ) : null}
      </GameCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: 16,
    gap: 8,
  },
  rtl: {
    alignItems: 'flex-end',
  },
  exitButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  exitText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
    color: '#475569',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  lockMessage: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
