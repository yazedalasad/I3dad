// App.js
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

if (Platform.OS === 'web') {
  require('./app.web.css');
}
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from './i18n'; // ✅ from index.js
import { initI18n } from './i18n/config'; // ✅ from config.js
import { FONT_SCALE_STORAGE_KEY, setFontScale } from './src/theme/typography';
import { installSafeWebFontLoading, preloadWebIconFonts } from './utils/safeWebFonts';

import SupabaseSetupErrorScreen from './components/SupabaseSetupErrorScreen';
import { hasSupabaseConfig, supabaseConfigError } from './config/supabase';
import { AuthProvider } from './contexts/AuthContext';
import ManualNavigator from './navigation/ManualNavigator';

if (Platform.OS === 'web') {
  installSafeWebFontLoading();
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    (async () => {
      try {
        console.log('🚀 App starting...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && !ready) {
            console.warn('⚠️ i18n initialization timeout - proceeding anyway');
            setReady(true);
          }
        }, 5000); // 5 second timeout

        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            const savedScale = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
            if (savedScale === 'large') setFontScale('large');
          }
          await preloadWebIconFonts();
        }
        await initI18n(); // initialize once
        console.log('✅ App initialization complete');
      } catch (e) {
        console.error('❌ i18n init error:', e?.message || e);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) setReady(true); // never block app
      }
    })();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!hasSupabaseConfig) {
    return <SupabaseSetupErrorScreen error={supabaseConfigError} />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <AuthProvider>
          <View style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
            <ManualNavigator />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: '#F6F8FF',
  },
  webRoot: {
    width: '100vw',
    overflowX: 'hidden',
  },
});
