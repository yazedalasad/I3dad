import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <View style={styles.wrapper}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
});
