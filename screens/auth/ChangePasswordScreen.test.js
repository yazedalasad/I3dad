import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ChangePasswordScreen from './ChangePasswordScreen';

/* -------------------- Alert spy -------------------- */
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- Mock UI components -------------------- */
/**
 * Important: inside jest.mock factories, DO NOT reference imported variables (Text/TextInput/etc)
 * because jest.mock is hoisted. Require them inside the factory.
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
const mockValidatePassword = jest.fn();
jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validatePassword: (...args) => mockValidatePassword(...args),
}));

/* -------------------- Mock supabase -------------------- */
const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      updateUser: (...args) => mockUpdateUser(...args),
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

function typePasswords(utils, { oldP, newP, confirmP }) {
  fireEvent.changeText(utils.getByLabelText('كلمة المرور القديمة'), oldP);
  fireEvent.changeText(utils.getByLabelText('كلمة المرور الجديدة'), newP);
  fireEvent.changeText(utils.getByLabelText('تأكيد كلمة المرور الجديدة'), confirmP);
}

function pressChange(utils) {
  fireEvent.press(utils.getByLabelText('تغيير كلمة المرور'));
}

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: user exists + email
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'user@test.com' } },
      error: null,
    });

    // Default: validate ok
    mockValidatePassword.mockImplementation((p) => {
      if (!p || p.length < 6) return { isValid: false, error: 'كلمة المرور غير صالحة' };
      return { isValid: true, error: null };
    });

    // Default: sign-in ok, update ok
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    });

    mockUpdateUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
  });

  /* =========================
   * LOAD USER / RENDER
   * 2 positive + 2 negative
   * ========================= */

  it('load (positive): renders title + info text', async () => {
  const utils = render(<ChangePasswordScreen {...baseProps()} />);

  await waitFor(() => {
    // Title exists (might appear multiple times: header + button)
    expect(utils.getAllByText('تغيير كلمة المرور').length).toBeGreaterThan(0);

    // More unique text = stable assertion
    expect(
      utils.getByText('أدخل كلمة المرور القديمة ثم اختر كلمة مرور جديدة')
    ).toBeTruthy();

    expect(
      utils.getByText('إذا نسيت كلمة المرور القديمة، استخدم خيار “استعادة كلمة المرور”.')
    ).toBeTruthy();

    // Button exists (our mocked CustomButton uses accessibilityLabel=title)
    expect(utils.getByLabelText('تغيير كلمة المرور')).toBeTruthy();
  });
});


  it('load (positive): displays current user email', async () => {
    const utils = render(<ChangePasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('user@test.com')).toBeTruthy();
    });
  });

  it('load (negative): if getUser returns error -> shows alert', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'GET USER FAILED' },
    });

    render(<ChangePasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('خطأ', 'GET USER FAILED');
    });
  });

  it('load (negative): if no user -> alerts and navigates to login', async () => {
    const navigateTo = jest.fn();
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    render(<ChangePasswordScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('تنبيه', 'يجب تسجيل الدخول أولاً.');
      expect(navigateTo).toHaveBeenCalledWith('login');
    });
  });

  /* =========================
   * CHANGE PASSWORD FLOW
   * 2 positive + 2 negative
   * ========================= */

  it('change (positive): success -> calls signIn & update, then success alert + pressing OK navigates profile', async () => {
    const navigateTo = jest.fn();
    const utils = render(<ChangePasswordScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => expect(utils.getByText('user@test.com')).toBeTruthy());

    typePasswords(utils, { oldP: 'oldpass123', newP: 'newpass123', confirmP: 'newpass123' });
    pressChange(utils);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'oldpass123',
      });
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const [title, message, buttons] = lastCall;

    expect(title).toBe('تم بنجاح ✅');
    expect(message).toBe('تم تغيير كلمة المرور بنجاح.');
    expect(Array.isArray(buttons)).toBe(true);

    const okBtn = buttons.find((b) => b.text === 'حسناً');
    expect(okBtn).toBeTruthy();
    okBtn.onPress && okBtn.onPress();

    expect(navigateTo).toHaveBeenCalledWith('profile');
  });

  it('change (positive): old password wrong -> shows alert + pressing "استعادة كلمة المرور" navigates', async () => {
    const navigateTo = jest.fn();

    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const utils = render(<ChangePasswordScreen {...baseProps({ navigateTo })} />);
    await waitFor(() => expect(utils.getByText('user@test.com')).toBeTruthy());

    typePasswords(utils, { oldP: 'wrong', newP: 'newpass123', confirmP: 'newpass123' });
    pressChange(utils);

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const [title, message, buttons] = lastCall;

    expect(title).toBe('كلمة المرور القديمة غير صحيحة');
    expect(message).toContain('إذا نسيت كلمة المرور');
    expect(Array.isArray(buttons)).toBe(true);

    const recoverBtn = buttons.find((b) => b.text === 'استعادة كلمة المرور');
    expect(recoverBtn).toBeTruthy();

    recoverBtn.onPress && recoverBtn.onPress();
    expect(navigateTo).toHaveBeenCalledWith('forgotPassword', { email: 'user@test.com' });
  });

  it('change (negative): validation fails -> does NOT call signIn/update', async () => {
    const utils = render(<ChangePasswordScreen {...baseProps()} />);
    await waitFor(() => expect(utils.getByText('user@test.com')).toBeTruthy());

    // Force invalid new password
    mockValidatePassword.mockReturnValueOnce({ isValid: false, error: 'كلمة المرور غير صالحة' });

    typePasswords(utils, { oldP: 'oldpass123', newP: 'bad', confirmP: 'bad' });
    pressChange(utils);

    await waitFor(() => {
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  it('change (negative): updateUser returns error -> shows formatted supabase error alert', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      data: null,
      error: { status: 400, code: 'SOME_CODE', message: 'UPDATE FAILED' },
    });

    const utils = render(<ChangePasswordScreen {...baseProps()} />);
    await waitFor(() => expect(utils.getByText('user@test.com')).toBeTruthy());

    typePasswords(utils, { oldP: 'oldpass123', newP: 'newpass123', confirmP: 'newpass123' });
    pressChange(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const [title, message] = lastCall;

    expect(title).toBe('حدث خطأ');
    expect(message).toContain('Status: 400');
    expect(message).toContain('Code: SOME_CODE');
    expect(message).toContain('UPDATE FAILED');
  });
});
