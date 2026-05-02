import { supabase } from '../config/supabase';

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
  const body = {
    email: String(payload.email || '').trim().toLowerCase(),
    full_name: payload.fullName || payload.full_name || null,
    phone: payload.phone || null,
    school_id: payload.schoolId || payload.school_id || null,
    preferred_language: payload.preferredLanguage || payload.preferred_language || 'ar',
    role: payload.role || 'principal',
    notes: payload.notes || null,
  };

  const { data, error } = await supabase.functions.invoke('create-principal-invitation', { body });

  if (error) return { success: false, error };
  if (data?.success === false) return { success: false, error: { message: data.error || 'Invite failed' }, data };
  return { success: true, data };
}

export async function getPrincipalInvitations() {
  const { data, error } = await supabase
    .from('principal_invitations')
    .select('id, email, full_name, phone, school_id, school_name, role, preferred_language, status, expires_at, accepted_at, created_at, notes, invitation_token')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return { success: false, error, rows: [] };
  const now = Date.now();
  return {
    success: true,
    rows: (data || []).map((row) => ({
      ...row,
      computed_status: row.status === 'pending' && new Date(row.expires_at).getTime() < now ? 'expired' : row.status,
    })),
  };
}

export async function revokePrincipalInvitation(invitationId) {
  const { error } = await supabase
    .from('principal_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) return { success: false, error };
  return { success: true };
}

export function principalInvitationLink(token) {
  const path = `/principal/accept-invite?token=${encodeURIComponent(token || '')}`;
  if (typeof window !== 'undefined' && window.location?.origin) return `${window.location.origin}${path}`;
  return path;
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
