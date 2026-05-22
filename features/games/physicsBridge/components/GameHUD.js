import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function GameHUD({
  title,
  budgetUsed,
  maxBudget,
  requiredStability,
  currentStability,
  isRTL,
  labels,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{title}</Text>
        </View>

        <View style={styles.coinBadge}>
          <Text style={styles.coinIcon}>🪙</Text>
          <Text style={styles.coinText}>
            {budgetUsed} / {maxBudget}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, isRTL && styles.statsRowRtl]}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{labels.requiredStability}</Text>
          <Text style={styles.statValue}>{requiredStability}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{labels.currentStability}</Text>
          <Text style={styles.statValue}>{currentStability}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{labels.budget}</Text>
          <Text style={styles.statValue}>
            {budgetUsed} / {maxBudget}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  levelBadge: {
    flex: 1,
    maxWidth: 240,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 3,
    borderColor: '#FDE68A',
    alignItems: 'center',
    shadowColor: '#7C2D12',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  levelBadgeText: {
    color: '#FFFDF5',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  coinBadge: {
    minWidth: 132,
    backgroundColor: '#243B73',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 2,
    borderColor: '#A5B4FC',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coinIcon: {
    fontSize: 16,
  },
  coinText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsRowRtl: {
    flexDirection: 'row-reverse',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  statLabel: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statValue: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
});
