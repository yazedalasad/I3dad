declare const Deno: {
  env: { get(key: string): string | undefined };
};

type SendEmailPayload = {
  to: string;
  from?: string;
  subject: string;
  html: string;
};

function base64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMime({ to, from, subject, html }: Required<SendEmailPayload>) {
  const boundary = `i3dad_${crypto.randomUUID()}`;
  const text = htmlToText(html);
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

async function gmailAccessToken() {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") || "";
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN") || "";

  if (!clientId || !clientSecret || !refreshToken) {
    return { ok: false as const, error: "Gmail API secrets are missing" };
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    return { ok: false as const, error: JSON.stringify(data) };
  }

  return { ok: true as const, accessToken: String(data.access_token) };
}

async function sendWithGmail(payload: SendEmailPayload) {
  const from = payload.from || Deno.env.get("GMAIL_FROM") || "";
  if (!from) return { sent: false, provider: "gmail", error: "GMAIL_FROM is missing" };

  const token = await gmailAccessToken();
  if (!token.ok) return { sent: false, provider: "gmail", error: token.error };

  const raw = base64Url(buildMime({ ...payload, from }));
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    return { sent: false, provider: "gmail", error: await response.text() };
  }

  return { sent: true, provider: "gmail" };
}

async function sendWithResend(payload: SendEmailPayload) {
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = payload.from || Deno.env.get("INVITATION_EMAIL_FROM") || "I3dad <onboarding@resend.dev>";
  if (!resendKey) return { sent: false, provider: "none", error: "RESEND_API_KEY is missing" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    return { sent: false, provider: "resend", error: await response.text() };
  }

  return { sent: true, provider: "resend" };
}

export async function sendEmail(payload: SendEmailPayload) {
  const provider = String(Deno.env.get("EMAIL_PROVIDER") || "").trim().toLowerCase();

  if (provider === "gmail") {
    const from = payload.from || Deno.env.get("GMAIL_FROM") || "";
    const result = await sendWithGmail({ ...payload, from });
    console.log(result.sent ? "email sent with gmail" : "email failed with gmail", {
      to: payload.to,
      from,
      error: result.sent ? undefined : result.error,
    });
    return result;
  }

  const from = payload.from || Deno.env.get("INVITATION_EMAIL_FROM") || "";
  const result = await sendWithResend({ ...payload, from });
  console.log(result.sent ? "email sent with resend" : "email failed with resend", {
    to: payload.to,
    from,
    error: result.sent ? undefined : result.error,
  });
  return result;
}
