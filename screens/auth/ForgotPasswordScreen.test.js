import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ForgotPasswordScreen from './ForgotPasswordScreen';

/* -------------------- Alert spy -------------------- */
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- i18n mock -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (k) => k }),
}));

/* -------------------- Mock UI components -------------------- */
/**
 * Important: jest.mock factories are hoisted -> require react-native inside the factory.
 */
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
    const { title, onPress, disabled, loading } = props;
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
jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validateEmail: (...args) => mockValidateEmail(...args),
}));

/* -------------------- Mock supabase -------------------- */
const mockResetPasswordForEmail = jest.fn();
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
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

function pressSend(utils) {
  fireEvent.press(utils.getByLabelText('إرسال الرمز'));
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockValidateEmail.mockImplementation((email) => {
      const clean = String(email || '');
      if (!clean || !clean.includes('@')) {
        return { isValid: false, error: 'بريد غير صالح' };
      }
      return { isValid: true, error: null };
    });

    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  /* =========================
   * RENDER
   * 2 positive + 2 negative
   * ========================= */

  it('render (positive): shows title + subtitle + send button', async () => {
    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('نسيت كلمة المرور؟')).toBeTruthy();
      expect(utils.getByText('أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين')).toBeTruthy();
      expect(utils.getByLabelText('إرسال الرمز')).toBeTruthy();
    });
  });

  it('render (positive): shows email input label and info text', async () => {
    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('البريد الإلكتروني')).toBeTruthy();
      expect(
        utils.getByText(
          'أدخل بريدك الإلكتروني وسنرسل لك رمزاً مكوّناً من 6 أرقام لإعادة تعيين كلمة المرور.'
        )
      ).toBeTruthy();
    });
  });

  it('render (negative): if email invalid, pressing send does NOT call supabase', async () => {
    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    // invalid
    typeEmail(utils, 'not-an-email');
    pressSend(utils);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  it('render (negative): if email empty, pressing send does NOT call supabase', async () => {
    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    typeEmail(utils, '');
    pressSend(utils);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  /* =========================
   * SEND RECOVERY CODE FLOW
   * 2 positive + 2 negative
   * ========================= */

  it('send (positive): success -> calls resetPasswordForEmail with trimmed/lowercased email', async () => {
    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    typeEmail(utils, '  USER@TEST.COM  ');
    pressSend(utils);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.com');
    });
  });

  it('send (positive): success -> shows success alert and pressing "متابعة" navigates to verifyCode', async () => {
    const navigateTo = jest.fn();
    const utils = render(<ForgotPasswordScreen {...baseProps({ navigateTo })} />);

    typeEmail(utils, 'user@test.com');
    pressSend(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const [title, message, buttons] = lastCall;

    expect(title).toBe('تم الإرسال ✅');
    expect(message).toContain('تم إرسال رمز مكوّن من 6 أرقام');
    expect(Array.isArray(buttons)).toBe(true);

    const nextBtn = buttons.find((b) => b.text === 'متابعة');
    expect(nextBtn).toBeTruthy();

    nextBtn.onPress && nextBtn.onPress();
    expect(navigateTo).toHaveBeenCalledWith('verifyCode', { email: 'user@test.com' });
  });

  it('send (negative): rate limit 429 -> shows 429 alert and does NOT call showSupabaseError format', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 429, message: 'Too many requests' },
    });

    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    typeEmail(utils, 'user@test.com');
    pressSend(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'تم إرسال طلبات كثيرة',
        expect.stringContaining('429')
      );
    });
  });

  it('send (negative): non-429 error -> shows formatted supabase error alert', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 400, code: 'BAD_REQUEST', message: 'RESET FAILED' },
    });

    const utils = render(<ForgotPasswordScreen {...baseProps()} />);

    typeEmail(utils, 'user@test.com');
    pressSend(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const [title, message] = lastCall;

    expect(title).toBe('حدث خطأ');
    expect(message).toContain('Status: 400');
    expect(message).toContain('Code: BAD_REQUEST');
    expect(message).toContain('RESET FAILED');
  });
});
