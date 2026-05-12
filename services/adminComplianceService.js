import { supabase } from '../config/supabase';
import {
  createPrincipalInvitation,
  principalInvitationLink as buildPrincipalInvitationLink,
} from './principalInvitationService';

const countFrom = async (table, query = (q) => q) => {
  const { count, error } = await query(
    supabase.from(table).select('id', { count: 'exact', head: true })
  );
  if (error) return { count: 0, error };
  return { count: count || 0, error: null };
};

export async function getAdminComplianceSnapshot() {
  const [
    students,
    principals,
    questions,
    institutions,
    programs,
    sessions,
    gameSessions,
    profiles,
    staticAssets,
    auditLogs,
  ] = await Promise.all([
    countFrom('students'),
    countFrom('principals'),
    countFrom('questions'),
    countFrom('institutions'),
    countFrom('institution_programs'),
    countFrom('test_sessions'),
    countFrom('game_sessions'),
    countFrom('user_profiles'),
    countFrom('static_assets'),
    countFrom('audit_logs'),
  ]);

  return {
    students: students.count,
    principals: principals.count,
    questions: questions.count,
    institutions: institutions.count,
    programs: programs.count,
    sessions: sessions.count,
    gameSessions: gameSessions.count,
    profiles: profiles.count,
    staticAssets: staticAssets.count,
    auditLogs: auditLogs.count,
    warnings: [
      students.error && 'students',
      principals.error && 'principals',
      questions.error && 'questions',
      institutions.error && 'institutions',
      programs.error && 'institution_programs',
      sessions.error && 'test_sessions',
      gameSessions.error && 'game_sessions',
      profiles.error && 'user_profiles',
      staticAssets.error && 'static_assets',
      auditLogs.error && 'audit_logs',
    ].filter(Boolean),
  };
}

export async function createPrincipalRegistrationRequest(payload) {
  const row = {
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone || null,
    school_name: payload.schoolName,
    school_id: payload.schoolId || null,
    notes: payload.notes || null,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('principal_registration_requests')
    .insert([row])
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, data };
}

export async function invitePrincipalByEmail(payload) {
  return createPrincipalInvitation(payload);
}

export async function getPrincipalInvitations() {
  const { data, error } = await supabase
    .from('principal_invitations')
    .select('id, invited_email, invited_name, invited_phone, school_id, school_name, role, preferred_language, status, expires_at, used_at, created_at, notes, invite_token, invitation_code')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return { success: false, error, rows: [] };
  const now = Date.now();
  return {
    success: true,
    rows: (data || []).map((row) => ({
      ...row,
      email: row.invited_email,
      full_name: row.invited_name,
      phone: row.invited_phone,
      invitation_token: row.invite_token,
      computed_status: row.status === 'pending' && new Date(row.expires_at).getTime() < now ? 'expired' : row.status,
    })),
  };
}

export async function revokePrincipalInvitation(invitationId) {
  const { error } = await supabase
    .from('principal_invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) return { success: false, error };
  return { success: true };
}

export function principalInvitationLink(token) {
  return buildPrincipalInvitationLink(token);
}

export async function updateUserRole({ userId, role }) {
  const payload = {
    user_id: userId,
    role,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, data };
}

export async function recordAdminAuditEvent({ actorId, action, entityType, entityId, metadata }) {
  const { error } = await supabase.from('audit_logs').insert([
    {
      actor_id: actorId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
    },
  ]);

  return { success: !error, error };
}

export default {
  getAdminComplianceSnapshot,
  createPrincipalRegistrationRequest,
  invitePrincipalByEmail,
  getPrincipalInvitations,
  revokePrincipalInvitation,
  principalInvitationLink,
  updateUserRole,
  recordAdminAuditEvent,
};
