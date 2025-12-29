import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from './HomeScreen';

/* -------------------------------------------------
   Mocks
-------------------------------------------------- */

// i18n → return key as text
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (opts?.name) return `welcome ${opts.name}`;
      return key;
    },
  }),
}));

// Auth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

// LinearGradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }) => <View>{children}</View>,
  };
});

// Image assets
jest.mock('../../assets/images/home/Jerusalem University College.jpeg', () => 1);
jest.mock('../../assets/images/home/Minute Media Offices - Tel Aviv _ Office Snapshots.jpeg', () => 1);

const { useAuth } = require('../../contexts/AuthContext');

describe('HomeScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------
     POSITIVE TESTS
  -------------------------------------------------- */

  test('renders hero title and subtitle', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    expect(getByText('home.title')).toBeTruthy();
    expect(getByText('home.subtitle')).toBeTruthy();
  });

  test('logged out user → Get Started navigates to signup', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('home.getStarted'));

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  test('logged out user → Login button navigates to login', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('home.login'));

    expect(navigateTo).toHaveBeenCalledWith('login');
  });

  test('logged in user → Start Assessment navigates to accountant', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('home.startAssessment'));

    expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
  });

  test('shows welcome banner when user and studentData exist', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { first_name: 'Ahmad' },
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    expect(getByText('welcome Ahmad')).toBeTruthy();
  });

  /* -------------------------------------------------
     NEGATIVE / EDGE CASES
  -------------------------------------------------- */

  test('does not show login button when user is logged in', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { first_name: 'Ahmad' },
    });

    const { queryByText } = render(<HomeScreen navigateTo={navigateTo} />);

    expect(queryByText('home.login')).toBeNull();
  });

  test('CTA button navigates correctly when logged out', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('home.cta.button'));

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  test('CTA button navigates correctly when logged in', () => {
  useAuth.mockReturnValue({
    user: { id: 'u1' },
    studentData: { first_name: 'Ahmad' },
  });

  const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

  fireEvent.press(getByText('home.cta.button'));

  expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
});


  test('renders safely without navigateTo prop', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('home.title')).toBeTruthy();
  });
});
