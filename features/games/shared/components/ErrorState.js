import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
