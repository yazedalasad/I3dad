// screens/Home/HomeScreen.test.js
import { fireEvent, render } from '@testing-library/react-native';

import HomeScreen from './HomeScreen';

/* -------------------------------------------------
   Mocks
-------------------------------------------------- */

// i18n → return key as text + support welcome {name}
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // HomeScreen uses t('welcome', { name: studentData.first_name })
    t: (key, opts) => {
      if (key === 'welcome' && opts?.name) return `welcome ${opts.name}`;
      return key;
    },
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

// Auth
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
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
    LinearGradient: ({ children, ...props }) => <View {...props}>{children}</View>,
  };
});

// FeatureCard (render minimal to avoid deep tree)
jest.mock('../../components/FeatureCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function FeatureCardMock({ feature }) {
    return (
      <View>
        <Text>{feature?.title}</Text>
        <Text>{feature?.description}</Text>
      </View>
    );
  };
});

// Image assets (if bundler tries to resolve them somewhere)
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

    // HomeScreen renders t('title') and t('subtitle')
    expect(getByText('title')).toBeTruthy();
    expect(getByText('subtitle')).toBeTruthy();
  });

  test('logged out user → primary button shows getStarted and navigates to signup', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    // Primary button label is user ? t('startAssessment') : t('getStarted')
    fireEvent.press(getByText('getStarted'));

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  test('logged out user → secondary login button navigates to login', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    // Secondary button label is t('login')
    fireEvent.press(getByText('login'));

    expect(navigateTo).toHaveBeenCalledWith('login');
  });

  test('logged in user → primary button shows startAssessment and navigates to adaptiveTest', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('startAssessment'));

    expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
  });

  test('shows welcome banner when user and studentData exist', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { first_name: 'Ahmad' },
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    // welcome text is t('welcome', { name })
    expect(getByText('welcome Ahmad')).toBeTruthy();
  });

  test('CTA button navigates correctly when logged out', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    // CTA button text is t('cta.button')
    fireEvent.press(getByText('cta.button'));

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  test('CTA button navigates correctly when logged in', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { first_name: 'Ahmad' },
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('cta.button'));

    expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
  });

  test('tryPersonality link navigates to signup when logged out', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    // Small link text is t('tryPersonality')
    fireEvent.press(getByText('tryPersonality'));

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  test('tryPersonality link navigates to personalityTest when logged in', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { first_name: 'Ahmad' },
    });

    const { getByText } = render(<HomeScreen navigateTo={navigateTo} />);

    fireEvent.press(getByText('tryPersonality'));

    expect(navigateTo).toHaveBeenCalledWith('personalityTest');
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

    expect(queryByText('login')).toBeNull();
  });

  test('renders safely without navigateTo prop (no crash on initial render)', () => {
    useAuth.mockReturnValue({
      user: null,
      studentData: null,
    });

    const { getByText } = render(<HomeScreen />);

    expect(getByText('title')).toBeTruthy();
  });
});
