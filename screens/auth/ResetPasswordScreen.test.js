import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ResetPasswordScreen from './ResetPasswordScreen';

/* -------------------- Alert spy -------------------- */
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- i18n mock (return keys) -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (k) => k }),
}));

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
const mockValidatePassword = jest.fn();
jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validatePassword: (...args) => mockValidatePassword(...args),
}));

/* -------------------- Mock supabase -------------------- */
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
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
    email: 'user@test.com',
    ...overrides,
  };
}

function typePasswords(utils, { pass, confirm }) {
  fireEvent.changeText(utils.getByLabelText('auth.resetPassword.newPassword'), pass);
  fireEvent.changeText(utils.getByLabelText('auth.resetPassword.confirmPassword'), confirm);
}

function pressSave(utils) {
  fireEvent.press(utils.getByLabelText('auth.resetPassword.changePassword'));
}

function lastAlert() {
  const calls = alertSpy.mock.calls;
  return calls[calls.length - 1];
}

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockValidatePassword.mockImplementation((p) => {
      if (!p || String(p).length < 6) return { isValid: false, error: 'bad pass' };
      return { isValid: true, error: null };
    });

    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({});
  });

  /* =========================
   * RENDER: 2 positive + 2 negative
   * ========================= */

  it('render (positive): shows title/subtitle keys + save button', async () => {
    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('auth.resetPassword.title')).toBeTruthy();
      expect(utils.getByText('auth.resetPassword.subtitle')).toBeTruthy();
      expect(utils.getByLabelText('auth.resetPassword.changePassword')).toBeTruthy();
    });
  });

  it('render (positive): shows info text + back button', async () => {
    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('auth.resetPassword.info')).toBeTruthy();
      expect(utils.getByText('auth.resetPassword.backToLogin')).toBeTruthy();
    });
  });

  it('render (negative): invalid password -> pressing save does NOT call supabase', async () => {
    mockValidatePassword.mockReturnValueOnce({ isValid: false, error: 'bad pass' });

    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    typePasswords(utils, { pass: 'bad', confirm: 'bad' });
    pressSave(utils);

    await waitFor(() => {
      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  it('render (negative): confirm mismatch -> pressing save does NOT call supabase', async () => {
    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    typePasswords(utils, { pass: 'newpass123', confirm: 'different123' });
    pressSave(utils);

    await waitFor(() => {
      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  /* =========================
   * RESET FLOW: 2 positive + 2 negative
   * ========================= */

  it('reset (positive): success -> getSession + updateUser + signOut, and alert button navigates to login', async () => {
    const navigateTo = jest.fn();
    const utils = render(<ResetPasswordScreen {...baseProps({ navigateTo })} />);

    typePasswords(utils, { pass: 'Newpass123!', confirm: 'Newpass123!' });
    pressSave(utils);

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'Newpass123!' });
      expect(mockSignOut).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();
    });

    const [title, msg, buttons] = lastAlert();
    expect(title).toBe('auth.resetPassword.success.title');
    expect(msg).toBe('auth.resetPassword.success.message');
    expect(Array.isArray(buttons)).toBe(true);

    const loginBtn = buttons.find((b) => b.text === 'auth.resetPassword.success.loginButton');
    expect(loginBtn).toBeTruthy();
    loginBtn.onPress && loginBtn.onPress();

    expect(navigateTo).toHaveBeenCalledWith('login');
  });

  it('reset (positive): back button navigates to login', async () => {
    const navigateTo = jest.fn();
    const utils = render(<ResetPasswordScreen {...baseProps({ navigateTo })} />);

    fireEvent.press(utils.getByText('auth.resetPassword.backToLogin'));
    expect(navigateTo).toHaveBeenCalledWith('login');
  });

  it('reset (negative): no session -> shows "لا يمكن تغيير كلمة المرور" and does NOT update user', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    typePasswords(utils, { pass: 'Newpass123!', confirm: 'Newpass123!' });
    pressSave(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'لا يمكن تغيير كلمة المرور',
        expect.stringContaining('لا توجد جلسة')
      );
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  it('reset (negative): same password error -> shows specific samePassword alert and does NOT call showSupabaseError format', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'same password' } });

    const utils = render(<ResetPasswordScreen {...baseProps()} />);

    typePasswords(utils, { pass: 'Newpass123!', confirm: 'Newpass123!' });
    pressSave(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'auth.resetPassword.errors.samePassword'
      );
    });
  });
});
