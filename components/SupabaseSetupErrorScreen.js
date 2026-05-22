import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { supabaseConfigError as defaultSupabaseConfigError } from '../config/supabase';

export default function SupabaseSetupErrorScreen({ error = defaultSupabaseConfigError }) {
  const missing = error?.missing || [];
  const commands = error?.easCommands || [];

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>i3dad / إعداد</Text>
        <Text style={styles.title}>{error?.titleAr || error?.title}</Text>
        <Text style={styles.titleHe}>{error?.titleHe}</Text>

        <View style={styles.card}>
          <Text style={styles.message}>{error?.messageAr || error?.message}</Text>
          <Text style={styles.messageHe}>{error?.messageHe}</Text>
        </View>

        {missing.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Missing variables</Text>
            {missing.map((name) => (
              <Text key={name} style={styles.mono}>
                • {name}
              </Text>
            ))}
          </View>
        )}

        {commands.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fix (EAS Hosting)</Text>
            {commands.map((cmd) => (
              <Text key={cmd} style={styles.mono}>
                {cmd}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.hint}>
          {Platform.OS === 'web'
            ? 'After adding secrets, run export and deploy again.'
            : 'Configure .env locally for development, or EAS secrets for production builds.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    color: '#93C5FD',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 4,
    textAlign: 'right',
  },
  titleHe: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FBBF24',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'right',
  },
  message: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 8,
  },
  messageHe: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 18,
    textAlign: 'right',
  },
  mono: {
    color: '#BFDBFE',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 16,
    lineHeight: 18,
    marginBottom: 6,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  hint: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
