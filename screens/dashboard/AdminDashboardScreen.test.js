import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import AdminDashboardScreen from './AdminDashboardScreen';
import { getAdminDashboardOverview } from '../../services/adminPanelService';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'ar', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }) => <View>{children}</View>,
  };
});

jest.mock('../../services/adminPanelService', () => ({
  getAdminDashboardOverview: jest.fn(),
}));

const { useAuth } = require('../../contexts/AuthContext');

const overview = {
  stats: {
    students: 10,
    schools: 2,
    principals: 1,
    questions: 30,
    completedSessions: 8,
    incompleteSessions: 3,
    averageScore: '74%',
    topSubject: 'فيزياء',
  },
  charts: {
    testsByDay: [{ label: '01-01', value: 2 }],
    studentsBySubject: [{ label: 'فيزياء', value: 4 }],
    averageBySubject: [{ label: 'رياضيات', value: 70 }],
    gamesUsage: [{ label: 'مهندس الجسور', value: 5 }],
  },
  activities: [{ title: 'طالب جديد سجل', subtitle: 'الآن' }],
  alerts: ['جلسات غير مكتملة'],
  warnings: [],
};

describe('AdminDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getAdminDashboardOverview.mockResolvedValue(overview);
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      profile: { role: 'admin' },
      loading: false,
      signOut: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders admin dashboard overview', async () => {
    const { findByText } = render(<AdminDashboardScreen navigateTo={jest.fn()} />);

    expect(await findByText('لوحة التحكم')).toBeTruthy();
    expect(await findByText('عدد الطلاب الكلي')).toBeTruthy();
    expect(await findByText('عدد الاختبارات خلال آخر 7 أيام')).toBeTruthy();
  });

  test('sign out calls auth and navigates home', async () => {
    const signOut = jest.fn().mockResolvedValueOnce(undefined);
    const navigateTo = jest.fn();
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      profile: { role: 'admin' },
      loading: false,
      signOut,
    });

    const { findByText } = render(<AdminDashboardScreen navigateTo={navigateTo} />);
    fireEvent.press(await findByText('خروج'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('home');
    });
  });

  test('blocks non-admin users', async () => {
    useAuth.mockReturnValue({
      user: { email: 'principal@test.com' },
      profile: { role: 'principal' },
      loading: false,
      signOut: jest.fn(),
    });

    const { findByText } = render(<AdminDashboardScreen navigateTo={jest.fn()} />);
    expect(await findByText(/مخصصة للأدمن فقط/)).toBeTruthy();
  });
});
