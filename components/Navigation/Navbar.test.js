import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import Navbar from './Navbar';

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key) => {
      const map = {
        'navigation:tabs.home': 'الرئيسية',
        'navigation:tabs.successStories': 'قصص النجاح',
        'navigation:tabs.activities': 'الأنشطة',
        'navigation:tabs.about': 'عن إعداد',
        'navigation:tabs.login': 'تسجيل الدخول',
        'navigation:tabs.adaptiveTest': 'امتحان',
        'navigation:tabs.profile': 'حسابي',
        'common.back': 'رجوع',
        'common.logout': 'خروج',
        'common.logoutConfirm': 'هل تريد الخروج من الحساب؟',
        'common.cancel': 'إلغاء',
      };
      return map[key] ?? key;
    },
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

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
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders correct tabs when user is logged out', () => {
    useAuth.mockReturnValue({ user: null, signOut: jest.fn() });

    const { getByText, queryByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    expect(getByText('الرئيسية')).toBeTruthy();
    expect(getByText('قصص النجاح')).toBeTruthy();
    expect(getByText('الأنشطة')).toBeTruthy();
    expect(getByText('عن إعداد')).toBeTruthy();
    expect(getByText('تسجيل الدخول')).toBeTruthy();
    expect(queryByText('حسابي')).toBeNull();
    expect(queryByText('خروج')).toBeNull();
  });

  test('renders compact account switcher when user is logged in', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    const { getAllByText, getByText, queryByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    expect(getByText('الرئيسية')).toBeTruthy();
    expect(getAllByText('حسابي').length).toBeGreaterThan(0);
    expect(queryByText('خروج')).toBeNull();
    expect(queryByText('عن إعداد')).toBeNull();
    expect(queryByText('تسجيل الدخول')).toBeNull();
  });

  test('pressing a tab calls onTabPress with tab id', () => {
    useAuth.mockReturnValue({ user: null, signOut: jest.fn() });

    const { getByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    fireEvent.press(getByText('قصص النجاح'));
    expect(onTabPress).toHaveBeenCalledWith('successStories');

    fireEvent.press(getByText('تسجيل الدخول'));
    expect(onTabPress).toHaveBeenCalledWith('login');
  });

  test('account switcher expands, then profile button navigates to profile', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    const { getAllByText, getByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    fireEvent.press(getAllByText('حسابي')[0]);
    expect(getByText('خروج')).toBeTruthy();

    fireEvent.press(getAllByText('حسابي')[1]);
    expect(onTabPress).toHaveBeenCalledWith('profile');
  });

  test('expanded logout signs out immediately', async () => {
    const signOut = jest.fn().mockResolvedValueOnce(undefined);
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut });

    const { getAllByText, getByText } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    fireEvent.press(getAllByText('حسابي')[0]);
    fireEvent.press(getByText('خروج'));
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(onTabPress).toHaveBeenCalledWith('home');
    });
  });

  test('does not crash when activeTab changes', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    const { getAllByText, getByText, rerender } = render(
      <Navbar activeTab="home" onTabPress={onTabPress} />
    );

    expect(getByText('الرئيسية')).toBeTruthy();

    rerender(<Navbar activeTab="profile" onTabPress={onTabPress} />);
    expect(getAllByText('حسابي').length).toBeGreaterThan(0);
  });
});
