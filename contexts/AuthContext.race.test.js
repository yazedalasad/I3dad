import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext';

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('../config/supabase', () => ({
  requireSupabase: () => ({
    auth: {
      getSession: (...args) => mockGetSession(...args),
      signUp: (...args) => mockSignUp(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signOut: (...args) => mockSignOut(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
    },
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  }),
}));

jest.mock('../services/studentIdentityService', () => ({
  isStudentIdTaken: jest.fn().mockResolvedValue(false),
}));

function AuthProbe({ onReady }) {
  const auth = useAuth();
  if (onReady) onReady(auth);
  return <Text testID="auth-probe">{auth.authBusy ? 'busy' : 'idle'}</Text>;
}

function buildTableMock({ insertError = null } = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: insertError }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  return chain;
}

describe('AuthContext race guards', () => {
  let authRef = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authRef = null;

    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockFrom.mockImplementation(() => buildTableMock());
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                data: {
                  session: { access_token: 'token' },
                  user: { id: 'user-1', email: 'student@gmail.com', app_metadata: { role: 'student' } },
                },
                error: null,
              }),
            30
          );
        })
    );
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'user-new', email: 'new@gmail.com' },
        session: { access_token: 'signup-token' },
      },
      error: null,
    });
  });

  function renderAuth() {
    render(
      <AuthProvider>
        <AuthProbe
          onReady={(auth) => {
            authRef = auth;
          }}
        />
      </AuthProvider>
    );
  }

  it('blocks concurrent signIn calls while the first request is in flight', async () => {
    renderAuth();

    await waitFor(() => {
      expect(authRef).toBeTruthy();
      expect(authRef.initializingAuth).toBe(false);
    });

    let firstResult;
    let secondResult;

    await act(async () => {
      const firstPromise = authRef.signIn('student@gmail.com', 'Password123!');
      const secondPromise = authRef.signIn('student@gmail.com', 'Password123!');
      [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    });

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(false);
    expect(secondResult.error.message).toMatch(/already in progress/i);
  });

  it('rolls back the auth session when student insert fails during signup', async () => {
    mockFrom.mockImplementation(() =>
      buildTableMock({
        insertError: { message: 'duplicate key value violates unique constraint "students_student_id_unique_idx"' },
      })
    );

    renderAuth();

    await waitFor(() => {
      expect(authRef).toBeTruthy();
      expect(authRef.initializingAuth).toBe(false);
    });

    let result;
    await act(async () => {
      result = await authRef.signUp('new@gmail.com', 'Password123!Aa', {
        studentId: '123456782',
        firstName: 'Test',
        lastName: 'Student',
        phone: '0501234567',
        birthday: '2010-01-01',
        schoolName: 'School',
        schoolId: 'school-1',
        grade: 10,
        classSection: 'alef',
      });
    });

    expect(result.success).toBe(false);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
