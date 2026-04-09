// i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

/**
 * Storage abstraction (AsyncStorage on native, localStorage on web)
 */
const LANGUAGE_STORAGE_KEY = 'app_language';

const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined'
          ? window.localStorage.getItem(key)
          : null;
      }
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      const AsyncStorage =
        require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

/**
 * Legacy big files (keep)
 */
import arLegacy from './translations/ar.json';
import heLegacy from './translations/he.json';

/**
 * Screens
 */
import arHome from './locales/ar/screens/home.json';
import heHome from './locales/he/screens/home.json';

import arAbout from './locales/ar/screens/about.json';
import heAbout from './locales/he/screens/about.json';

import arActivities from './locales/ar/screens/activities.json';
import heActivities from './locales/he/screens/activities.json';

import arAdaptiveTest from './locales/ar/screens/adaptiveTest.json';
import heAdaptiveTest from './locales/he/screens/adaptiveTest.json';

import arAuth from './locales/ar/screens/auth.json';
import heAuth from './locales/he/screens/auth.json';

import arDashboard from './locales/ar/screens/dashboard.json';
import heDashboard from './locales/he/screens/dashboard.json';

import arProfile from './locales/ar/screens/profile.json';
import heProfile from './locales/he/screens/profile.json';

import arSuccessStories from './locales/ar/screens/successStories.json';
import heSuccessStories from './locales/he/screens/successStories.json';

/**
 * ✅ StudentInsightReport (new)
 */
import arStudentInsightReport from './locales/ar/screens/StudentInsightReport.json';
import heStudentInsightReport from './locales/he/screens/StudentInsightReport.json';

/**
 * Components
 */
import arComponents from './locales/ar/components/components.json';
import heComponents from './locales/he/components/components.json';

import arComponentsAdaptiveTest from './locales/ar/components/adaptiveTest.json';
import heComponentsAdaptiveTest from './locales/he/components/adaptiveTest.json';

/**
 * Navigation
 */
import arNavigation from './locales/ar/components/navigation.json';
import heNavigation from './locales/he/components/navigation.json';

/**
 * RTL handling
 */
const setRTL = (language) => {
  const isRTL = language === 'ar' || language === 'he';

  if (Platform.OS !== 'web') {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  } else if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }
};

const normalizeLanguage = (lng) =>
  String(lng).toLowerCase() === 'he' ? 'he' : 'ar';

/**
 * Init i18n once
 */
export const initI18n = async () => {
  try {
    // Check if already initialized
    if (i18n.isInitialized) {
      console.log('✅ i18n already initialized');
      setRTL(i18n.language);
      return i18n;
    }

    console.log('🔄 Initializing i18n...');
    
    const savedLanguage = normalizeLanguage(
      (await Storage.getItem(LANGUAGE_STORAGE_KEY)) || 'ar'
    );

    console.log('📱 Saved language:', savedLanguage);

    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',

      ns: [
        'translation',
        'home',
        'about',
        'activities',
        'adaptiveTest',
        'auth',
        'dashboard',
        'profile',
        'successStories',
        'StudentInsightReport', // ✅ added
        'components',
        'componentsAdaptiveTest',
        'navigation',
      ],
      defaultNS: 'translation',

      resources: {
        ar: {
          translation: arLegacy,
          home: arHome,
          about: arAbout,
          activities: arActivities,
          adaptiveTest: arAdaptiveTest,
          auth: arAuth,
          dashboard: arDashboard,
          profile: arProfile,
          successStories: arSuccessStories,
          StudentInsightReport: arStudentInsightReport, // ✅
          components: arComponents,
          componentsAdaptiveTest: arComponentsAdaptiveTest,
          navigation: arNavigation,
        },
        he: {
          translation: heLegacy,
          home: heHome,
          about: heAbout,
          activities: heActivities,
          adaptiveTest: heAdaptiveTest,
          auth: heAuth,
          dashboard: heDashboard,
          profile: heProfile,
          successStories: heSuccessStories,
          StudentInsightReport: heStudentInsightReport, // ✅
          components: heComponents,
          componentsAdaptiveTest: heComponentsAdaptiveTest,
          navigation: heNavigation,
        },
      },

      lng: savedLanguage,
      fallbackLng: 'ar',
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });

    console.log('✅ i18n initialized successfully');
    setRTL(i18n.language);

    if (!i18n.__rtl_listener_added__) {
      i18n.__rtl_listener_added__ = true;
      i18n.on('languageChanged', (lng) => {
        const normalized = normalizeLanguage(lng);
        setRTL(normalized);
        Storage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      });
    }

    return i18n;
  } catch (e) {
    console.error('❌ initI18n failed:', e?.message || e);
    console.error('Full error:', e);
    // Return i18n anyway so app doesn't hang
    return i18n;
  }
};

export default i18n;
