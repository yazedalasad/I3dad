declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAuthHeader(req: Request) {
  return req.headers.get("Authorization") ||
    req.headers.get("authorization") ||
    "";
}

function isAdminRole(value: unknown) {
  return String(value || "").toLowerCase() === "admin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    // ✅ Secrets (cannot start with SUPABASE_)
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("PROJECT_ANON_KEY") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? "";

    // ✅ Optional: where the invite link should redirect after click
    // Example for web: https://your-domain.com/reset-password
    // Example for expo deep link: yourapp://reset-password
    const INVITE_REDIRECT_URL = Deno.env.get("INVITE_REDIRECT_URL") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return json(500, {
        success: false,
        error:
          "Missing env vars. Set secrets: PROJECT_URL, PROJECT_ANON_KEY, PROJECT_SERVICE_ROLE_KEY",
      });
    }

    const authHeader = getAuthHeader(req);

    // Caller JWT validation
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Service role (admin)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Verify caller is logged in
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json(401, { success: false, error: "Unauthorized: login required" });
    }
    const callerId = authData.user.id;

    // 2) Verify caller is admin. Prefer Auth metadata because this project has
    // a prevent_multi_role trigger that may keep user_profiles as student.
    let callerIsAdmin = isAdminRole(
      authData.user.app_metadata?.role || authData.user.user_metadata?.role,
    );

    if (!callerIsAdmin) {
      const { data: callerUser, error: callerUserErr } = await adminClient.auth.admin.getUserById(callerId);
      if (callerUserErr) return json(500, { success: false, error: callerUserErr.message });
      callerIsAdmin =
        isAdminRole(callerUser.user?.app_metadata?.role) ||
        isAdminRole(callerUser.user?.user_metadata?.role) ||
        String(callerUser.user?.email || "").toLowerCase() === "yazedassad@gmail.com";
    }

    if (!callerIsAdmin) {
      return json(403, { success: false, error: "Forbidden: admin only" });
    }

    // 3) Read payload
    const body: any = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.fullName ?? "").trim();
    const schoolName = String(body.schoolName ?? "").trim();
    const schoolId = body.schoolId ? String(body.schoolId).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const cityAr = body.cityAr ? String(body.cityAr).trim() : null;
    const cityHe = body.cityHe ? String(body.cityHe).trim() : null;

    if (!email.includes("@")) return json(400, { success: false, error: "Invalid email" });

    // 4) Invite principal by email (first time setup)
    const inviteOptions: any = {};
    if (INVITE_REDIRECT_URL) inviteOptions.redirectTo = INVITE_REDIRECT_URL;

    const { data: invited, error: inviteErr } = await adminClient.auth.admin
      .inviteUserByEmail(email, inviteOptions);

    let principalUserId = invited?.user?.id || "";
    let invitedByEmail = true;

    if (inviteErr || !principalUserId) {
      const list = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existingUser = list.data?.users?.find(
        (user: { email?: string; id?: string }) => String(user.email || "").toLowerCase() === email,
      );

      if (!existingUser?.id) {
        return json(400, {
          success: false,
          error: inviteErr?.message || "Failed to invite principal",
        });
      }

      principalUserId = existingUser.id;
      invitedByEmail = false;
    }

    // 5) Store role in Auth metadata. Do not insert into user_profiles here:
    // prevent_multi_role allows only one role row, and principals is the
    // manager role row for this project.
    await adminClient.auth.admin.updateUserById(principalUserId, {
      app_metadata: { role: "principal" },
      user_metadata: {
        role: "principal",
        full_name: fullName || email,
        fullName: fullName || email,
        phone,
        school_name: schoolName || "Pending setup",
        schoolName: schoolName || "Pending setup",
        school_id: schoolId,
        schoolId,
      },
    });

    // 6) Upsert principals row
    const { data: principalRow, error: principalErr } = await adminClient
      .from("principals")
      .upsert(
        {
          user_id: principalUserId,
          full_name: fullName || email,
          school_name: schoolName || "Pending setup",
          school_id: schoolId,
          phone,
          city_ar: cityAr,
          city_he: cityHe,
          is_active: true,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (principalErr) {
      return json(500, { success: false, error: principalErr.message });
    }

    return json(200, {
      success: true,
      invited: invitedByEmail,
      principalUserId,
      principal: principalRow,
      note: invitedByEmail
        ? (INVITE_REDIRECT_URL
          ? "Invite sent. User will be redirected after accepting invite."
          : "Invite sent. Consider setting INVITE_REDIRECT_URL secret for better UX.")
        : "Existing auth user linked as principal.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("create-principal error:", msg);
    return json(500, { success: false, error: msg });
  }
});
