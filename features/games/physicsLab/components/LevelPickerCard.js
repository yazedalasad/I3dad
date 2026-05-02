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
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.card, disabled && styles.cardDisabled, pressed && !disabled && styles.pressed]}
    >
      <Image source={imageSource} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={[styles.levelBadge, { backgroundColor: accentColor || '#3FA7FF' }]}>
          <Text style={styles.levelBadgeText}>Level {levelNumber}</Text>
        </View>
        {completed ? <Text style={styles.completedText}>Completed ✓</Text> : null}
        {disabled && lockedLabel ? <Text style={styles.lockedText}>{lockedLabel}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E2233',
    width: 260,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26506E',
    marginBottom: 12,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  cardDisabled: {
    opacity: 0.58,
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
  levelBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  completedText: {
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
  },
  lockedText: {
    color: '#FFD7A3',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
});
