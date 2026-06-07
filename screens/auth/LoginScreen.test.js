import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from './LoginScreen';

const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (k) => k }),
}));

jest.mock('../../components/Form/CustomTextInput', () => {
  const React = require('react');
  const { Text, TextInput } = require('react-native');
  return function MockCustomTextInput({ label, value, onChangeText, placeholder, error }) {
    return (
      <>
        <Text>{label}</Text>
        {!!error && <Text>{String(error)}</Text>}
        <TextInput accessibilityLabel={label} value={value} placeholder={placeholder} onChangeText={onChangeText} />
      </>
    );
  };
});

jest.mock('../../components/Form/CustomButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockCustomButton({ title, onPress, loading, disabled }) {
    return (
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled || loading}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../utils/authErrors', () => ({
  __esModule: true,
  resolveAuthErrorMessage: (error, { t }) => {
    const message = String(error?.message || '');
    if (message.includes('Invalid login credentials')) return t('auth.login.errors.invalidCredentials');
    if (message.includes('Email not confirmed')) return t('auth.login.errors.emailNotConfirmed');
    if (message.includes('Failed to fetch')) return t('auth.login.errors.network');
    return t('auth.login.errors.generic');
  },
}));

const mockValidateEmail = jest.fn();
const mockValidatePassword = jest.fn();

jest.mock('../../utils/validation', () => ({
  __esModule: true,
  validateEmail: (...args) => mockValidateEmail(...args),
  validatePassword: (...args) => mockValidatePassword(...args),
}));

const mockSignIn = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ signIn: (...args) => mockSignIn(...args) }),
}));

function baseProps(overrides = {}) {
  return { navigateTo: jest.fn(), ...overrides };
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
    mockValidateEmail.mockReturnValue({ isValid: true, error: null });
    mockValidatePassword.mockReturnValue({ isValid: true, error: null });
    mockSignIn.mockResolvedValue({ success: true, data: { user: { id: 'u1' } }, error: null });
  });

  it('render (positive): shows translated title/subtitle keys + login button', async () => {
    const utils = render(<LoginScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('auth.login.title')).toBeTruthy();
      expect(utils.getByText('auth.login.subtitle')).toBeTruthy();
      expect(utils.getByLabelText('auth.login.loginButton')).toBeTruthy();
    });
  });

  it('nav (positive): pressing "forgot password" navigates to forgotPassword', () => {
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

  it('login (positive): successful signIn does not navigate directly (ManualNavigator handles routing)', async () => {
    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    typeLogin(utils, { email: 'user@test.com', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'pass12345');
      expect(navigateTo).not.toHaveBeenCalledWith('roleRouter');
    });
  });

  it('login (positive): principal first time link navigates to principalSetPassword', () => {
    const navigateTo = jest.fn();
    const utils = render(<LoginScreen {...baseProps({ navigateTo })} />);

    fireEvent.press(utils.getByText('login.principalFirstTime'));
    expect(navigateTo).toHaveBeenCalledWith('principalRegister');
  });

  it('login (negative): invalid credentials -> shows specific alert message key', async () => {
    mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Invalid login credentials' } });
    const utils = render(<LoginScreen {...baseProps()} />);

    typeLogin(utils, { email: 'user@test.com', password: 'wrong' });
    pressLogin(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.login.errors.invalidCredentials');
    });
  });

  it('login (negative): network failure -> shows network alert message key', async () => {
    mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    const utils = render(<LoginScreen {...baseProps()} />);

    typeLogin(utils, { email: 'user@test.com', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.login.errors.network');
    });
  });

  it('login (negative): email not confirmed -> shows specific alert message key', async () => {
    mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Email not confirmed' } });
    const utils = render(<LoginScreen {...baseProps()} />);

    typeLogin(utils, { email: 'user@test.com', password: 'pass12345' });
    pressLogin(utils);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.login.errors.emailNotConfirmed');
    });
  });
});
