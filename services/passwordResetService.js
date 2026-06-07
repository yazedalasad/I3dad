import { supabase } from '../config/supabase';
import { supabaseAnonKey, supabaseUrl } from '../config/supabaseEnv';
import { emailApiPost, isEmailApiConfigured } from './emailApiService';

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase();
  if (language.startsWith('he')) return 'he';
  if (language.startsWith('en')) return 'en';
  return 'ar';
}

async function sendViaSupabaseEdgeFunction(email, preferredLanguage) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: { message: 'Supabase is not configured for password reset email delivery.' },
    };
  }

  const response = await fetch(`${String(supabaseUrl).replace(/\/$/, '')}/functions/v1/send-password-reset-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email,
      preferred_language: preferredLanguage,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    return {
      success: false,
      error: { message: data?.error || `Password reset email failed (${response.status})` },
      data,
    };
  }

  return { success: true, data: { ...data, provider: 'supabase-edge-function' } };
}

async function sendViaSupabaseAuth(email) {
  if (!supabase?.auth?.resetPasswordForEmail) {
    return {
      success: false,
      error: { message: 'Supabase auth client is unavailable.' },
    };
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { success: false, error };
  return { success: true, data: { ...data, provider: 'supabase-auth' } };
}

export async function sendPasswordResetCode(email, preferredLanguage = 'ar') {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const language = normalizeLanguage(preferredLanguage);

  if (process.env.NODE_ENV === 'test') {
    return sendViaSupabaseAuth(cleanEmail);
  }

  let apiResult = null;

  if (isEmailApiConfigured()) {
    apiResult = await emailApiPost('/password-reset', {
      email: cleanEmail,
      preferred_language: language,
    });
    if (apiResult.success) return apiResult;
  }

  const edgeResult = await sendViaSupabaseEdgeFunction(cleanEmail, language);
  if (edgeResult.success) return edgeResult;

  const authResult = await sendViaSupabaseAuth(cleanEmail);
  if (authResult.success) return authResult;

  return apiResult || edgeResult || authResult;
}

export default {
  sendPasswordResetCode,
};
