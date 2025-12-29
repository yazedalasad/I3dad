import { fireEvent, render } from '@testing-library/react-native';
import StudentProfileScreen from './StudentProfileScreen';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

const { useAuth } = require('../../contexts/AuthContext');

describe('StudentProfileScreen', () => {
  const navigateTo = jest.fn();

  test('renders student name and stats', () => {
    useAuth.mockReturnValue({
      user: { email: 'a@test.com' },
      studentData: { first_name: 'Ali', last_name: 'Ahmad', points: 10 },
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <StudentProfileScreen navigateTo={navigateTo} />
    );

    expect(getByText('Ali Ahmad')).toBeTruthy();
    expect(getByText('Points')).toBeTruthy();
  });

  test('navigate to edit profile', () => {
    useAuth.mockReturnValue({
      user: {},
      studentData: {},
      signOut: jest.fn(),
    });

    const { getByText } = render(
      <StudentProfileScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Edit'));
    expect(navigateTo).toHaveBeenCalledWith('editProfile');
  });
});
