declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  isValidInvitationCode,
  json,
  normalizeEmail,
  normalizeInvitationCode,
} from "../_shared/principalInvitation.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const body = await req.json();
    const cleanToken = String(body.token || "").trim();
    if (!cleanToken) return json(400, { success: false, error: "Invitation token is required" });

    const admin = adminClient();
    const { data: invitation, error } = await admin
      .from("principal_invitations")
      .select("id, school_id, school_name, invited_email, invited_name, invited_phone, preferred_language, role, invite_token, invitation_code, status, expires_at, used_at, principal_user_id")
      .eq("invite_token", cleanToken)
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });
    if (!invitation) return json(404, { success: false, error: "Invitation not found" });

    const expired = invitation.status === "pending" && new Date(invitation.expires_at).getTime() < Date.now();
    if (expired) {
      await admin.from("principal_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return json(410, { success: false, error: "Invitation expired", code: "expired" });
    }

    if (invitation.status !== "pending") {
      return json(409, { success: false, error: `Invitation is ${invitation.status}`, code: invitation.status });
    }

    if (body.validate_code) {
      const email = normalizeEmail(body.email);
      const code = normalizeInvitationCode(body.invitation_code || body.school_code);
      if (email !== normalizeEmail(invitation.invited_email)) {
        return json(403, { success: false, error: "This email is not invited as a principal.", code: "invalid_email" });
      }
      if (!isValidInvitationCode(code) || code !== normalizeInvitationCode(invitation.invitation_code)) {
        return json(403, { success: false, error: "The code is incorrect or does not belong to this school.", code: "invalid_code" });
      }
    }

    return json(200, {
      success: true,
      invitation: {
        id: invitation.id,
        school_id: invitation.school_id,
        school_name: invitation.school_name,
        invited_email: invitation.invited_email,
        invited_name: invitation.invited_name,
        invited_phone: invitation.invited_phone,
        preferred_language: invitation.preferred_language,
        role: "principal",
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
