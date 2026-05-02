declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, corsHeaders, json, normalizeRole } from "../_shared/principalInvitation.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    const fullName = String(body.full_name || body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");

    if (!token) return json(400, { success: false, error: "Invitation token is required" });
    if (!fullName) return json(400, { success: false, error: "Full name is required" });
    if (password.length < 8) return json(400, { success: false, error: "Password must be at least 8 characters" });

    const admin = adminClient();
    const { data: invitation, error } = await admin
      .from("principal_invitations")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });
    if (!invitation) return json(404, { success: false, error: "Invitation not found" });
    if (invitation.status !== "pending") return json(409, { success: false, error: `Invitation is ${invitation.status}` });
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await admin.from("principal_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return json(410, { success: false, error: "Invitation expired" });
    }

    const email = String(invitation.email || "").trim().toLowerCase();
    const role = normalizeRole(invitation.role);
    const preferredLanguage = String(body.preferred_language || body.preferredLanguage || invitation.preferred_language || "ar").startsWith("he") ? "he" : "ar";

    let userId = "";
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list.data?.users?.find((user: { id?: string; email?: string }) => String(user.email || "").toLowerCase() === email);

    if (existing?.id) {
      userId = existing.id;
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: {
          role,
          full_name: fullName,
          fullName,
          phone: phone || null,
          school_id: invitation.school_id,
          schoolId: invitation.school_id,
          school_name: invitation.school_name,
          schoolName: invitation.school_name,
          preferred_language: preferredLanguage,
        },
      });
      if (updateError) return json(500, { success: false, error: updateError.message });
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: {
          role,
          full_name: fullName,
          fullName,
          phone: phone || null,
          school_id: invitation.school_id,
          schoolId: invitation.school_id,
          school_name: invitation.school_name,
          schoolName: invitation.school_name,
          preferred_language: preferredLanguage,
        },
      });
      if (createError || !created?.user?.id) {
        return json(500, { success: false, error: createError?.message || "Failed to create user" });
      }
      userId = created.user.id;
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
          role,
          preferred_language: preferredLanguage,
          is_active: true,
        },
        { onConflict: "user_id" },
      );

    if (principalError) return json(500, { success: false, error: principalError.message });

    await admin
      .from("principal_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        full_name: fullName,
        phone: phone || null,
        preferred_language: preferredLanguage,
      })
      .eq("id", invitation.id)
      .eq("status", "pending");

    return json(200, {
      success: true,
      email,
      role,
      message: "Invitation accepted. Sign in with the email and password just created.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
