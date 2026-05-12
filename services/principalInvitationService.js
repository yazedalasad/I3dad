import { supabase } from '../config/supabase';
import { emailApiPost } from './emailApiService';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export async function createPrincipalInvitation(payload) {
  const body = {
    school_id: payload.schoolId || payload.school_id,
    invited_email: normalizeEmail(payload.email || payload.invited_email),
    invited_name: payload.fullName || payload.full_name || payload.invited_name || null,
    invited_phone: payload.phone || payload.invited_phone || null,
    preferred_language: payload.preferredLanguage || payload.preferred_language || 'ar',
    role: 'principal',
    notes: payload.notes || null,
  };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  return emailApiPost('/principal-invitations', body, token);
}

export async function validatePrincipalInvitationToken(token) {
  const { data, error } = await supabase.functions.invoke('validate-principal-invitation', {
    body: { token },
  });

  if (error) return { success: false, error };
  if (data?.success === false) return { success: false, error: { message: data.error || 'Invalid invitation' }, data };
  return { success: true, data };
}

export async function sendPrincipalInvitationCodeByEmail(email, preferredLanguage = 'ar') {
  return emailApiPost('/principal-invitations/send-code', {
    email: normalizeEmail(email),
    preferred_language: preferredLanguage,
  });
}

export async function resolvePrincipalInvitationCodeByEmail({ email, invitationCode }) {
  return emailApiPost('/principal-invitations/resolve-code', {
    email: normalizeEmail(email),
    invitation_code: String(invitationCode || '').trim().toUpperCase(),
  });
}

export async function validatePrincipalInvitationEmailAndCode({ token, email, invitationCode }) {
  const { data, error } = await supabase.functions.invoke('validate-principal-invitation', {
    body: {
      token,
      email: normalizeEmail(email),
      invitation_code: String(invitationCode || '').trim(),
      validate_code: true,
    },
  });

  if (error) return { success: false, error };
  if (data?.success === false) return { success: false, error: { message: data.error || 'Invalid email or code' }, data };
  return { success: true, data };
}

export async function activatePrincipalAccount(payload) {
  const body = {
    token: payload.token,
    email: normalizeEmail(payload.email),
    full_name: String(payload.fullName || payload.full_name || '').trim(),
    phone: String(payload.phone || '').trim(),
    preferred_language: payload.preferredLanguage || payload.preferred_language || 'ar',
    password: payload.password,
    invitation_code: String(payload.invitationCode || payload.invitation_code || '').trim(),
  };

  const { data, error } = await supabase.functions.invoke('accept-principal-invitation', { body });
  if (error) return { success: false, error };
  if (data?.success === false) return { success: false, error: { message: data.error || 'Activation failed' }, data };
  return { success: true, data };
}

export async function markInvitationUsed(invitationId, principalUserId) {
  const { error } = await supabase
    .from('principal_invitations')
    .update({
      status: 'used',
      used_at: new Date().toISOString(),
      principal_user_id: principalUserId || null,
    })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) return { success: false, error };
  return { success: true };
}

export function principalInvitationLink(token, code) {
  const query = new URLSearchParams({ token: token || '' });
  if (code) query.set('code', code);
  const path = `/principal-register?${query.toString()}`;
  if (typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}${path}`;
  return path;
}

export default {
  createPrincipalInvitation,
  validatePrincipalInvitationToken,
  sendPrincipalInvitationCodeByEmail,
  resolvePrincipalInvitationCodeByEmail,
  validatePrincipalInvitationEmailAndCode,
  activatePrincipalAccount,
  markInvitationUsed,
  principalInvitationLink,
};
