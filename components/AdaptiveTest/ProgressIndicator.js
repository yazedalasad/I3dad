/**
 * PROGRESS INDICATOR COMPONENT (Improved)
 *
 * - Smooth animated progress bar
 * - Works with per-question timer (timeLeft) OR full exam timer (remainingTime)
 * - Clear stats cards (Ability / Time / Accuracy / Skipped)
 * - Time urgency colors + warning
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { thetaToPercentage } from '../../utils/irt/irtCalculations';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function getTimeColor(secondsLeft, totalSeconds) {
  if (!secondsLeft && secondsLeft !== 0) return '#94A3B8';

  // If totalSeconds not available, use absolute thresholds
  if (!totalSeconds) {
    if (secondsLeft <= 10) return '#e74c3c';
    if (secondsLeft <= 20) return '#f39c12';
    return '#27ae60';
  }

  const ratio = secondsLeft / Math.max(1, totalSeconds);
  if (ratio <= 0.2) return '#e74c3c';
  if (ratio <= 0.4) return '#f39c12';
  return '#27ae60';
}

function abilityLabelFromPercent(p) {
  if (p >= 80) return 'Excellent';
  if (p >= 60) return 'Good';
  if (p >= 40) return 'Average';
  return 'Needs Work';
}

export default function ProgressIndicator({
  current = 0,
  total = 0,

  // Ability (IRT theta)
  currentAbility = 0,
  standardError = null,

  // Timers:
  // - timeLeft: per-question countdown (seconds)
  // - remainingTime: full exam remaining time (seconds)
  timeLeft,
  remainingTime,
  totalExamTime,

  // Stats (optional)
  correctCount = 0,
  incorrectCount = 0,
  skippedCount = 0,

  // Optional label
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
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Ability %
  const abilityPercentage = useMemo(() => {
    // thetaToPercentage expected to return 0..100 (based on your utils)
    const p = thetaToPercentage(currentAbility);
    return clamp(Number(p || 0), 0, 100);
  }, [currentAbility]);

  const abilityColor = useMemo(() => {
    if (abilityPercentage >= 70) return '#27ae60';
    if (abilityPercentage >= 45) return '#f39c12';
    return '#e74c3c';
  }, [abilityPercentage]);

  const abilityLevel = useMemo(
    () => abilityLabelFromPercent(abilityPercentage),
    [abilityPercentage]
  );

  // Choose which time to show (prefer full exam remainingTime if provided)
  const shownTime = remainingTime ?? timeLeft;
  const shownTotal = remainingTime != null ? totalExamTime : null;

  const timeColor = useMemo(
    () => getTimeColor(shownTime, shownTotal),
    [shownTime, shownTotal]
  );

  const attempted = correctCount + incorrectCount + skippedCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

  const showUrgentWarning = useMemo(() => {
    // If full exam timer exists: warn under 10 minutes
    if (remainingTime != null) return remainingTime > 0 && remainingTime <= 600;
    // If per-question timer: warn under 15 seconds
    if (timeLeft != null) return timeLeft > 0 && timeLeft <= 15;
    return false;
  }, [remainingTime, timeLeft]);

  return (
    <View style={styles.container}>
      {/* Top line: subject + count */}
      <View style={styles.topRow}>
        <View style={styles.leftTop}>
          <Text style={styles.headerTitle}>Progress</Text>
          {!!subjectName && (
            <Text style={styles.subjectName} numberOfLines={1}>
              {subjectName}
            </Text>
          )}
        </View>

        <View style={styles.rightTop}>
          <Text style={styles.countText}>
            {current}/{total}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        {/* Ability */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="line-chart" size={16} color={abilityColor} />
            <Text style={styles.statTitle}>Ability</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: abilityColor }]}>
              {Math.round(abilityPercentage)}%
            </Text>
            <Text style={[styles.statLabel, { color: abilityColor }]}>{abilityLevel}</Text>

            {standardError != null && (
              <Text style={styles.subText}>
                SE: {Number(standardError).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Time */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="clock-o" size={16} color={timeColor} />
            <Text style={styles.statTitle}>Time</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: timeColor }]}>
              {shownTime == null ? '—' : formatSeconds(shownTime)}
            </Text>
            <Text style={[styles.statLabel, { color: timeColor }]}>
              {remainingTime != null ? 'Remaining' : 'This question'}
            </Text>

            {remainingTime != null && totalExamTime != null && (
              <Text style={styles.subText}>
                Total: {formatSeconds(totalExamTime)}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {/* Accuracy */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="bullseye" size={16} color="#38bdf8" />
            <Text style={styles.statTitle}>Accuracy</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Correct: {correctCount}</Text>
            <Text style={styles.subText}>Wrong: {incorrectCount}</Text>
          </View>
        </View>

        {/* Skipped */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <FontAwesome name="forward" size={16} color="#a78bfa" />
            <Text style={styles.statTitle}>Skipped</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: '#a78bfa' }]}>{skippedCount}</Text>
            <Text style={styles.statLabel}>Attempts: {attempted}</Text>
            <Text style={styles.subText}>Keep going 💪</Text>
          </View>
        </View>
      </View>

      {/* Warning */}
      {showUrgentWarning && (
        <View style={styles.timeWarning}>
          <FontAwesome name="exclamation-triangle" size={14} color="#e74c3c" />
          <Text style={styles.timeWarningText}>
            {remainingTime != null ? 'Less than 10 minutes left!' : 'Hurry up — time is almost over!'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  leftTop: { flex: 1, paddingRight: 10 },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  subjectName: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  rightTop: {
    backgroundColor: '#0b1223',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  countText: {
    color: '#E2E8F0',
    fontWeight: '900',
  },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0b1223',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#27ae60',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#0b1223',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '900',
  },
  statContent: {
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
  },
  subText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  timeWarning: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.25)',
  },
  timeWarningText: {
    color: '#e74c3c',
    fontWeight: '900',
    fontSize: 12,
  },
});
