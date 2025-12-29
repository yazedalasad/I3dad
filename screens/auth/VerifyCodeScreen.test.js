import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import VerifyCodeScreen from './VerifyCodeScreen';

/* =========================================================
   ✅ Fix: Dimensions.get must exist (useWindowDimensions uses it)
========================================================= */
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Make sure Dimensions.get exists and returns width/height
  RN.Dimensions.get = jest.fn(() => ({
    width: 390,
    height: 844,
    scale: 2,
    fontScale: 2,
  }));

  return RN;
});

/* =========================================================
   Timers
========================================================= */
beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

/* =========================================================
   Safe UI mocks (NO out-of-scope references)
========================================================= */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{`icon:${name}`}</Text>,
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children }) => <>{children}</>,
  };
});

jest.mock('../../components/Form/CustomButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, loading }) => (
    <TouchableOpacity onPress={onPress} disabled={!!loading} accessibilityRole="button">
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

/* =========================================================
   Supabase mock
========================================================= */
const mockVerifyOtp = jest.fn();
const mockGetSession = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (...args) => mockVerifyOtp(...args),
      getSession: (...args) => mockGetSession(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
    },
  },
}));

/* =========================================================
   Alert spy
========================================================= */
jest.spyOn(Alert, 'alert');

/* =========================================================
   Helpers
========================================================= */
const renderScreen = ({ email = 'user@test.com' } = {}) => {
  const navigateTo = jest.fn();
  const utils = render(<VerifyCodeScreen navigateTo={navigateTo} email={email} />);
  return { ...utils, navigateTo };
};

const fillCode = async (utils, code = '123456') => {
  // There are 6 TextInputs. We can grab by "value" as they start empty.
  // In RN Testing Library, TextInput is matched by placeholder/value less reliably,
  // so use UNSAFE_getAllByType(TextInput).
  const { TextInput } = require('react-native');
  const inputs = utils.UNSAFE_getAllByType(TextInput);

  for (let i = 0; i < 6; i++) {
    await act(async () => {
      fireEvent.changeText(inputs[i], code[i]);
    });
  }

  return inputs;
};

/* =========================================================
   Tests
========================================================= */
describe('VerifyCodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, email, and verify button', () => {
    const { getByText } = renderScreen({ email: 'user@test.com' });

    expect(getByText('التحقق من الرمز')).toBeTruthy();
    expect(getByText('user@test.com')).toBeTruthy();
    expect(getByText('تحقق')).toBeTruthy();
  });

  it('back button navigates to forgotPassword', () => {
    const { getByText, navigateTo } = renderScreen({ email: 'user@test.com' });

    fireEvent.press(getByText('رجوع'));
    expect(navigateTo).toHaveBeenCalledWith('forgotPassword');
  });

  it('manual verify (positive): entering 6 digits then pressing "تحقق" calls verifyOtp and shows success alert; pressing alert button navigates to resetPassword', async () => {
    mockVerifyOtp.mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValueOnce({ data: { session: { id: 'sess' } } });

    const utils = renderScreen({ email: 'user@test.com' });
    const { getByText, navigateTo } = utils;

    await fillCode(utils, '123456');

    await act(async () => {
      fireEvent.press(getByText('تحقق'));
    });

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'user@test.com',
        token: '123456',
        type: 'recovery',
      });
    });

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

    // Alert.alert(title, msg, buttons)
    const alertArgs = Alert.alert.mock.calls[0];
    const buttons = alertArgs[2];
    expect(Array.isArray(buttons)).toBe(true);

    // press "متابعة"
    act(() => {
      buttons[0].onPress();
    });

    expect(navigateTo).toHaveBeenCalledWith('resetPassword', { email: 'user@test.com' });
  });

  it('negative: missing email shows alert and does NOT call verifyOtp', async () => {
    const { getByText } = renderScreen({ email: undefined });

    await act(async () => {
      fireEvent.press(getByText('تحقق'));
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('negative: incomplete code shows 6-digit alert and does NOT call verifyOtp', async () => {
    const utils = renderScreen({ email: 'user@test.com' });
    const { getByText } = utils;

    const { TextInput } = require('react-native');
    const inputs = utils.UNSAFE_getAllByType(TextInput);

    await act(async () => {
      fireEvent.changeText(inputs[0], '1');
    });

    fireEvent.press(getByText('تحقق'));

    expect(Alert.alert).toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('negative: verifyOtp expired -> shows expired alert', async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error('expired token'));

    const utils = renderScreen({ email: 'user@test.com' });
    const { getByText } = utils;

    await fillCode(utils, '123456');

    await act(async () => {
      fireEvent.press(getByText('تحقق'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'انتهت صلاحية الرمز',
        expect.any(String)
      );
    });
  });
});
