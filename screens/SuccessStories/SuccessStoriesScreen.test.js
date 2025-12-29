import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SuccessStoriesScreen from './SuccessStoriesScreen';

/* ------------------------------------------------
   GLOBAL alert MOCK (CRITICAL FIX)
------------------------------------------------ */
beforeAll(() => {
  global.alert = jest.fn();
});

afterAll(() => {
  delete global.alert;
});

/* ------------------------------------------------
   Supabase mock (INLINE, Jest-safe)
------------------------------------------------ */
jest.mock('../../config/supabase', () => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn().mockResolvedValue({
      data: [],
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
   Auth + i18n mocks
------------------------------------------------ */
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

const { useAuth } = require('../../contexts/AuthContext');

describe('SuccessStoriesScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------
     LOADING STATE
  -------------------------------- */
  test('renders loading state initially', () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    expect(getByText('جاري تحميل القصص...')).toBeTruthy();
  });

  /* --------------------------------
     EMPTY STATE
  -------------------------------- */
  test('renders empty stories state after load', async () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('لا توجد قصص')).toBeTruthy();
    });
  });

  /* --------------------------------
     CTA NAVIGATION (GUEST)
  -------------------------------- */
  test('CTA button navigates to signup when user is not logged in', async () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      fireEvent.press(getByText('سجل لحسابك'));
    });

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  /* --------------------------------
     CTA NAVIGATION (LOGGED IN)
  -------------------------------- */
  test('CTA button navigates to submitStory when user is logged in', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      fireEvent.press(getByText('شارك قصتك'));
    });

    expect(navigateTo).toHaveBeenCalledWith('submitStory');
  });
});
