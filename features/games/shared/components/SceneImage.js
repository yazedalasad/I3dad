import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function SceneImage({ source, style, resizeMode = 'cover' }) {
  if (!source) {
    return <View style={[styles.placeholder, style]} />;
  }

  return <Image source={source} style={[styles.image, style]} resizeMode={resizeMode} />;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  placeholder: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
});
