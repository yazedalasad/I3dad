// components/Navigation/Navbar.test.js
import { fireEvent, render } from '@testing-library/react-native';
import Navbar from './Navbar';

/* ------------------------------------------------
   Mocks
------------------------------------------------ */

// Auth
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

/**
 * i18n
 * Navbar calls:
 *   t(`navigation:tabs.${tab.id}`)
 * and if t returns the key, it falls back to tab.id.
 *
 * Our test expects Arabic labels, so we MUST return Arabic values here.
 */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (k) => {
      const map = {
        'navigation:tabs.home': 'الرئيسية',
        'navigation:tabs.successStories': 'قصص النجاح',
        'navigation:tabs.activities': 'الأنشطة',
        'navigation:tabs.about': 'عن إعداد',
        'navigation:tabs.login': 'تسجيل الدخول',
        'navigation:tabs.test': 'الاختبار',
        'navigation:tabs.profile': 'حسابي',
      };
      return map[k] ?? k;
    },
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

// Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

const { useAuth } = require('../../contexts/AuthContext');

describe('Navbar', () => {
  const onTabPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------
     LOGGED OUT USER
  -------------------------------- */
  test('renders correct tabs when user is logged out', () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText, queryByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    // Common (logged out)
    expect(getByText('الرئيسية')).toBeTruthy();
    expect(getByText('قصص النجاح')).toBeTruthy();
    expect(getByText('الأنشطة')).toBeTruthy();

    // Logged-out specific
    expect(getByText('عن إعداد')).toBeTruthy();
    expect(getByText('تسجيل الدخول')).toBeTruthy();

    // Logged-in only tabs should NOT exist
    expect(queryByText('حسابي')).toBeNull();
    expect(queryByText('الاختبار')).toBeNull();
  });

  /* --------------------------------
     LOGGED IN USER
  -------------------------------- */
  test('renders correct tabs when user is logged in', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } });

    const { getByText, queryByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    // Common (logged in)
    expect(getByText('الرئيسية')).toBeTruthy();
    expect(getByText('قصص النجاح')).toBeTruthy();
    expect(getByText('الأنشطة')).toBeTruthy();

    // Logged-in specific
    
    expect(getByText('حسابي')).toBeTruthy();

    // Logged-out only tabs should NOT exist
    expect(queryByText('عن إعداد')).toBeNull();
    expect(queryByText('تسجيل الدخول')).toBeNull();
  });

  /* --------------------------------
     INTERACTION
  -------------------------------- */
  test('pressing a tab calls onTabPress with tab id', () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    fireEvent.press(getByText('قصص النجاح'));
    expect(onTabPress).toHaveBeenCalledWith('successStories');

    fireEvent.press(getByText('تسجيل الدخول'));
    expect(onTabPress).toHaveBeenCalledWith('login');
  });

  /* --------------------------------
     ACTIVE TAB STABILITY
  -------------------------------- */
  test('does not crash when activeTab changes', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } });

    const { getByText, rerender } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    expect(getByText('الرئيسية')).toBeTruthy();

    rerender(<Navbar activeTab="profile" onTabPress={onTabPress} />);
    expect(getByText('حسابي')).toBeTruthy();
  });
});
