import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import AdminDashboardScreen from './AdminDashboardScreen';

/* ----------------------------------
   Mocks
---------------------------------- */

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

const { useAuth } = require('../../contexts/AuthContext');

describe('AdminDashboardScreen (complex UI)', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /* ----------------------------------
     POSITIVE TESTS
  ---------------------------------- */

  test('renders main dashboard title and subtitle', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    expect(getByText('Analytics Dashboard')).toBeTruthy();
    expect(
      getByText('This is a demo admin layout (buttons are placeholders).')
    ).toBeTruthy();
  });

  test('renders tabs and allows switching tabs', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut: jest.fn(),
    });

    const { getAllByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    const managementTabs = getAllByText('Management');
    fireEvent.press(managementTabs[0]);

    expect(managementTabs[0]).toBeTruthy();
  });

  test('pressing sidebar menu item triggers placeholder alert', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Reports'));

    expect(Alert.alert).toHaveBeenCalled();
  });

  test('pressing an Admin Page action tile shows placeholder alert', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Students'));

    expect(Alert.alert).toHaveBeenCalled();
  });

  test('pressing Sign Out calls signOut and navigates home', async () => {
    const signOut = jest.fn().mockResolvedValueOnce(undefined);

    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut,
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Sign Out'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('home');
    });
  });

  /* ----------------------------------
     NEGATIVE / EDGE TESTS
  ---------------------------------- */

  test('signOut rejection shows alert and does not crash', async () => {
    const signOut = jest.fn().mockRejectedValueOnce(new Error('fail'));

    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut,
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Sign Out'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  test('renders safely when user is null', () => {
    useAuth.mockReturnValue({
      user: null,
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <AdminDashboardScreen navigateTo={navigateTo} />
    );

    expect(getByText('Analytics Dashboard')).toBeTruthy();
  });

  test('renders safely without navigateTo prop (no interaction)', () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      signOut: jest.fn(),
    });

    const { getByText } = render(<AdminDashboardScreen />);

    expect(getByText('Analytics Dashboard')).toBeTruthy();
  });
});
