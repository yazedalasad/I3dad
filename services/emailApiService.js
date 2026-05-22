const DEV_EMAIL_API_URL = 'http://localhost:8787';

function isDevRuntime() {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  return process.env.NODE_ENV !== 'production';
}

function resolveEmailApiBase() {
  const configured =
    process.env.EXPO_PUBLIC_EMAIL_API_URL || process.env.EMAIL_API_URL || '';

  if (configured) {
    return String(configured).replace(/\/$/, '');
  }

  if (isDevRuntime()) {
    return DEV_EMAIL_API_URL;
  }

  return null;
}

export function emailApiUrl(path = '') {
  const base = resolveEmailApiBase();
  if (!base) {
    throw new Error(
      'Email API is not configured for production. Set EXPO_PUBLIC_EMAIL_API_URL to your deployed email server URL.'
    );
  }
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isEmailApiConfigured() {
  return Boolean(resolveEmailApiBase());
}

export async function emailApiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(emailApiUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    return {
      success: false,
      error: { message: data?.error || `Email server request failed (${response.status})` },
      data,
    };
  }

  return { success: true, data };
}

export default {
  emailApiUrl,
  emailApiPost,
  isEmailApiConfigured,
};
