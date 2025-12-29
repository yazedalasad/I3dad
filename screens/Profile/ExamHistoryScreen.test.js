import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ExamHistoryScreen from './ExamHistoryScreen';

/* ------------------------------------------------
   Supabase mock (INLINE, Jest-safe)
------------------------------------------------ */
jest.mock('../../config/supabase', () => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn().mockResolvedValue({
      data: [],       // empty exam history
      error: null,
    }),
  };

  return {
    supabase: {
      from: jest.fn(() => chain),
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

describe('ExamHistoryScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------
  // EMPTY STATE
  // -----------------------------
  test('shows empty state when no sessions', async () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { id: 's1' }, // REQUIRED
    });

    const { getByText } = render(
      <ExamHistoryScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('لا يوجد اختبارات مكتملة بعد.')).toBeTruthy();
    });
  });

  // -----------------------------
  // NAVIGATION
  // -----------------------------
  test('back button navigates to profile', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1' },
      studentData: { id: 's1' },
    });

    const { getByText } = render(
      <ExamHistoryScreen navigateTo={navigateTo} />
    );

    fireEvent.press(getByText('arrow-left'));
    expect(navigateTo).toHaveBeenCalledWith('profile');
  });
});
