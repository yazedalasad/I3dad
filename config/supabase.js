import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xeczbejdaqkszhnacxeh.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlY3piZWpkYXFrc3pobmFjeGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mjc2MTQsImV4cCI6MjA3NzMwMzYxNH0.1UCGPY04rj0I6rUTR60qdog990TtZ_OtCfb-yO9gkeY';

console.log('✅ Using Supabase:', supabaseUrl);

const FETCH_TIMEOUT_MS = 8000;

// ✅ Abort hung requests instead of “waiting forever”
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

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
