import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from './LoginScreen';

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
const mockValidateEmail = jest.fn();
const mockValidatePassword = jest.fn();

jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validateEmail: (...args) => mockValidateEmail(...args),
  validatePassword: (...args) => mockValidatePassword(...args),
}));

/* -------------------- Mock AuthContext -------------------- */
const mockSignIn = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ signIn: (...args) => mockSignIn(...args) }),
}));

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    ...overrides,
  };
}

function typeLogin(utils, { email, password }) {
  fireEvent.changeText(utils.getByLabelText('auth.login.email'), email);
  fireEvent.changeText(utils.getByLabelText('auth.login.password'), password);
}

function pressLogin(utils) {
  fireEvent.press(utils.getByLabelText('auth.login.loginButton'));
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: validations OK
    mockValidateEmail.mockReturnValue({ isValid: true, error: null });
    mockValidatePassword.mockReturnValue({ isValid: true, error: null });

    // Default: signIn success
    mockSignIn.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  /* =========================
   * RENDER / NAV LINKS
   * 2 positive + 2 negative
   * ========================= */

  it('render (positive): shows translated title/subtitle keys + login button', async () => {
    const utils = render(<LoginScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('auth.login.title')).toBeTruthy();
      expect(utils.getByText('auth.login.subtitle')).toBeTruthy();
      expect(utils.getByLabelText('auth.login.loginButton')).toBeTruthy();
    });
  });

  it('nav (positive): pressing "forgot password" navigates to forgotPassword', async () => {
    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    fireEvent.press(utils.getByText('auth.login.forgotPassword'));
    expect(navigateTo).toHaveBeenCalledWith('forgotPassword');
  });

  it('nav (negative): does NOT navigate to roleRouter when form invalid (email invalid)', async () => {
    mockValidateEmail.mockReturnValueOnce({ isValid: false, error: 'bad email' });

    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    typeLogin(utils, { email: 'bad', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(mockSignIn).not.toHaveBeenCalled();
      expect(navigateTo).not.toHaveBeenCalledWith('roleRouter');
    });
  });

  it('nav (negative): does NOT navigate to roleRouter when form invalid (password invalid)', async () => {
    mockValidatePassword.mockReturnValueOnce({ isValid: false, error: 'bad pass' });

    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    typeLogin(utils, { email: 'user@test.com', password: 'bad' });
    pressLogin(utils);

    await waitFor(() => {
      expect(mockSignIn).not.toHaveBeenCalled();
      expect(navigateTo).not.toHaveBeenCalledWith('roleRouter');
    });
  });

  /* =========================
   * LOGIN FLOW
   * 2 positive + 2 negative
   * ========================= */

  it('login (positive): successful signIn navigates to roleRouter', async () => {
    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    typeLogin(utils, { email: 'user@test.com', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'pass12345');
      expect(navigateTo).toHaveBeenCalledWith('roleRouter');
    });
  });

  it('login (positive): pressing "تسجيل دخول لأول مرة" navigates to principalSetPassword', async () => {
    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    fireEvent.press(utils.getByText('تسجيل دخول لأول مرة'));
    expect(navigateTo).toHaveBeenCalledWith('principalSetPassword');
  });

  it('login (negative): invalid credentials -> shows specific alert message key', async () => {
    mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const utils = render(<LoginScreen {...baseProps()} />);

    typeLogin(utils, { email: 'user@test.com', password: 'wrong' });
    pressLogin(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'auth.login.errors.invalidCredentials'
      );
    });
  });

  it('login (negative): email not confirmed -> shows specific alert message key', async () => {
    mockSignIn.mockResolvedValueOnce({
      data: null,
      error: { message: 'Email not confirmed' },
    });

    const utils = render(<LoginScreen {...baseProps()} />);

    typeLogin(utils, { email: 'user@test.com', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'auth.login.errors.emailNotConfirmed'
      );
    });
  });
});
