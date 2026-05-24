import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { isDevRuntime } from './env';
import { supabaseAnonKey, supabaseUrl } from './supabaseEnv';

const DEV_FALLBACK_URL = 'https://xeczbejdaqkszhnacxeh.supabase.co';
const DEV_FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlY3piZWpkYXFrc3pobmFjeGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mjc2MTQsImV4cCI6MjA3NzMwMzYxNH0.1UCGPY04rj0I6rUTR60qdog990TtZ_OtCfb-yO9gkeY';

const FETCH_TIMEOUT_MS = 12000;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfigError = !hasSupabaseConfig
  ? {
      title: 'Supabase configuration required',
      titleAr: 'إعداد Supabase مطلوب',
      titleHe: 'נדרשת הגדרת Supabase',
      message:
        'Production build is missing Supabase environment variables. Re-export with EAS production env, then redeploy.',
      messageAr:
        'نسخة الإنتاج تفتقد متغيرات بيئة Supabase. أعد التصدير ببيئة EAS للإنتاج ثم أعد النشر.',
      messageHe:
        'בגרסת הייצור חסרים משתני סביבה של Supabase. יש לבצע export מחדש עם משתני EAS לייצור ולפרסם שוב.',
      missing: [
        !supabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
        !supabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
      ].filter(Boolean),
      easCommands: [
        'eas env:exec --environment production -- npx expo export --platform web --clear',
        'eas deploy --prod',
      ],
    }
  : null;

const clientUrl = supabaseUrl || (isDevRuntime() ? DEV_FALLBACK_URL : undefined);
const clientKey = supabaseAnonKey || (isDevRuntime() ? DEV_FALLBACK_ANON_KEY : undefined);

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
};

function getNativeAuthStorage() {
  if (Platform.OS === 'web') return undefined;
  try {
    // eslint-disable-next-line global-require
    return require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    console.warn('[supabase] AsyncStorage unavailable, session may not persist on native:', error?.message);
    return undefined;
  }
}

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase =
  clientUrl && clientKey
    ? createClient(clientUrl, clientKey, {
        global: { fetch: fetchWithTimeout },
        auth: {
          storage: getNativeAuthStorage(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      supabaseConfigError?.message ||
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

/** @deprecated use hasSupabaseConfig */
export const isSupabaseConfigured = hasSupabaseConfig;

/** @deprecated use supabaseConfigError */
export function getSupabaseConfigError() {
  return supabaseConfigError;
}

if (!hasSupabaseConfig) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in bundle. ' +
      'Run: eas env:exec --environment production -- npx expo export --platform web --clear'
  );
} else if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[supabase] Client configured:', {
    url: Boolean(clientUrl),
    anonKey: Boolean(clientKey),
    platform: Platform.OS,
    webStorage: Platform.OS === 'web' ? 'localStorage' : 'AsyncStorage',
  });
}
