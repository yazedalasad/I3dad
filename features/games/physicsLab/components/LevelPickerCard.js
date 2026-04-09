import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LevelPickerCard({
  title,
  subtitle,
  imageSource,
  accentColor,
  onPress,
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={imageSource} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={[styles.tag, { backgroundColor: accentColor || '#3FA7FF' }]}>
          <Text style={styles.tagText}>Open Level</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E2233',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#26506E',
    marginBottom: 16,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#0B1622',
  },
  content: {
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#B8D7F3',
    fontSize: 14,
    lineHeight: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
