import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LevelPickerCard({
  title,
  levelNumber,
  imageSource,
  accentColor,
  onPress,
  disabled = false,
  completed = false,
  lockedLabel = '',
  statusLabel = '',
  actionLabel = 'Start',
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.card, disabled && styles.cardDisabled, pressed && !disabled && styles.pressed]}
    >
      <Image source={imageSource} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <View style={[styles.levelBadge, { backgroundColor: accentColor || '#3FA7FF' }]}>
            <Text style={styles.levelBadgeText}>Level {levelNumber}</Text>
          </View>
          <View style={[styles.statusBadge, completed && styles.statusCompleted, disabled && styles.statusLocked]}>
            <Text style={[styles.statusText, disabled && styles.statusLockedText]}>{statusLabel}</Text>
          </View>
        </View>

        {disabled && lockedLabel ? <Text style={styles.lockedText}>{lockedLabel}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {!disabled ? <Text style={styles.actionText}>{actionLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E2233',
    width: 260,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1D4ED8',
    marginBottom: 12,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  cardDisabled: {
    opacity: 0.7,
    borderColor: '#94A3B8',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#0B1622',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(8, 24, 38, 0.76)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#DBEAFE',
  },
  statusCompleted: {
    backgroundColor: '#BBF7D0',
  },
  statusLocked: {
    backgroundColor: '#E2E8F0',
  },
  statusText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '900',
  },
  statusLockedText: {
    color: '#475569',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lockedText: {
    color: '#FFD7A3',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionText: {
    marginTop: 8,
    color: '#BAE6FD',
    fontSize: 13,
    fontWeight: '900',
  },
});
