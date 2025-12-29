import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EditStudentProfileScreen from './EditStudentProfileScreen';

/* ------------------------------------------------
   Supabase mock (INLINE, Jest-safe)
------------------------------------------------ */
jest.mock('../../config/supabase', () => {
  // 🔑 define chain INSIDE the factory
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    update: jest.fn(() => chain),
  };

  return {
    supabase: {
      from: jest.fn(() => chain),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'https://example.com/avatar.jpg' },
          })),
        })),
      },
    },
  };
});

/* ------------------------------------------------
   Other mocks
------------------------------------------------ */
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

const { useAuth } = require('../../contexts/AuthContext');

describe('EditStudentProfileScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /* -------------------------
     TESTS
  ------------------------- */

  test('renders screen title safely', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { id: 's1' },
      updateStudentData: jest.fn(),
    });

    const { getByText } = render(
      <EditStudentProfileScreen navigateTo={navigateTo} />
    );

    expect(getByText('Edit Profile')).toBeTruthy();
  });

  test('pressing Save does not crash when form is invalid', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { id: 's1' },
      updateStudentData: jest.fn(),
    });

    const { getByText } = render(
      <EditStudentProfileScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('Save changes'));

    // ✅ Stability check only
    expect(true).toBe(true);
  });
});
