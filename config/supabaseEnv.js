/**
 * Isolated env reads for Metro static inlining at `expo export`.
 * Do not use env objects, destructuring, or Constants.expoConfig here.
 */
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
