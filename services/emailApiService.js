const DEFAULT_EMAIL_API_URL = 'http://localhost:8787';

export function emailApiUrl(path = '') {
  const base = String(
    process.env.EXPO_PUBLIC_EMAIL_API_URL ||
    process.env.EMAIL_API_URL ||
    DEFAULT_EMAIL_API_URL
  ).replace(/\/$/, '');
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
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
};
