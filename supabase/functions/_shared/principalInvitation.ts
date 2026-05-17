import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendEmail } from "./emailDelivery.ts";

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

export function normalizeLanguage(value: unknown) {
  const language = String(value || "").trim().toLowerCase();
  if (language.startsWith("he")) return "he";
  if (language.startsWith("en")) return "en";
  return "ar";
}

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeInvitationCode(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidInvitationCode(value: unknown) {
  const code = normalizeInvitationCode(value);
  return /^[A-Z0-9-]{6,12}$/.test(code);
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

  let callerIsAdmin = isAdminRole(authData.user.app_metadata?.role);
  if (!callerIsAdmin) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    callerIsAdmin = isAdminRole(profile?.role);
  }

  if (!callerIsAdmin) {
    const { data: fresh, error } = await admin.auth.admin.getUserById(authData.user.id);
    if (error) return { ok: false as const, response: json(500, { success: false, error: error.message }) };
    callerIsAdmin =
      isAdminRole(fresh.user?.app_metadata?.role) ||
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

export function randomInvitationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function buildInviteLink(token: string) {
  const { appUrl } = getEnv();
  const path = `/principal-register?token=${encodeURIComponent(token)}`;
  return appUrl ? `${appUrl.replace(/\/$/, "")}${path}` : path;
}

function invitationCopy(language: string, fullName: string, schoolName: string, inviteLink: string, code: string) {
  const safeName = fullName || "";
  const safeSchool = schoolName || "";
  if (language === "he") {
    return {
      dir: "rtl",
      subject: "הזמנה להפעלת חשבון מנהל בית ספר",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>הפעלת חשבון מנהל בית ספר</h2>
          <p>שלום ${safeName},</p>
          <p>הוזמנת לנהל את בית הספר: <strong>${safeSchool}</strong>.</p>
          <p>קוד ההזמנה / בית הספר שלך: <strong style="letter-spacing:2px">${code}</strong></p>
          <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">הפעל חשבון</a></p>
          <p>אם לא ביקשת הזמנה זו, אפשר להתעלם מההודעה.</p>
        </div>
      `,
    };
  }
  if (language === "en") {
    return {
      dir: "ltr",
      subject: "Activate your i3dad / إعداد principal account",
      html: `
        <div dir="ltr" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>Activate Principal Account</h2>
          <p>Hello ${safeName},</p>
          <p>You were invited to manage: <strong>${safeSchool}</strong>.</p>
          <p>Your invitation / school code: <strong style="letter-spacing:2px">${code}</strong></p>
          <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">Activate account</a></p>
          <p>If you did not request this invitation, you can ignore this message.</p>
        </div>
      `,
    };
  }
  return {
    dir: "rtl",
    subject: "دعوة لتفعيل حساب مدير المدرسة",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
        <h2>تفعيل حساب مدير المدرسة</h2>
        <p>مرحبًا ${safeName},</p>
        <p>تمت دعوتك لإدارة مدرسة: <strong>${safeSchool}</strong>.</p>
        <p>كود الدعوة / كود المدرسة: <strong style="letter-spacing:2px">${code}</strong></p>
        <p><a href="${inviteLink}" style="display:inline-block;background:#15803D;color:white;padding:12px 18px;border-radius:12px;text-decoration:none">تفعيل الحساب</a></p>
        <p>إذا لم تطلب هذه الدعوة يمكنك تجاهل الرسالة.</p>
      </div>
    `,
  };
}

export async function sendInvitationEmail({
  to,
  fullName,
  schoolName,
  inviteLink,
  preferredLanguage,
  invitationCode,
}: {
  to: string;
  fullName?: string | null;
  schoolName?: string | null;
  inviteLink: string;
  preferredLanguage?: string | null;
  invitationCode: string;
}) {
  const provider = String(Deno.env.get("EMAIL_PROVIDER") || "").trim().toLowerCase();
  const from = provider === "gmail"
    ? Deno.env.get("GMAIL_FROM")
    : Deno.env.get("INVITATION_EMAIL_FROM") || "i3dad / إعداد <onboarding@resend.dev>";

  const copy = invitationCopy(normalizeLanguage(preferredLanguage), fullName || "", schoolName || "", inviteLink, invitationCode);
  const result = await sendEmail({
    from,
    to,
    subject: copy.subject,
    html: copy.html,
  });

  if (!result.sent) {
    console.log("principal invitation email failed", {
      to,
      from,
      provider: result.provider,
      error: "error" in result ? result.error : undefined,
    });
    return result;
  }

  console.log("principal invitation email sent", { to, from, provider: result.provider });
  return result;
}
