import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n/index.js';
import LevelCard from '../components/LevelCard.js';
import { bridgeLevels } from '../data/bridgeLevels.js';
import { getPhysicsBridgeProgress } from '../utils/bridgeProgressStorage.js';

const copy = {
  ar: {
    title: 'لعبة الجسر الفيزيائي',
    subtitle: 'ابنِ جسراً ثابتاً ضمن الميزانية وافتح المستويات التالية.',
    play: 'ابدأ',
    easy: 'سهل',
    medium: 'متوسط',
    locked: 'أنهِ المستوى السابق أولاً.',
  },
  he: {
    title: 'משחק גשר פיזיקלי',
    subtitle: 'בנו גשר יציב בתוך התקציב ופתחו את השלבים הבאים.',
    play: 'התחל',
    easy: 'קל',
    medium: 'בינוני',
    locked: 'סיימו קודם את השלב הקודם.',
  },
};

function getLocale(language) {
  return String(language || '').toLowerCase().startsWith('he') ? 'he' : 'ar';
}

function getText(locale, key) {
  return copy[locale][key] || copy.ar[key] || key;
}

function getLocalizedText(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.ar || value.he || '';
}

export default function PhysicsBridgeLevelSelectScreen({ navigation, navigateTo, studentId = 'anonymous-player' }) {
  const { i18n: i18nInstance } = useTranslation();
  const locale = getLocale(i18nInstance?.language || i18n.language);
  const [progressMap, setProgressMap] = useState({});

  const loadProgress = useCallback(() => {
    getPhysicsBridgeProgress(studentId)
      .then((progress) => setProgressMap(progress))
      .catch(() => setProgressMap({}));
  }, [studentId]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', loadProgress);
    loadProgress();
    return unsubscribe;
  }, [loadProgress, navigation]);

  function handleLevelPress(level, isUnlocked) {
    if (!isUnlocked) {
      Alert.alert(getText(locale, 'locked'));
      return;
    }

    // Connect this to your navigator later:
    // navigateTo('physicsBridgeGame', { levelId: level.id })
    if (typeof navigateTo === 'function') {
      navigateTo('physicsBridgeGame', { levelId: level.id, studentId });
      return;
    }

    navigation?.navigate?.('physicsBridgeGame', { levelId: level.id, studentId });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>{getText(locale, 'title')}</Text>
        <Text style={styles.subtitle}>{getText(locale, 'subtitle')}</Text>
      </View>

      <View style={styles.levelsList}>
        {bridgeLevels.map((level, index) => {
          const previousLevel = bridgeLevels[index - 1];
          const previousCompleted = index === 0 || Boolean(progressMap[previousLevel?.id]?.completed);
          const isCompleted = Boolean(progressMap[level.id]?.completed);

          return (
            <LevelCard
              key={level.id}
              title={getLocalizedText(level.title, locale)}
              difficulty={getText(locale, level.difficulty)}
              unlocked={previousCompleted}
              completed={isCompleted}
              stars={progressMap[level.id]?.stars || 0}
              actionLabel={getText(locale, 'play')}
              lockedMessage={getText(locale, 'locked')}
              isRTL
              onPress={() => handleLevelPress(level, previousCompleted)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    padding: 16,
    gap: 18,
    backgroundColor: '#F0F9FF',
  },
  heroCard: {
    backgroundColor: '#DBEAFE',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#93C5FD',
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'right',
  },
  subtitle: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
  },
  levelsList: {
    gap: 14,
  },
});
