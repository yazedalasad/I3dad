import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getEnv() {
  const url = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("PROJECT_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const appUrl = Deno.env.get("APP_BASE_URL") ?? Deno.env.get("SITE_URL") ?? "";
  return { url, anon, service, appUrl };
}

export function adminClient() {
  const env = getEnv();
  return createClient(env.url, env.service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(authHeader: string) {
  const env = getEnv();
  return createClient(env.url, env.anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAuthHeader(req: Request) {
  return req.headers.get("Authorization") || req.headers.get("authorization") || "";
}

export function normalizeRole(role: unknown) {
  const value = String(role || "").trim().toLowerCase();
  return value === "school_admin" ? "school_admin" : "principal";
}

export function isAdminRole(value: unknown) {
  return String(value || "").trim().toLowerCase() === "admin";
}

export async function assertAdmin(req: Request) {
  const authHeader = getAuthHeader(req);
  const user = userClient(authHeader);
  const admin = adminClient();

  const { data: authData, error: authErr } = await user.auth.getUser();
  if (authErr || !authData?.user) {
    return { ok: false as const, response: json(401, { success: false, error: "Unauthorized" }) };
  }

  let callerIsAdmin = isAdminRole(authData.user.app_metadata?.role) || isAdminRole(authData.user.user_metadata?.role);
  if (!callerIsAdmin) {
    const { data: fresh, error } = await admin.auth.admin.getUserById(authData.user.id);
    if (error) return { ok: false as const, response: json(500, { success: false, error: error.message }) };
    callerIsAdmin =
      isAdminRole(fresh.user?.app_metadata?.role) ||
      isAdminRole(fresh.user?.user_metadata?.role) ||
      String(fresh.user?.email || "").toLowerCase() === "yazedassad@gmail.com";
  }

  if (!callerIsAdmin) {
    return { ok: false as const, response: json(403, { success: false, error: "Forbidden: admin only" }) };
  }

  return { ok: true as const, user: authData.user, admin };
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildInviteLink(token: string) {
  const { appUrl } = getEnv();
  const path = `/principal/accept-invite?token=${encodeURIComponent(token)}`;
  return appUrl ? `${appUrl.replace(/\/$/, "")}${path}` : path;
}

export async function sendInvitationEmail({
  to,
  fullName,
  schoolName,
  inviteLink,
}: {
  to: string;
  fullName?: string | null;
  schoolName?: string | null;
  inviteLink: string;
}) {
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("INVITATION_EMAIL_FROM") || "I3dad <onboarding@resend.dev>";
  if (!resendKey) return { sent: false, provider: "none" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "دعوة لتفعيل حساب مدير المدرسة",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#102A68">
          <h2>دعوة لتفعيل حساب مدير المدرسة</h2>
          <p>مرحبًا ${fullName || ""}</p>
          <p>تمت دعوتك لإدارة مدرسة: <strong>${schoolName || ""}</strong>.</p>
          <p>اضغط الرابط التالي لتأكيد بياناتك وإنشاء كلمة المرور الخاصة بك:</p>
          <p><a href="${inviteLink}" style="display:inline-block;background:#1E4FBF;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">تفعيل الحساب</a></p>
          <p>إذا لم تطلب هذه الدعوة يمكنك تجاهل الرسالة.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    return { sent: false, provider: "resend", error: await response.text() };
  }

  return { sent: true, provider: "resend" };
}
