// App.js
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import i18n from './i18n'; // ✅ from index.js
import { initI18n } from './i18n/config'; // ✅ from config.js

import { AuthProvider } from './contexts/AuthContext';
import ManualNavigator from './navigation/ManualNavigator';

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

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ManualNavigator />
      </AuthProvider>
    </I18nextProvider>
  );
}
