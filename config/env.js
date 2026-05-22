/**
 * Public runtime env for Expo (web + native).
 * Use EXPO_PUBLIC_* with direct process.env.* access so Metro can inline at build time.
 */

export function isDevRuntime() {
  if (process.env.NODE_ENV === 'production') return false;
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV !== 'production';
}

export function getSupabasePublicConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  return { url, anonKey, isConfigured: Boolean(url && anonKey) };
}

export function getPublicEnvSummary() {
  return {
    supabase: getSupabasePublicConfig(),
    emailApiConfigured: Boolean(
      process.env.EXPO_PUBLIC_EMAIL_API_URL ||
        process.env.EMAIL_API_URL ||
        (isDevRuntime() ? 'dev-localhost' : '')
    ),
  };
}
