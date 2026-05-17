declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  adminClient,
  corsHeaders,
  json,
  normalizeEmail,
  normalizeLanguage,
} from "../_shared/principalInvitation.ts";
import { sendEmail } from "../_shared/emailDelivery.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resetCopy(language: string, code: string) {
  if (language === "he") {
    return {
      subject: "קוד איפוס הסיסמה שלך ב-i3dad / إعداد",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>איפוס סיסמה</h2>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
          <p>קוד האימות שלך:</p>
          <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
          <p>הקוד תקף לזמן קצר. אם לא ביקשת איפוס סיסמה, אפשר להתעלם מההודעה.</p>
        </div>
      `,
    };
  }

  if (language === "en") {
    return {
      subject: "Your i3dad / إعداد password reset code",
      html: `
        <div dir="ltr" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
          <h2>Password reset</h2>
          <p>We received a request to reset your password.</p>
          <p>Your verification code is:</p>
          <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
          <p>The code is valid for a short time. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    };
  }

  return {
    subject: "كود استرجاع كلمة المرور في i3dad / إعداد",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#064E3B">
        <h2>استرجاع كلمة المرور</h2>
        <p>وصلنا طلب لتغيير كلمة المرور الخاصة بحسابك.</p>
        <p>كود التحقق الخاص بك:</p>
        <p style="font-size:30px;font-weight:900;letter-spacing:8px;color:#15803D">${code}</p>
        <p>الكود صالح لفترة قصيرة. إذا لم تطلب تغيير كلمة المرور يمكنك تجاهل الرسالة.</p>
      </div>
    `,
  };
}

async function resolveAccountLanguage(admin: ReturnType<typeof adminClient>, email: string, fallback: string) {
  const principal = await admin
    .from("principals")
    .select("preferred_language")
    .eq("email", email)
    .maybeSingle();
  if (principal.data?.preferred_language) return normalizeLanguage(principal.data.preferred_language);

  const student = await admin
    .from("students")
    .select("preferred_language")
    .eq("email", email)
    .maybeSingle();
  if (student.data?.preferred_language) return normalizeLanguage(student.data.preferred_language);

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = users.data?.users?.find((item: { id?: string; email?: string }) => normalizeEmail(item.email) === email);
  if (user?.id) {
    const profile = await admin
      .from("user_profiles")
      .select("preferred_language")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile.data?.preferred_language) return normalizeLanguage(profile.data.preferred_language);
  }

  return normalizeLanguage(fallback);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const fallbackLanguage = normalizeLanguage(body.preferred_language || "ar");

    if (!EMAIL_RE.test(email)) return json(400, { success: false, error: "Invalid email" });

    const admin = adminClient();
    const language = await resolveAccountLanguage(admin, email, fallbackLanguage);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (linkError) return json(500, { success: false, error: linkError.message });

    const otp = String(linkData?.properties?.email_otp || "");
    if (!otp) return json(500, { success: false, error: "Could not generate recovery code" });

    const provider = String(Deno.env.get("EMAIL_PROVIDER") || "").trim().toLowerCase();
    const from = provider === "gmail"
      ? Deno.env.get("GMAIL_FROM")
      : Deno.env.get("PASSWORD_RESET_EMAIL_FROM") ||
        Deno.env.get("INVITATION_EMAIL_FROM") ||
        "i3dad / إعداد <onboarding@resend.dev>";
    const copy = resetCopy(language, otp);

    const emailResult = await sendEmail({
      from,
      to: email,
      subject: copy.subject,
      html: copy.html,
    });

    if (!emailResult.sent) {
      return json(502, { success: false, error: "error" in emailResult ? emailResult.error : "Email failed" });
    }

    return json(200, { success: true, language, provider: emailResult.provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
