import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import ar from './translations/ar.json';
import he from './translations/he.json';

// Function to set RTL based on language (only for native platforms)
const setRTL = (language) => {
  const isRTL = language === 'ar' || language === 'he';
  
  // Only use I18nManager on native platforms (iOS/Android)
  if (Platform.OS !== 'web') {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      console.log(`RTL set to ${isRTL} for language: ${language}`);
    }
  } else {
    // For web, set the HTML dir attribute
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', language);
      console.log(`Web RTL set to ${isRTL} for language: ${language}`);
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      ar: { translation: ar },
      he: { translation: he },
    },
    lng: 'ar', // Default language
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disable suspense to avoid issues
    },
  });

// Set initial RTL for default language
setRTL(i18n.language);

// Handle language changes and RTL
i18n.on('languageChanged', (lng) => {
  console.log('🌍 i18n languageChanged event:', lng);
  setRTL(lng);
});

console.log('✅ i18n initialized with language:', i18n.language);

export default i18n;
