declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAdmin,
  buildInviteLink,
  corsHeaders,
  json,
  normalizeEmail,
  normalizeLanguage,
  randomInvitationCode,
  randomToken,
} from "../_shared/principalInvitation.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const invitedEmail = normalizeEmail(body.invited_email || body.email);
    const schoolId = String(body.school_id || body.schoolId || "").trim();
    const preferredLanguage = normalizeLanguage(body.preferred_language || body.preferredLanguage || "ar");

    if (!EMAIL_RE.test(invitedEmail)) return json(400, { success: false, error: "Invalid email" });
    if (!schoolId) return json(400, { success: false, error: "school_id is required" });

    const { data: school, error: schoolError } = await auth.admin
      .from("schools")
      .select("id, name_ar, name_he")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError) return json(500, { success: false, error: schoolError.message });
    if (!school) return json(404, { success: false, error: "School not found" });

    await auth.admin
      .from("principal_invitations")
      .update({ status: "expired" })
      .eq("invited_email", invitedEmail)
      .eq("school_id", schoolId)
      .eq("status", "pending");

    const inviteToken = randomToken();
    const invitationCode = randomInvitationCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const schoolName = school.name_ar || school.name_he || "School";
    const invitedName = String(body.invited_name || body.full_name || body.fullName || "").trim() || invitedEmail;
    const invitedPhone = String(body.invited_phone || body.phone || "").trim() || null;

    const { data: invitation, error } = await auth.admin
      .from("principal_invitations")
      .insert([
        {
          school_id: school.id,
          invited_email: invitedEmail,
          invited_name: invitedName,
          invited_phone: invitedPhone,
          preferred_language: preferredLanguage,
          role: "principal",
          invite_token: inviteToken,
          invitation_code: invitationCode,
          status: "pending",
          expires_at: expiresAt,
          created_by_admin_id: auth.user.id,
          notes: body.notes || null,
          school_name: schoolName,
        },
      ])
      .select("id, school_id, invited_email, invited_name, invited_phone, preferred_language, role, expires_at, invite_token, invitation_code, school_name")
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });

    const inviteLink = buildInviteLink(inviteToken);
    const inviteLinkWithCode = `${inviteLink}${inviteLink.includes("?") ? "&" : "?"}code=${encodeURIComponent(invitationCode)}`;
    const authInvite = await auth.admin.auth.admin.inviteUserByEmail(invitedEmail, {
      data: {
        role: "principal",
        principal_invitation_id: invitation?.id,
        principal_invitation_token: inviteToken,
        invitation_code: invitationCode,
        school_id: school.id,
        school_name: schoolName,
        preferred_language: preferredLanguage,
        full_name: invitedName,
        phone: invitedPhone,
      },
      redirectTo: inviteLinkWithCode,
    });

    const emailResult = authInvite.error
      ? { sent: false, provider: "supabase-auth-smtp", error: authInvite.error.message }
      : { sent: true, provider: "supabase-auth-smtp" };

    console.log(emailResult.sent ? "principal invite sent with supabase smtp" : "principal invite email failed", {
      to: invitedEmail,
      provider: emailResult.provider,
      error: "error" in emailResult ? emailResult.error : undefined,
    });

    return json(200, {
      success: true,
      invitationId: invitation?.id,
      invitation: { ...invitation, invite_token: undefined },
      inviteLink: inviteLinkWithCode,
      invitationCode,
      emailSent: emailResult.sent,
      emailProvider: emailResult.provider,
      emailError: "error" in emailResult ? emailResult.error : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
