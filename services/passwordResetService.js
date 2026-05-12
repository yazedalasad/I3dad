import { supabase } from '../config/supabase';
import { emailApiPost } from './emailApiService';

function normalizeLanguage(value) {
  const language = String(value || '').toLowerCase();
  if (language.startsWith('he')) return 'he';
  if (language.startsWith('en')) return 'en';
  return 'ar';
}

export async function sendPasswordResetCode(email, preferredLanguage = 'ar') {
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (process.env.NODE_ENV === 'test') {
    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) return { success: false, error };
    return { success: true, data: { ...data, provider: 'supabase-auth-test' } };
  }

  return emailApiPost('/password-reset', {
    email: cleanEmail,
    preferred_language: normalizeLanguage(preferredLanguage),
  });
}

export default {
  sendPasswordResetCode,
};
