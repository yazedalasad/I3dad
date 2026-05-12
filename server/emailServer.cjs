const http = require('node:http');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { sendMail, loadEnv } = require('./smtpMailer.cjs');

loadEnv();

const port = Number(process.env.EMAIL_SERVER_PORT || 8787);
const apiToken = process.env.EMAIL_API_TOKEN || '';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:8081';

const admin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function writeJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.EMAIL_ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Request body is too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function authorized(req) {
  if (!apiToken) return true;
  const header = String(req.headers.authorization || '');
  return header === `Bearer ${apiToken}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLanguage(value) {
  const language = String(value || '').trim().toLowerCase();
  if (language.startsWith('he')) return 'he';
  if (language.startsWith('en')) return 'en';
  return 'ar';
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function randomInvitationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function buildPrincipalInviteLink(token, code) {
  const url = new URL('/principal-register', appBaseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('code', code);
  return url.toString();
}

function principalInviteCopy(language, fullName, schoolName, inviteLink, code) {
  if (language === 'he') {
    return {
      subject: 'הזמנה להפעלת חשבון מנהל בית ספר',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>הפעלת חשבון מנהל בית ספר</h2>
          <p>שלום ${fullName || ''},</p>
          <p>הוזמנת לנהל את בית הספר: <strong>${schoolName || ''}</strong>.</p>
          <p>קוד ההזמנה / בית הספר שלך:</p>
          <p style="font-size:28px;font-weight:900;letter-spacing:4px;color:#15803D">${code}</p>
          <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">הפעל חשבון</a></p>
        </div>
      `,
    };
  }

  if (language === 'en') {
    return {
      subject: 'Activate your I3dad principal account',
      html: `
        <div dir="ltr" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>Activate Principal Account</h2>
          <p>Hello ${fullName || ''},</p>
          <p>You were invited to manage: <strong>${schoolName || ''}</strong>.</p>
          <p>Your invitation / school code:</p>
          <p style="font-size:28px;font-weight:900;letter-spacing:4px;color:#15803D">${code}</p>
          <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Activate account</a></p>
        </div>
      `,
    };
  }

  return {
    subject: 'دعوة لتفعيل حساب مدير المدرسة',
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
        <h2>تفعيل حساب مدير المدرسة</h2>
        <p>مرحباً ${fullName || ''},</p>
        <p>تمت دعوتك لإدارة مدرسة: <strong>${schoolName || ''}</strong>.</p>
        <p>كود الدعوة / كود المدرسة:</p>
        <p style="font-size:28px;font-weight:900;letter-spacing:4px;color:#15803D">${code}</p>
        <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">تفعيل الحساب</a></p>
      </div>
    `,
  };
}

function resetCopy(language, code) {
  if (language === 'he') {
    return {
      subject: 'קוד איפוס הסיסמה שלך ב-I3dad',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>איפוס סיסמה</h2>
          <p>קוד האימות שלך:</p>
          <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
        </div>
      `,
    };
  }

  if (language === 'en') {
    return {
      subject: 'Your I3dad password reset code',
      html: `
        <div dir="ltr" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>Password reset</h2>
          <p>Your verification code is:</p>
          <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
        </div>
      `,
    };
  }

  return {
    subject: 'كود استرجاع كلمة المرور في I3dad',
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
        <h2>استرجاع كلمة المرور</h2>
        <p>كود التحقق الخاص بك:</p>
        <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
      </div>
    `,
  };
}

function requireAdminClient() {
  if (!admin || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env. Add EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY');
  }
}

async function requireAdminUser(req) {
  requireAdminClient();
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Unauthorized');

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) throw new Error('Unauthorized');

  const metadataRole = String(data.user.app_metadata?.role || data.user.user_metadata?.role || '').toLowerCase();
  let isAdmin = metadataRole === 'admin';
  if (!isAdmin) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();
    isAdmin = String(profile?.role || '').toLowerCase() === 'admin';
  }
  if (!isAdmin && normalizeEmail(data.user.email) === 'yazedassad@gmail.com') isAdmin = true;
  if (!isAdmin) throw new Error('Forbidden: admin only');

  return data.user;
}

async function handlePasswordReset(req, res) {
  requireAdminClient();
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!EMAIL_RE.test(email)) throw new Error('Invalid email');

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  });
  if (error) throw error;

  const code = String(data?.properties?.email_otp || '');
  if (!code) throw new Error('Could not generate recovery code');

  const language = normalizeLanguage(body.preferred_language || body.preferredLanguage || 'ar');
  const copy = resetCopy(language, code);
  await sendMail({ to: email, subject: copy.subject, html: copy.html });
  writeJson(res, 200, { success: true, provider: 'gmail-smtp', language });
}

async function handlePrincipalInvite(req, res) {
  const user = await requireAdminUser(req);
  const body = await readJson(req);
  const invitedEmail = normalizeEmail(body.invited_email || body.email);
  const schoolId = String(body.school_id || body.schoolId || '').trim();
  const preferredLanguage = normalizeLanguage(body.preferred_language || body.preferredLanguage || 'ar');

  if (!EMAIL_RE.test(invitedEmail)) throw new Error('Invalid email');
  if (!schoolId) throw new Error('school_id is required');

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .select('id, name_ar, name_he')
    .eq('id', schoolId)
    .maybeSingle();
  if (schoolError) throw schoolError;
  if (!school) throw new Error('School not found');

  await admin
    .from('principal_invitations')
    .update({ status: 'expired' })
    .eq('invited_email', invitedEmail)
    .eq('school_id', schoolId)
    .eq('status', 'pending');

  const inviteToken = randomToken();
  const invitationCode = randomInvitationCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const schoolName = school.name_ar || school.name_he || 'School';
  const invitedName = String(body.invited_name || body.full_name || body.fullName || '').trim() || invitedEmail;
  const invitedPhone = String(body.invited_phone || body.phone || '').trim() || null;

  const { data: invitation, error } = await admin
    .from('principal_invitations')
    .insert([{
      school_id: school.id,
      invited_email: invitedEmail,
      invited_name: invitedName,
      invited_phone: invitedPhone,
      preferred_language: preferredLanguage,
      role: 'principal',
      invite_token: inviteToken,
      invitation_code: invitationCode,
      status: 'pending',
      expires_at: expiresAt,
      created_by_admin_id: user.id,
      notes: body.notes || null,
      school_name: schoolName,
    }])
    .select('id, school_id, invited_email, invited_name, invited_phone, preferred_language, role, expires_at, invite_token, invitation_code, school_name')
    .maybeSingle();
  if (error) throw error;

  const inviteLink = buildPrincipalInviteLink(inviteToken, invitationCode);
  const copy = principalInviteCopy(preferredLanguage, invitedName, schoolName, inviteLink, invitationCode);
  await sendMail({ to: invitedEmail, subject: copy.subject, html: copy.html });

  writeJson(res, 200, {
    success: true,
    invitationId: invitation?.id,
    invitation: { ...invitation, invite_token: undefined },
    inviteLink,
    invitationCode,
    emailSent: true,
    emailProvider: 'gmail-smtp',
  });
}

async function findPendingInvitationByEmail(email, code) {
  requireAdminClient();
  let query = admin
    .from('principal_invitations')
    .select('id, school_id, invited_email, invited_name, invited_phone, preferred_language, role, expires_at, invite_token, invitation_code, school_name, status')
    .eq('invited_email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (code) query = query.eq('invitation_code', String(code).trim().toUpperCase());

  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] || null;
}

async function handleSendPrincipalCode(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!EMAIL_RE.test(email)) throw new Error('Invalid email');

  const invitation = await findPendingInvitationByEmail(email);
  if (!invitation) {
    writeJson(res, 404, {
      success: false,
      code: 'not_invited',
      error: 'This email is not invited as a principal. Please contact the system admin.',
    });
    return;
  }

  const language = normalizeLanguage(invitation.preferred_language || body.preferred_language || 'ar');
  const inviteLink = buildPrincipalInviteLink(invitation.invite_token, invitation.invitation_code);
  const copy = principalInviteCopy(
    language,
    invitation.invited_name,
    invitation.school_name,
    inviteLink,
    invitation.invitation_code
  );

  await sendMail({ to: email, subject: copy.subject, html: copy.html });
  writeJson(res, 200, { success: true, provider: 'gmail-smtp' });
}

async function handleResolvePrincipalCode(req, res) {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const code = String(body.invitation_code || body.invitationCode || '').trim().toUpperCase();
  if (!EMAIL_RE.test(email)) throw new Error('Invalid email');
  if (!code) throw new Error('Invitation code is required');

  const invitation = await findPendingInvitationByEmail(email, code);
  if (!invitation) {
    writeJson(res, 400, {
      success: false,
      code: 'invalid_code',
      error: 'The code is incorrect or does not belong to this email.',
    });
    return;
  }

  writeJson(res, 200, {
    success: true,
    invitation: {
      ...invitation,
      invited_email: invitation.invited_email,
    },
    token: invitation.invite_token,
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    writeJson(res, 200, { success: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    writeJson(res, 200, { success: true, service: 'i3dad-email' });
    return;
  }

  if (req.method !== 'POST') {
    writeJson(res, 404, { success: false, error: 'Not found' });
    return;
  }

  if (req.url === '/send-email' && !authorized(req)) {
    writeJson(res, 401, { success: false, error: 'Unauthorized' });
    return;
  }

  try {
    if (req.url === '/password-reset') {
      await handlePasswordReset(req, res);
      return;
    }

    if (req.url === '/principal-invitations') {
      await handlePrincipalInvite(req, res);
      return;
    }

    if (req.url === '/principal-invitations/send-code') {
      await handleSendPrincipalCode(req, res);
      return;
    }

    if (req.url === '/principal-invitations/resolve-code') {
      await handleResolvePrincipalCode(req, res);
      return;
    }

    if (req.url !== '/send-email') {
      writeJson(res, 404, { success: false, error: 'Not found' });
      return;
    }

    const body = await readJson(req);
    await sendMail({
      to: body.to,
      subject: body.subject || 'I3dad',
      html: body.html || '',
      text: body.text || '',
    });
    writeJson(res, 200, { success: true });
  } catch (error) {
    writeJson(res, 500, { success: false, error: error.message || String(error) });
  }
});

server.listen(port, () => {
  console.log(`I3dad email server listening on http://localhost:${port}`);
});
