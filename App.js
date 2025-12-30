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

    (async () => {
      try {
        await initI18n(); // initialize once
      } catch (e) {
        console.log('i18n init error:', e?.message || e);
      } finally {
        if (mounted) setReady(true); // never block app
      }
    })();

    return () => {
      mounted = false;
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
