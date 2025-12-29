// screens/Auth/SignupScreen.test.js
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SignupScreen from './SignupScreen';

/* -------------------- i18n -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (k) => k, // return key as-is
  }),
}));

/* -------------------- AuthContext -------------------- */
let mockSignUp = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}));

/* -------------------- Data: israeliSchools -------------------- */
jest.mock('../../data/israeliSchools', () => ({
  __esModule: true,
  israeliSchools: [
    { name: 'School A' },
    { name: 'School B' },
  ],
}));

/* -------------------- UI components mocks -------------------- */
// CustomButton -> TouchableOpacity with text + (optional) accessibilityLabel
jest.mock('../../components/Form/CustomButton', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return function CustomButtonMock(props) {
    const { title, onPress, loading, disabled, fullWidth, variant } = props;
    const isDisabled = !!disabled || !!loading;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={String(title)}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
      >
        <Text>{String(title)}</Text>
      </TouchableOpacity>
    );
  };
});

// CustomTextInput -> label + TextInput with accessibilityLabel=label
jest.mock('../../components/Form/CustomTextInput', () => {
  const React = require('react');
  const { Text, TextInput, View } = require('react-native');

  return function CustomTextInputMock(props) {
    const { label, value, onChangeText, error, ...rest } = props;
    return (
      <View>
        <Text>{String(label)}</Text>
        {!!error && <Text>{String(error)}</Text>}
        <TextInput
          accessibilityLabel={String(label)}
          value={value ?? ''}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    );
  };
});

// CustomPicker -> label + button to "select" first option (or provided value)
jest.mock('../../components/Form/CustomPicker', () => {
  const React = require('react');
  const { Text, View, TouchableOpacity } = require('react-native');

  return function CustomPickerMock(props) {
    const { label, value, onValueChange, items = [], error } = props;

    // In tests we will just "select" an item by clicking a button
    return (
      <View>
        <Text>{String(label)}</Text>
        {!!error && <Text>{String(error)}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`picker:${String(label)}`}
          onPress={() => {
            const first = items[0];
            if (first && onValueChange) onValueChange(first.value);
          }}
        >
          <Text>{value ? String(value) : 'Select'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// DatePicker -> label + button to set a fixed date
jest.mock('../../components/Form/DatePicker', () => {
  const React = require('react');
  const { Text, View, TouchableOpacity } = require('react-native');

  return function DatePickerMock(props) {
    const { label, value, onValueChange, error } = props;

    return (
      <View>
        <Text>{String(label)}</Text>
        {!!error && <Text>{String(error)}</Text>}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`date:${String(label)}`}
          onPress={() => onValueChange && onValueChange('2008-01-01')}
        >
          <Text>{value ? String(value) : 'PickDate'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

/* -------------------- Validation utils --------------------
   We mock them so tests are stable and we can control pass/fail per case.
*/
const mockValidateStudentId = jest.fn();
const mockValidateName = jest.fn();
const mockValidateNamesLanguageMatch = jest.fn();
const mockValidateEmail = jest.fn();
const mockValidatePhone = jest.fn();
const mockValidateBirthday = jest.fn();
const mockValidateSchool = jest.fn();
const mockValidateGrade = jest.fn();
const mockValidatePassword = jest.fn();
const mockValidatePasswordMatch = jest.fn();
const mockFormatPhone = jest.fn();

jest.mock('../../utils/validation', () => ({
  __esModule: true,
  formatPhone: (...args) => mockFormatPhone(...args),

  validateStudentId: (...args) => mockValidateStudentId(...args),
  validateName: (...args) => mockValidateName(...args),
  validateNamesLanguageMatch: (...args) => mockValidateNamesLanguageMatch(...args),
  validateEmail: (...args) => mockValidateEmail(...args),

  validatePhone: (...args) => mockValidatePhone(...args),
  validateBirthday: (...args) => mockValidateBirthday(...args),
  validateSchool: (...args) => mockValidateSchool(...args),
  validateGrade: (...args) => mockValidateGrade(...args),

  validatePassword: (...args) => mockValidatePassword(...args),
  validatePasswordMatch: (...args) => mockValidatePasswordMatch(...args),
}));

/* -------------------- Alert -------------------- */
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- helpers -------------------- */
function renderScreen(overrides = {}) {
  const navigateTo = jest.fn();
  const utils = render(<SignupScreen navigateTo={navigateTo} {...overrides} />);
  return { ...utils, navigateTo };
}

function makeAllValid() {
  mockValidateStudentId.mockReturnValue({ isValid: true });
  mockValidateName.mockReturnValue({ isValid: true });
  mockValidateNamesLanguageMatch.mockReturnValue({ isValid: true });
  mockValidateEmail.mockReturnValue({ isValid: true });

  mockValidatePhone.mockReturnValue({ isValid: true });
  mockValidateBirthday.mockReturnValue({ isValid: true });
  mockValidateSchool.mockReturnValue({ isValid: true });
  mockValidateGrade.mockReturnValue({ isValid: true });

  mockValidatePassword.mockReturnValue({ isValid: true });
  mockValidatePasswordMatch.mockReturnValue({ isValid: true });

  mockFormatPhone.mockImplementation((p) => p);
}

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    makeAllValid();

    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* =========================
   * STEP 1
   * ========================= */

  it('step1 (positive): renders personal info title and Next button', async () => {
    const { getByText } = renderScreen();

    expect(getByText('auth.signup.personalInfo')).toBeTruthy();
    expect(getByText('common.next')).toBeTruthy();
  });

  it('step1 -> step2 (positive): clicking Next with valid step1 moves to step2', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.next'));

    await waitFor(() => {
      expect(getByText('auth.signup.contactInfo')).toBeTruthy();
    });
  });

  it('step1 (negative): invalid email -> does NOT move to step2', async () => {
    mockValidateEmail.mockReturnValueOnce({ isValid: false, error: 'bad email' });

    const { getByText, queryByText } = renderScreen();

    fireEvent.press(getByText('common.next'));

    await waitFor(() => {
      expect(queryByText('auth.signup.contactInfo')).toBeNull();
      expect(getByText('auth.signup.personalInfo')).toBeTruthy();
    });
  });

  it('step1 (negative): names language mismatch -> does NOT move to step2', async () => {
    mockValidateNamesLanguageMatch.mockReturnValueOnce({ isValid: false, error: 'lang mismatch' });

    const { getByText, queryByText } = renderScreen();

    fireEvent.press(getByText('common.next'));

    await waitFor(() => {
      expect(queryByText('auth.signup.contactInfo')).toBeNull();
      expect(getByText('auth.signup.personalInfo')).toBeTruthy();
    });
  });

  /* =========================
   * STEP 2
   * ========================= */

  it('step2 (positive): Back returns to step1', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.next')); // go to step2

    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.back')); // back to step1

    await waitFor(() => expect(getByText('auth.signup.personalInfo')).toBeTruthy());
  });

  it('step2 -> step3 (positive): Next with valid step2 moves to step3', async () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.next')); // step2
    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.next')); // step3
    await waitFor(() => expect(getByText('auth.signup.accountInfo')).toBeTruthy());
  });

  it('step2 (negative): invalid phone -> does NOT move to step3', async () => {
    mockValidatePhone.mockReturnValueOnce({ isValid: false, error: 'bad phone' });

    const { getByText, queryByText } = renderScreen();

    fireEvent.press(getByText('common.next')); // step2
    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.next')); // attempt step3

    await waitFor(() => {
      expect(queryByText('auth.signup.accountInfo')).toBeNull();
      expect(getByText('auth.signup.contactInfo')).toBeTruthy();
    });
  });

  /* =========================
   * STEP 3 / SIGNUP
   * ========================= */

  it('signup (positive): create account success -> navigates to login and shows success alert after 500ms', async () => {
    const { getByText, navigateTo } = renderScreen();

    fireEvent.press(getByText('common.next')); // step2
    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.next')); // step3
    await waitFor(() => expect(getByText('auth.signup.accountInfo')).toBeTruthy());

    fireEvent.press(getByText('auth.signup.createAccount'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('login');
    });

    // success alert is shown after a timeout of 500ms
    expect(Alert.alert).not.toHaveBeenCalledWith('auth.signup.success.title', 'auth.signup.success.message');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('auth.signup.success.title', 'auth.signup.success.message');
    });
  });

  it('signup (negative): signUp returns "already registered" -> shows emailExists error alert', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: null,
      error: { message: 'already registered' },
    });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.next')); // step2
    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.next')); // step3
    await waitFor(() => expect(getByText('auth.signup.accountInfo')).toBeTruthy());

    fireEvent.press(getByText('auth.signup.createAccount'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'auth.signup.errors.emailExists');
    });
  });

  it('signup (negative): invalid password step3 -> does NOT call signUp', async () => {
    mockValidatePassword.mockReturnValueOnce({ isValid: false, error: 'weak' });

    const { getByText } = renderScreen();

    fireEvent.press(getByText('common.next')); // step2
    await waitFor(() => expect(getByText('auth.signup.contactInfo')).toBeTruthy());

    fireEvent.press(getByText('common.next')); // step3
    await waitFor(() => expect(getByText('auth.signup.accountInfo')).toBeTruthy());

    fireEvent.press(getByText('auth.signup.createAccount'));

    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  it('navigation links: pressing login link navigates to login; back-to-home navigates to home', async () => {
    const { getByText, navigateTo } = renderScreen();

    fireEvent.press(getByText('auth.signup.loginLink'));
    expect(navigateTo).toHaveBeenCalledWith('login');

    fireEvent.press(getByText('auth.signup.backToHome'));
    expect(navigateTo).toHaveBeenCalledWith('home');
  });
});
