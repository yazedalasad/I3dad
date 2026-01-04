// screens/SuccessStories/SuccessStoriesScreen.test.js

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SuccessStoriesScreen from './SuccessStoriesScreen';

/* =========================================================
   Alert mock (REAL one, not global)
========================================================= */
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* =========================================================
   Supabase mock – FULL chain, stable
========================================================= */
jest.mock('../../config/supabase', () => {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn().mockResolvedValue({
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

/* =========================================================
   Auth mock
========================================================= */
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

/* =========================================================
   i18n mock – RETURNS KEYS (important!)
========================================================= */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
    i18n: { language: 'ar' },
  }),
}));

/* =========================================================
   Icons mock
========================================================= */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

const { useAuth } = require('../../contexts/AuthContext');

describe('SuccessStoriesScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------------------------------
     LOADING STATE
  -------------------------------------------------------- */
  it('renders loading state initially', () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    // because t(k) === k
    expect(getByText('loading.title')).toBeTruthy();
  });

  /* -------------------------------------------------------
     EMPTY STATE
  -------------------------------------------------------- */
  it('renders empty state after stories load', async () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('empty.title')).toBeTruthy();
      expect(getByText('empty.text')).toBeTruthy();
    });
  });

  /* -------------------------------------------------------
     CTA – guest user
  -------------------------------------------------------- */
  it('CTA navigates to signup when user is not logged in', async () => {
    useAuth.mockReturnValue({ user: null });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      fireEvent.press(getByText('hero.buttonGuest'));
    });

    expect(navigateTo).toHaveBeenCalledWith('signup');
  });

  /* -------------------------------------------------------
     CTA – logged in user
  -------------------------------------------------------- */
  it('CTA navigates to submitStory when user is logged in', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' } });

    const { getByText } = render(
      <SuccessStoriesScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      fireEvent.press(getByText('hero.buttonLoggedIn'));
    });

    expect(navigateTo).toHaveBeenCalledWith('submitStory');
  });
});
