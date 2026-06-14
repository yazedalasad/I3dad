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
  normalizeLanguage,
} from "../_shared/principalInvitation.ts";

function normalizeIsraeliId(value: unknown) {
  return String(value || "").replace(/\D/g, "").padStart(9, "0");
}

function isValidIsraeliId(value: unknown) {
  const id = normalizeIsraeliId(value);
  if (!/^\d{9}$/.test(id)) return false;
  const sum = id
    .split("")
    .map((digit, index) => {
      const n = Number(digit) * (index % 2 === 0 ? 1 : 2);
      return n > 9 ? n - 9 : n;
    })
    .reduce((a, b) => a + b, 0);
  return sum % 10 === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    const email = normalizeEmail(body.email);
    const rawIdentityNumber = String(body.identity_number || body.identityNumber || "").replace(/\D/g, "");
    const identityNumber = normalizeIsraeliId(body.identity_number || body.identityNumber);
    const fullName = String(body.full_name || body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const code = normalizeInvitationCode(body.invitation_code || body.school_code);

    if (!token) return json(400, { success: false, error: "Invitation token is required" });
    if (!email) return json(400, { success: false, error: "Email is required" });
    if (!rawIdentityNumber || !isValidIsraeliId(identityNumber)) return json(400, { success: false, error: "Invalid Israeli ID number" });
    if (!fullName) return json(400, { success: false, error: "Full name is required" });
    if (password.length < 8) return json(400, { success: false, error: "Password must be at least 8 characters" });
    if (!isValidInvitationCode(code)) return json(403, { success: false, error: "The code is incorrect or does not belong to this school.", code: "invalid_code" });

    const admin = adminClient();
    const { data: invitation, error } = await admin
      .from("principal_invitations")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });
    if (!invitation) return json(404, { success: false, error: "Invitation not found", code: "not_found" });
    if (invitation.status !== "pending") return json(409, { success: false, error: `Invitation is ${invitation.status}`, code: invitation.status });
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await admin.from("principal_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return json(410, { success: false, error: "Invitation expired", code: "expired" });
    }

    if (email !== normalizeEmail(invitation.invited_email)) {
      return json(403, { success: false, error: "This email is not invited as a principal. Please contact the system admin.", code: "invalid_email" });
    }
    if (code !== normalizeInvitationCode(invitation.invitation_code)) {
      return json(403, { success: false, error: "The code is incorrect or does not belong to this school.", code: "invalid_code" });
    }

    const preferredLanguage = normalizeLanguage(body.preferred_language || body.preferredLanguage || invitation.preferred_language || "ar");
    const claimTimestamp = new Date().toISOString();

    const { data: claimedInvitation, error: claimError } = await admin
      .from("principal_invitations")
      .update({
        status: "used",
        used_at: claimTimestamp,
      })
      .eq("id", invitation.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimError) return json(500, { success: false, error: claimError.message });
    if (!claimedInvitation) {
      return json(409, {
        success: false,
        error: "Invitation is already used or being activated",
        code: "used",
      });
    }

    const rollbackInvitationClaim = async () => {
      await admin
        .from("principal_invitations")
        .update({
          status: "pending",
          used_at: null,
          principal_user_id: null,
        })
        .eq("id", invitation.id)
        .eq("status", "used")
        .is("principal_user_id", null);
    };

    let userId = "";
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list.data?.users?.find((user: { id?: string; email?: string }) => normalizeEmail(user.email) === email);

    const authMetadata = {
      role: "principal",
      identity_number: identityNumber,
      identityNumber,
      full_name: fullName,
      fullName,
      phone: phone || null,
      school_id: invitation.school_id,
      schoolId: invitation.school_id,
      school_name: invitation.school_name,
      schoolName: invitation.school_name,
      preferred_language: preferredLanguage,
    };

    if (existing?.id) {
      userId = existing.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        app_metadata: { role: "principal" },
        user_metadata: authMetadata,
      });
      if (updateError) {
        await rollbackInvitationClaim();
        return json(500, { success: false, error: updateError.message });
      }
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: "principal" },
        user_metadata: authMetadata,
      });
      if (createError || !created?.user?.id) {
        await rollbackInvitationClaim();
        return json(500, { success: false, error: createError?.message || "Failed to create user" });
      }
      userId = created.user.id;
    }

    const profileUpdatedAt = new Date().toISOString();
    const { error: profileError } = await admin
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          role: "principal",
          full_name: fullName,
          display_name: fullName,
          updated_at: profileUpdatedAt,
        },
        { onConflict: "user_id" },
      );
    if (profileError) {
      await rollbackInvitationClaim();
      return json(500, { success: false, error: profileError.message });
    }

    const { error: principalError } = await admin
      .from("principals")
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          email,
          gmail: email,
          phone: phone || null,
          school_id: invitation.school_id,
          school_name: invitation.school_name,
          role: "principal",
          preferred_language: preferredLanguage,
          is_active: true,
          updated_at: profileUpdatedAt,
        },
        { onConflict: "user_id" },
      );

    if (principalError) {
      await rollbackInvitationClaim();
      return json(500, { success: false, error: principalError.message });
    }

    const { error: finalizeError } = await admin
      .from("principal_invitations")
      .update({
        principal_user_id: userId,
        invited_name: fullName,
        invited_phone: phone || null,
        preferred_language: preferredLanguage,
      })
      .eq("id", invitation.id)
      .eq("status", "used");

    if (finalizeError) return json(500, { success: false, error: finalizeError.message });

    return json(200, {
      success: true,
      email,
      role: "principal",
      principal_user_id: userId,
      message: "Principal account activated successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
