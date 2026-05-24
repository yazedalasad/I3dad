/**
 * PROGRESS INDICATOR (exam header stats)
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { font, lh, textColors, webContent } from '../../src/theme/typography';
import { thetaToPercentage } from '../../utils/irt/irtCalculations';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function abilityColorFromPercent(p) {
  if (p >= 70) return '#22c55e';
  if (p >= 45) return '#f59e0b';
  return '#ef4444';
}

export default function ProgressIndicator({
  current = 0,
  total = 0,
  currentAbility = 0,
  standardError = null,
  correctCount = 0,
  incorrectCount = 0,
  skippedCount = 0,
  subjectName,
}) {
  const { t: rawT, i18n } = useTranslation();
  const isArabic = String(i18n.language).toLowerCase() !== 'he';

  const t = (key, fallback) => {
    const v = rawT(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  const progress = useMemo(() => {
    if (!total) return 0;
    return clamp(current / total, 0, 1);
  }, [current, total]);

  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const abilityPercentage = useMemo(() => {
    const p = thetaToPercentage(currentAbility);
    return clamp(Number(p || 0), 0, 100);
  }, [currentAbility]);

  const abilityColor = useMemo(
    () => abilityColorFromPercent(abilityPercentage),
    [abilityPercentage]
  );

  const attempted = correctCount + incorrectCount + skippedCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

  const titleText = subjectName
    ? subjectName
    : t('adaptiveTestScreen.progressTitle', isArabic ? 'التقدّم' : 'התקדמות');

  return (
    <View style={styles.wrap}>
      <View style={styles.row1}>
        <View style={styles.left}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.sub}>
            {current}/{total}
          </Text>
        </View>

        <View style={[styles.chip, { borderColor: abilityColor }]}>
          <FontAwesome name="line-chart" size={16} color={abilityColor} />
          <Text style={[styles.chipText, { color: abilityColor }]}>
            {Math.round(abilityPercentage)}%
          </Text>
          {standardError != null && (
            <Text style={styles.chipSub}>
              {t('adaptiveTestScreen.standardErrorShort', 'SE')}{' '}
              {Number(standardError).toFixed(2)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: progressWidth }]} />
      </View>

      <View style={styles.row3}>
        <View style={styles.miniStat}>
          <FontAwesome name="check-circle" size={16} color="#4ade80" />
          <Text style={styles.miniText}>
            {correctCount}{' '}
            <Text style={styles.miniMuted}>{t('results.correctShort', isArabic ? 'صحيح' : 'נכון')}</Text>
          </Text>
        </View>

        <View style={styles.dot} />

        <View style={styles.miniStat}>
          <FontAwesome name="bullseye" size={16} color="#38bdf8" />
          <Text style={styles.miniText}>
            {accuracy}% <Text style={styles.miniMuted}>{t('results.accuracyShort', isArabic ? 'دقّة' : 'דיוק')}</Text>
          </Text>
        </View>

        <View style={styles.dot} />

        <View style={styles.miniStat}>
          <FontAwesome name="forward" size={16} color="#a78bfa" />
          <Text style={styles.miniText}>
            {skippedCount}{' '}
            <Text style={styles.miniMuted}>{t('adaptiveTestScreen.skipShort', isArabic ? 'تخطي' : 'דילוג')}</Text>
          </Text>
        </View>

        <View style={styles.dot} />

        <View style={styles.miniStat}>
          <FontAwesome name="times-circle" size={16} color="#fb7185" />
          <Text style={styles.miniText}>
            {incorrectCount}{' '}
            <Text style={styles.miniMuted}>{t('results.wrongShort', isArabic ? 'خطأ' : 'שגוי')}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5ECFF',
    alignSelf: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? webContent.examMaxWidth : undefined,
    shadowColor: '#102A68',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },

  row1: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  title: {
    color: '#102A68',
    fontWeight: '900',
    fontSize: font('sectionTitle'),
    lineHeight: lh('sectionTitle'),
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sub: {
    color: textColors.muted,
    fontWeight: '800',
    fontSize: font('stat'),
    lineHeight: lh('stat'),
    marginTop: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  chipText: { fontWeight: '900', fontSize: font('body'), lineHeight: lh('body') },
  chipSub: {
    color: textColors.muted,
    fontWeight: '800',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    marginRight: 4,
  },

  track: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EAF0FF',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2455D6',
  },

  row3: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniStat: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  miniText: {
    color: '#102A68',
    fontWeight: '900',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    writingDirection: 'rtl',
  },
  miniMuted: {
    color: textColors.muted,
    fontWeight: '800',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
  },
  dot: {
    display: 'none',
  },
});
