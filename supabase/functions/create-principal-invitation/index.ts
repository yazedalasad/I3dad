declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  assertAdmin,
  buildInviteLink,
  corsHeaders,
  json,
  normalizeRole,
  randomToken,
  sendInvitationEmail,
} from "../_shared/principalInvitation.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const auth = await assertAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const schoolId = String(body.school_id || body.schoolId || "").trim();
    const role = normalizeRole(body.role);
    const preferredLanguage = String(body.preferred_language || body.preferredLanguage || "ar").startsWith("he") ? "he" : "ar";

    if (!EMAIL_RE.test(email)) return json(400, { success: false, error: "Invalid email" });
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
      .update({ status: "revoked" })
      .eq("email", email)
      .eq("school_id", schoolId)
      .eq("status", "pending");

    const token = randomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const schoolName = school.name_ar || school.name_he || "School";

    const { data: invitation, error } = await auth.admin
      .from("principal_invitations")
      .insert([
        {
          email,
          full_name: body.full_name || body.fullName || null,
          phone: body.phone || null,
          school_id: school.id,
          school_name: schoolName,
          role,
          preferred_language: preferredLanguage,
          invitation_token: token,
          status: "pending",
          invited_by: auth.user.id,
          expires_at: expiresAt,
          notes: body.notes || null,
        },
      ])
      .select("id, email, school_id, school_name, role, expires_at, invitation_token")
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });

    const inviteLink = buildInviteLink(token);
    const emailResult = await sendInvitationEmail({
      to: email,
      fullName: body.full_name || body.fullName || "",
      schoolName,
      inviteLink,
    });

    return json(200, {
      success: true,
      invitationId: invitation?.id,
      invitation: { ...invitation, invitation_token: undefined },
      inviteLink,
      emailSent: emailResult.sent,
      emailProvider: emailResult.provider,
      emailError: "error" in emailResult ? emailResult.error : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
