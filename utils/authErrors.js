function readMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error.trim();
  return String(error.message || error.error_description || error.msg || '').trim();
}

function readCode(error) {
  return String(error?.code || error?.status || error?.statusCode || '').trim();
}

function includesAny(text, fragments) {
  const normalized = String(text || '').toLowerCase();
  return fragments.some((fragment) => normalized.includes(String(fragment).toLowerCase()));
}

const LOGIN_RULES = [
  {
    match: ({ code, message }) =>
      code === 'STUDENT_ID_EXISTS' || message === 'STUDENT_ID_EXISTS',
    key: 'auth.signup.errors.studentIdExists',
  },
  {
    match: ({ message }) => includesAny(message, ['invalid login credentials', 'invalid credentials']),
    key: 'auth.login.errors.invalidCredentials',
  },
  {
    match: ({ message }) => includesAny(message, ['email not confirmed', 'email confirmation']),
    key: 'auth.login.errors.emailNotConfirmed',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'request timed out',
        'timeout',
        'timed out',
        'aborted',
      ]),
    key: 'auth.login.errors.timeout',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'failed to fetch',
        'network request failed',
        'network error',
        'load failed',
        'fetch failed',
        'networkerror',
      ]),
    key: 'auth.login.errors.network',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'too many requests',
        'rate limit',
        '429',
        'over_request_rate_limit',
      ]),
    key: 'auth.login.errors.tooManyRequests',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'no session returned after login',
        'session missing',
        'auth session missing',
      ]),
    key: 'auth.login.errors.sessionMissing',
  },
  {
    match: ({ message }) =>
      includesAny(message, ['auth operation already in progress', 'already in progress']),
    key: 'auth.login.errors.inProgress',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'user banned',
        'account disabled',
        'user is banned',
        'not authorized',
      ]),
    key: 'auth.login.errors.accountDisabled',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'invalid api key',
        'jwt',
        'supabase is not configured',
        'supabase url',
        'anon key',
      ]),
    key: 'auth.login.errors.serviceUnavailable',
  },
];

const SIGNUP_RULES = [
  {
    match: ({ code, message }) =>
      code === 'STUDENT_ID_EXISTS' ||
      message === 'STUDENT_ID_EXISTS' ||
      includesAny(message, [
        'student with this identity number already exists',
        'duplicate key value violates unique constraint',
        'students_student_id_key',
      ]),
    key: 'auth.signup.errors.studentIdExists',
  },
  {
    match: ({ message }) =>
      includesAny(message, ['already registered', 'user already registered', 'email already']),
    key: 'auth.signup.errors.emailExists',
  },
  {
    match: ({ message }) => message === 'INVALID_STUDENT_ID',
    key: 'auth.signup.errors.invalidStudentId',
  },
  {
    match: ({ message }) =>
      includesAny(message, ['password', 'weak password', 'password should']),
    key: 'auth.signup.errors.weakPassword',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'request timed out',
        'timeout',
        'timed out',
      ]),
    key: 'auth.signup.errors.timeout',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'failed to fetch',
        'network request failed',
        'network error',
        'load failed',
        'fetch failed',
      ]),
    key: 'auth.signup.errors.network',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'too many requests',
        'rate limit',
        '429',
      ]),
    key: 'auth.signup.errors.tooManyRequests',
  },
  {
    match: ({ message }) =>
      includesAny(message, [
        'invalid api key',
        'jwt',
        'supabase is not configured',
      ]),
    key: 'auth.signup.errors.serviceUnavailable',
  },
];

export function resolveAuthErrorMessage(error, { t, context = 'login' } = {}) {
  const translate = typeof t === 'function' ? t : (key) => key;
  const message = readMessage(error);
  const code = readCode(error);
  const rules = context === 'signup' ? SIGNUP_RULES : LOGIN_RULES;
  const fallbackKey =
    context === 'signup' ? 'auth.signup.errors.generic' : 'auth.login.errors.generic';

  for (const rule of rules) {
    if (rule.match({ code, message: message.toLowerCase() })) {
      return translate(rule.key);
    }
  }

  if (message) return message;
  return translate(fallbackKey);
}

function isEmailValidationMessage(message) {
  const lower = String(message || '').toLowerCase();
  return (
    includesAny(lower, ['@gmail.com', 'gmail', 'אימייל', 'البريد', 'email']) &&
    !includesAny(lower, ['invalid login', 'not confirmed', 'credentials'])
  );
}

function isPasswordRequiredMessage(message) {
  const lower = String(message || '').toLowerCase();
  return (
    includesAny(lower, ['סיסמה', 'password', 'كلمة المرور']) &&
    includesAny(lower, ['חובה', 'required', 'مطلوب'])
  );
}

/** Map login errors to specific email/password field messages. */
export function resolveLoginFieldErrors(error, { t } = {}) {
  const translate = typeof t === 'function' ? t : (key) => key;
  const message = readMessage(error);
  const lower = message.toLowerCase();

  if (isEmailValidationMessage(message)) {
    return {
      email: message || translate('auth.login.errors.invalidEmail'),
      password: null,
      alert: null,
    };
  }

  if (isPasswordRequiredMessage(message)) {
    return {
      email: null,
      password: message || translate('auth.login.errors.passwordRequired'),
      alert: null,
    };
  }

  if (includesAny(lower, ['invalid login credentials', 'invalid credentials'])) {
    return {
      email: translate('auth.login.errors.invalidEmailField'),
      password: translate('auth.login.errors.invalidPasswordField'),
      alert: translate('auth.login.errors.invalidCredentials'),
    };
  }

  if (includesAny(lower, ['email not confirmed', 'email confirmation'])) {
    const emailMessage = translate('auth.login.errors.emailNotConfirmed');
    return {
      email: emailMessage,
      password: null,
      alert: emailMessage,
    };
  }

  const alert = resolveAuthErrorMessage(error, { t, context: 'login' });
  return {
    email: null,
    password: null,
    alert,
  };
}

export function isDuplicateStudentIdError(error) {
  const message = readMessage(error);
  const code = readCode(error);
  return (
    code === '23505' ||
    code === 'STUDENT_ID_EXISTS' ||
    message === 'STUDENT_ID_EXISTS' ||
    includesAny(message, [
      'students_student_id_key',
      'student with this identity number already exists',
      'duplicate key value violates unique constraint',
    ])
  );
}

export function buildStudentIdExistsError() {
  const error = new Error('STUDENT_ID_EXISTS');
  error.code = 'STUDENT_ID_EXISTS';
  return error;
}

export default {
  resolveAuthErrorMessage,
  resolveLoginFieldErrors,
  isDuplicateStudentIdError,
  buildStudentIdExistsError,
};
