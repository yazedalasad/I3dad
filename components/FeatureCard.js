import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { font, lh, textColors } from '../src/theme/typography';

export default function FeatureCard({ feature }) {
  return (
    <View style={styles.card}>
      <FontAwesome name={feature.icon} size={40} color="#27ae60" style={styles.icon} />
      <Text style={styles.title}>{feature.title}</Text>
      <Text style={styles.description}>{feature.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 190,
    backgroundColor: '#fff',
    padding: 26,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: font('cardTitle'),
    lineHeight: lh('cardTitle'),
    fontWeight: '800',
    color: textColors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: font('body'),
    lineHeight: lh('body'),
    color: textColors.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
