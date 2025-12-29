/**
 * PrincipalSetPasswordScreen.test.js
 * Fix for: Dimensions.get is not a function (useWindowDimensions)
 */

/* -------------------- react-native partial mock -------------------- */
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    useWindowDimensions: () => ({ width: 360, height: 800, scale: 2, fontScale: 2 }),
  };
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PrincipalSetPasswordScreen from './PrincipalSetPasswordScreen';

/* -------------------- Alert spy -------------------- */
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- Mock UI components (hoist-safe) -------------------- */
jest.mock('../../components/Form/CustomTextInput', () => {
  const React = require('react');
  const { Text, TextInput } = require('react-native');

  return function MockCustomTextInput(props) {
    const { label, value, onChangeText, placeholder, error } = props;
    return (
      <>
        <Text>{label}</Text>
        {!!error && <Text>{String(error)}</Text>}
        <TextInput
          accessibilityLabel={label}
          value={value}
          placeholder={placeholder}
          onChangeText={onChangeText}
        />
      </>
    );
  };
});

jest.mock('../../components/Form/CustomButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');

  return function MockCustomButton(props) {
    const { title, onPress, loading, disabled } = props;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        disabled={disabled || loading}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

/* -------------------- Mock validation -------------------- */
const mockValidateEmail = jest.fn();
const mockValidatePassword = jest.fn();

jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validateEmail: (...args) => mockValidateEmail(...args),
  validatePassword: (...args) => mockValidatePassword(...args),
}));

/* -------------------- Mock supabase -------------------- */
const mockResetPasswordForEmail = jest.fn();
const mockVerifyOtp = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
      verifyOtp: (...args) => mockVerifyOtp(...args),
      getSession: (...args) => mockGetSession(...args),
      updateUser: (...args) => mockUpdateUser(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    ...overrides,
  };
}

function typeEmail(utils, email) {
  fireEvent.changeText(utils.getByLabelText('البريد الإلكتروني'), email);
}

function pressBtn(utils, title) {
  fireEvent.press(utils.getByLabelText(title));
}

function fillCode(utils, digits6) {
  const { TextInput } = require('react-native');
  const inputs = utils.UNSAFE_getAllByType(TextInput);

  // In "code" step, OTP inputs are the ones without accessibilityLabel.
  // But our screen only has OTP inputs as TextInput at that step, so this is safe.
  for (let i = 0; i < 6; i++) {
    fireEvent.changeText(inputs[i], String(digits6[i] ?? ''));
  }
}

function goToCodeStep(utils) {
  typeEmail(utils, 'user@test.com');
  pressBtn(utils, 'إرسال الرمز');
}

function lastAlert() {
  const calls = alertSpy.mock.calls;
  return calls[calls.length - 1];
}

describe('PrincipalSetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockValidateEmail.mockReturnValue({ isValid: true, error: null });
    mockValidatePassword.mockReturnValue({ isValid: true, error: null });

    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });

    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });

    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({});
  });

  /* =========================
   * STEP 1 (EMAIL): 2 positive + 2 negative
   * ========================= */

  it('email step (positive): renders email step title + send button', async () => {
    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('تعيين كلمة المرور للمدير')).toBeTruthy();
      expect(utils.getByText('أدخل البريد الذي أضافه لك الأدمن')).toBeTruthy();
      expect(utils.getByLabelText('إرسال الرمز')).toBeTruthy();
    });
  });

  it('email step (positive): sending code success -> calls resetPasswordForEmail and moves to code step', async () => {
    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    typeEmail(utils, '  USER@TEST.COM  ');
    pressBtn(utils, 'إرسال الرمز');

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com');
      expect(utils.getByText('تحقق من الرمز')).toBeTruthy();
    });
  });

  it('email step (negative): invalid email -> does NOT call resetPasswordForEmail', async () => {
    mockValidateEmail.mockReturnValueOnce({ isValid: false, error: 'bad email' });

    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    typeEmail(utils, 'bad');
    pressBtn(utils, 'إرسال الرمز');

    await waitFor(() => {
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  it('email step (negative): 429 rate limit -> shows rate limit alert', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 429, message: 'Too many requests' },
    });

    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    typeEmail(utils, 'user@test.com');
    pressBtn(utils, 'إرسال الرمز');

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('طلبات كثيرة', expect.any(String));
    });
  });

  /* =========================
   * STEP 2 (CODE): 2 positive + 2 negative
   * ========================= */

  it('code step (positive): verify success -> calls verifyOtp and moves to password step', async () => {
    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '123456');
    pressBtn(utils, 'تحقق');

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'user@test.com',
        token: '123456',
        type: 'recovery',
      });
      expect(utils.getByText('إنشاء كلمة مرور')).toBeTruthy();
    });
  });

  it('code step (positive): resend (timer ended) -> calls resetPasswordForEmail and shows resend alert', async () => {
    jest.useFakeTimers();

    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    // timer starts at 60, tick it down
    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(utils.getByText('إعادة إرسال الرمز')).toBeTruthy();
    });

    fireEvent.press(utils.getByText('إعادة إرسال الرمز'));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com');
      expect(alertSpy).toHaveBeenCalledWith('تم الإرسال ✅', 'تم إعادة إرسال الرمز.');
    });

    jest.useRealTimers();
  });

  it('code step (negative): verify with incomplete code -> shows 6-digit alert and does NOT call verifyOtp', async () => {
    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '12');
    pressBtn(utils, 'تحقق');

    await waitFor(() => {
      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('خطأ', 'الرجاء إدخال رمز مكوّن من 6 أرقام.');
    });
  });

  it('code step (negative): expired code -> shows "expired" alert', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ error: { message: 'expired token' } });

    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '123456');
    pressBtn(utils, 'تحقق');

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('انتهت صلاحية الرمز', 'أعد إرسال الرمز وحاول مرة أخرى.');
    });
  });

  /* =========================
   * STEP 3 (PASSWORD): 2 positive + 2 negative
   * ========================= */

  it('password step (positive): save success -> updateUser & signOut, alert button navigates to login', async () => {
    const navigateTo = jest.fn();
    const utils = render(<PrincipalSetPasswordScreen {...baseProps({ navigateTo })} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '123456');
    pressBtn(utils, 'تحقق');
    await waitFor(() => expect(utils.getByText('إنشاء كلمة مرور')).toBeTruthy());

    fireEvent.changeText(utils.getByLabelText('كلمة المرور الجديدة'), 'Newpass123!');
    fireEvent.changeText(utils.getByLabelText('تأكيد كلمة المرور'), 'Newpass123!');

    pressBtn(utils, 'حفظ كلمة المرور');

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Newpass123!' });
      expect(mockSignOut).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });

    const [title, msg, buttons] = lastAlert();
    expect(title).toBe('تم بنجاح ✅');
    expect(msg).toContain('يمكنك تسجيل الدخول الآن');
    expect(Array.isArray(buttons)).toBe(true);

    const loginBtn = buttons.find((b) => b.text === 'تسجيل الدخول');
    expect(loginBtn).toBeTruthy();
    loginBtn.onPress && loginBtn.onPress();

    expect(navigateTo).toHaveBeenCalledWith('login');
  });

  it('password step (positive): "رجوع للرمز" goes back to code step', async () => {
    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '123456');
    pressBtn(utils, 'تحقق');
    await waitFor(() => expect(utils.getByText('إنشاء كلمة مرور')).toBeTruthy());

    fireEvent.press(utils.getByText('رجوع للرمز'));
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());
  });

  it('password step (negative): invalid password -> does NOT call updateUser', async () => {
    mockValidatePassword.mockReturnValueOnce({ isValid: false, error: 'bad pass' });

    const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

    goToCodeStep(utils);
    await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

    fillCode(utils, '123456');
    pressBtn(utils, 'تحقق');
    await waitFor(() => expect(utils.getByText('إنشاء كلمة مرور')).toBeTruthy());

    fireEvent.changeText(utils.getByLabelText('كلمة المرور الجديدة'), 'bad');
    fireEvent.changeText(utils.getByLabelText('تأكيد كلمة المرور'), 'bad');

    pressBtn(utils, 'حفظ كلمة المرور');

    await waitFor(() => {
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  it('password step (negative): no session on save -> alerts and returns to code step (does NOT update user)', async () => {
  // 1) verify step needs a session
  mockGetSession
    .mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null }) // after verifyOtp
    // 2) save step has NO session
    .mockResolvedValueOnce({ data: { session: null }, error: null }); // in handleSavePassword

  const utils = render(<PrincipalSetPasswordScreen {...baseProps()} />);

  // email -> code
  typeEmail(utils, 'user@test.com');
  pressBtn(utils, 'إرسال الرمز');
  await waitFor(() => expect(utils.getByText('تحقق من الرمز')).toBeTruthy());

  // fill code + verify -> should move to password step
  fillCode(utils, '123456');
  pressBtn(utils, 'تحقق');

  await waitFor(() => {
    expect(utils.getByText('إنشاء كلمة مرور')).toBeTruthy();
  });

  // fill passwords
  fireEvent.changeText(utils.getByLabelText('كلمة المرور الجديدة'), 'Newpass123!');
  fireEvent.changeText(utils.getByLabelText('تأكيد كلمة المرور'), 'Newpass123!');

  // save -> should detect missing session and go back to code step
  pressBtn(utils, 'حفظ كلمة المرور');

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('خطأ', 'لا توجد جلسة. ارجع وتحقق من الرمز مرة أخرى.');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(utils.getByText('تحقق من الرمز')).toBeTruthy();
  });
});
});
