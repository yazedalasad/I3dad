import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FeedbackPanel({ feedback }) {
  if (!feedback) return null;

  const success = feedback.tone === 'success';

  return (
    <View
      style={[
        styles.card,
        success ? styles.successCard : styles.warningCard,
      ]}
    >
      <Text style={styles.title}>{feedback.title}</Text>
      <Text style={styles.body}>{feedback.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  successCard: {
    backgroundColor: '#49663C',
    borderColor: '#6C9257',
  },
  warningCard: {
    backgroundColor: '#7B5A2C',
    borderColor: '#B68C4E',
  },
  title: {
    color: '#FFF8EB',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  body: {
    marginTop: 6,
    color: '#FFF1DB',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
});
