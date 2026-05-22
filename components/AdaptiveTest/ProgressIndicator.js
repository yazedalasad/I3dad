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
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0b1223',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? webContent.examMaxWidth : undefined,
  },

  row1: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  title: {
    color: textColors.inverse,
    fontWeight: '900',
    fontSize: font('sectionTitle'),
    lineHeight: lh('sectionTitle'),
    textAlign: 'right',
  },
  sub: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: font('stat'),
    lineHeight: lh('stat'),
    marginTop: 4,
    textAlign: 'right',
  },

  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipText: { fontWeight: '900', fontSize: font('body'), lineHeight: lh('body') },
  chipSub: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    marginRight: 4,
  },

  track: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },

  row3: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniStat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  miniText: {
    color: '#F1F5F9',
    fontWeight: '900',
    fontSize: font('body'),
    lineHeight: lh('body'),
  },
  miniMuted: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
