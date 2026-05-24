export const normalizeAuthEmail = (email) => String(email || '').trim().toLowerCase();

export const AUTH_REQUEST_TIMEOUT_MS = 15000;
export const AUTH_INIT_TIMEOUT_MS = 12000;

export const withAuthTimeout = (promise, ms = AUTH_REQUEST_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), ms)
    ),
  ]);

export const authResult = ({ success, data = null, error = null }) => ({
  success: Boolean(success),
  data,
  error,
});
