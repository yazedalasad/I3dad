/**
 * PROGRESS INDICATOR (Ultra-Compact, No Timer)
 *
 * - Minimal height
 * - No time/timer (handled in QuestionCard)
 * - Shows: Subject + count, Ability, Accuracy, Skipped
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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

  // Ability (IRT theta)
  currentAbility = 0,
  standardError = null,

  // Stats
  correctCount = 0,
  incorrectCount = 0,
  skippedCount = 0,

  subjectName,
}) {
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

  return (
    <View style={styles.wrap}>
      {/* Row 1: Subject + count + ability chip */}
      <View style={styles.row1}>
        <View style={styles.left}>
          <Text style={styles.title} numberOfLines={1}>
            {subjectName ? subjectName : 'Progress'}
          </Text>
          <Text style={styles.sub}>
            {current}/{total}
          </Text>
        </View>

        <View style={[styles.chip, { borderColor: abilityColor }]}>
          <FontAwesome name="line-chart" size={12} color={abilityColor} />
          <Text style={[styles.chipText, { color: abilityColor }]}>
            {Math.round(abilityPercentage)}%
          </Text>
          {standardError != null && (
            <Text style={styles.chipSub}>SE {Number(standardError).toFixed(2)}</Text>
          )}
        </View>
      </View>

      {/* Row 2: Thin progress bar */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: progressWidth }]} />
      </View>

      {/* Row 3: Inline stats */}
      <View style={styles.row3}>
        <View style={styles.miniStat}>
          <FontAwesome name="bullseye" size={12} color="#38bdf8" />
          <Text style={styles.miniText}>
            {accuracy}% <Text style={styles.miniMuted}>Acc</Text>
          </Text>
        </View>

        <View style={styles.dot} />

        <View style={styles.miniStat}>
          <FontAwesome name="forward" size={12} color="#a78bfa" />
          <Text style={styles.miniText}>
            {skippedCount} <Text style={styles.miniMuted}>Skip</Text>
          </Text>
        </View>

        <View style={styles.dot} />

        <View style={styles.miniStat}>
          <FontAwesome name="times-circle" size={12} color="#fb7185" />
          <Text style={styles.miniText}>
            {incorrectCount} <Text style={styles.miniMuted}>Wrong</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#0b1223',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontWeight: '900', fontSize: 13 },
  sub: { color: '#94A3B8', fontWeight: '800', fontSize: 11, marginTop: 2 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipText: { fontWeight: '900', fontSize: 12 },
  chipSub: { color: '#94A3B8', fontWeight: '800', fontSize: 10, marginLeft: 2 },

  track: {
    marginTop: 8,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },

  row3: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniText: { color: '#E2E8F0', fontWeight: '900', fontSize: 12 },
  miniMuted: { color: '#94A3B8', fontWeight: '900', fontSize: 11 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
