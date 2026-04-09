import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ObjectSprite({ type = 'ball', size = 42 }) {
  if (type === 'box') {
    return <View style={[styles.box, { width: size, height: size }]} />;
  }

  if (type === 'capsule') {
    return <View style={[styles.capsule, { width: size * 1.55, height: size * 0.78, borderRadius: size }]} />;
  }

  return <View style={[styles.ball, { width: size, height: size, borderRadius: size / 2 }]} />;
}

const sharedFill = {
  backgroundColor: '#D9E3EC',
  borderWidth: 2,
  borderColor: '#1C2A38',
};

const styles = StyleSheet.create({
  ball: {
    ...sharedFill,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: -4, height: -4 },
  },
  box: {
    ...sharedFill,
    borderRadius: 8,
  },
  capsule: {
    ...sharedFill,
  },
});
