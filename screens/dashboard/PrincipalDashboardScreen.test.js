import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import PrincipalDashboardScreen from './PrincipalDashboardScreen';

// --------------------
// Mocks
// --------------------
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { useAuth } = require('../../contexts/AuthContext');
const { supabase } = require('../../config/supabase');

// Helper: mock a Supabase query chain safely
const mockSupabase = (responses = {}) => {
  supabase.from.mockImplementation((table) => {
    const result = responses[table] || { data: null, error: null };

    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => result,
        }),
      }),
    };
  });
};

describe('PrincipalDashboardScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================
  // ✅ POSITIVE TESTS (4)
  // =========================

  test('POSITIVE: shows loading indicator initially', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });
    mockSupabase(); // unresolved, stays loading

    const { getByText } = render(
      <PrincipalDashboardScreen navigateTo={navigateTo} />
    );

    expect(getByText(/loading/i)).toBeTruthy();
  });

  test('POSITIVE: renders dashboard when principal exists', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    mockSupabase({
      principals: {
        data: {
          school_id: 's1',
          full_name: 'Principal Name',
          school_name: 'Kai School',
          city_he: 'Beer Sheva',
        },
        error: null,
      },
    });

    const { findByText } = render(
      <PrincipalDashboardScreen navigateTo={navigateTo} />
    );

    expect(await findByText(/principal dashboard/i)).toBeTruthy();
  });

  test('POSITIVE: Sign Out calls signOut and navigates home', async () => {
    const signOut = jest.fn().mockResolvedValueOnce(undefined);
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut });

    mockSupabase({
      principals: {
        data: {
          school_id: 's1',
          full_name: 'Principal Name',
        },
        error: null,
      },
    });

    const { findByText, getByText } = render(
      <PrincipalDashboardScreen navigateTo={navigateTo} />
    );

    await findByText(/principal dashboard/i);

    fireEvent.press(getByText('Sign Out'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('home');
    });
  });

  test('POSITIVE: dashboard renders even if school_id is missing', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    mockSupabase({
      principals: {
        data: {
          school_id: null,
          full_name: 'Principal Name',
        },
        error: null,
      },
    });

    const { findByText } = render(
      <PrincipalDashboardScreen navigateTo={navigateTo} />
    );

    expect(await findByText(/principal dashboard/i)).toBeTruthy();
  });

  // =========================
  // ❌ NEGATIVE TESTS (4)
  // =========================

  test('NEGATIVE: no user -> redirects to login safely', async () => {
    useAuth.mockReturnValue({ user: null, signOut: jest.fn() });
    mockSupabase();

    render(<PrincipalDashboardScreen navigateTo={navigateTo} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('login');
    });
  });

  test('NEGATIVE: user is not a principal -> shows access denied alert and navigates home', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    mockSupabase({
      principals: {
        data: null, // not a principal
        error: null,
      },
    });

    render(<PrincipalDashboardScreen navigateTo={navigateTo} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Access denied',
        'Your account is not registered as a principal.'
      );
      expect(navigateTo).toHaveBeenCalledWith('home');
    });
  });

  test('NEGATIVE: supabase error -> shows error alert and stops loading', async () => {
  useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

  mockSupabase({
    principals: {
      data: null,
      error: { message: 'DB error' },
    },
  });

  render(<PrincipalDashboardScreen navigateTo={navigateTo} />);

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to load principal data.'
    );
  });
});


  test('NEGATIVE: missing navigateTo prop does not crash', async () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, signOut: jest.fn() });

    mockSupabase({
      principals: {
        data: {
          school_id: 's1',
          full_name: 'Principal Name',
        },
        error: null,
      },
    });

    const { findByText } = render(<PrincipalDashboardScreen />);

    // If it renders, the test passes (no crash)
    expect(await findByText(/principal dashboard/i)).toBeTruthy();
  });
});
