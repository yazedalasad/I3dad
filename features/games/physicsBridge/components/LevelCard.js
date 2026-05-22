import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function LevelCard({
  title,
  difficulty,
  unlocked,
  completed,
  stars = 0,
  actionLabel,
  lockedMessage,
  onPress,
  isRTL,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !unlocked && styles.cardLocked,
        pressed && unlocked && styles.cardPressed,
      ]}
    >
      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <View style={styles.textBlock}>
          <Text style={[styles.title, isRTL && styles.textRtl]}>{title}</Text>
          <Text style={[styles.difficulty, isRTL && styles.textRtl]}>{difficulty}</Text>
        </View>

        <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
          <Text style={styles.badgeText}>{unlocked ? actionLabel : '🔒'}</Text>
        </View>
      </View>

      <View style={[styles.row, isRTL && styles.rowRtl]}>
        <Text style={[styles.status, isRTL && styles.textRtl]}>
          {completed ? `⭐ ${'★'.repeat(stars)}` : unlocked ? actionLabel : lockedMessage}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 14,
  },
  cardLocked: {
    opacity: 0.82,
    backgroundColor: '#EFF6FF',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  difficulty: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '700',
  },
  badge: {
    minWidth: 70,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  badgeLocked: {
    backgroundColor: '#94A3B8',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  status: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '700',
  },
  textRtl: {
    textAlign: 'right',
  },
});
