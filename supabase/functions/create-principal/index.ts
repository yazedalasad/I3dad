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

    // 2) Verify caller is admin
    const { data: callerProfile, error: roleErr } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (roleErr) return json(500, { success: false, error: roleErr.message });
    if (!callerProfile || callerProfile.role !== "admin") {
      return json(403, { success: false, error: "Forbidden: admin only" });
    }

    // 3) Read payload
    const body: any = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.fullName ?? "").trim();
    const schoolName = String(body.schoolName ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const cityAr = body.cityAr ? String(body.cityAr).trim() : null;
    const cityHe = body.cityHe ? String(body.cityHe).trim() : null;

    if (!email.includes("@")) return json(400, { success: false, error: "Invalid email" });
    if (!fullName) return json(400, { success: false, error: "Full name is required" });
    if (!schoolName) return json(400, { success: false, error: "School name is required" });

    // 4) Invite principal by email (first time setup)
    const inviteOptions: any = {};
    if (INVITE_REDIRECT_URL) inviteOptions.redirectTo = INVITE_REDIRECT_URL;

    const { data: invited, error: inviteErr } = await adminClient.auth.admin
      .inviteUserByEmail(email, inviteOptions);

    if (inviteErr || !invited?.user?.id) {
      return json(400, {
        success: false,
        error: inviteErr?.message || "Failed to invite principal",
      });
    }

    const principalUserId = invited.user.id;

    // 5) Upsert role to principal
    const { error: profileErr } = await adminClient
      .from("user_profiles")
      .upsert(
        { user_id: principalUserId, role: "principal" },
        { onConflict: "user_id" },
      );

    if (profileErr) {
      return json(500, { success: false, error: profileErr.message });
    }

    // 6) Upsert principals row
    const { data: principalRow, error: principalErr } = await adminClient
      .from("principals")
      .upsert(
        {
          user_id: principalUserId,
          full_name: fullName,
          school_name: schoolName,
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
      invited: true,
      principalUserId,
      principal: principalRow,
      note: INVITE_REDIRECT_URL
        ? "Invite sent. User will be redirected after accepting invite."
        : "Invite sent. Consider setting INVITE_REDIRECT_URL secret for better UX.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("create-principal error:", msg);
    return json(500, { success: false, error: msg });
  }
});
