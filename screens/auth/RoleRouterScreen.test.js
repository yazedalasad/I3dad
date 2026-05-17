import { render, waitFor } from '@testing-library/react-native';
import RoleRouterScreen from './RoleRouterScreen';

/* -------------------- i18n mock -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (k) => k }),
}));

/* -------------------- AuthContext mock -------------------- */
let mockAuthState = { user: null, loading: false };

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockAuthState,
}));

/* -------------------- Supabase mock -------------------- */
const mockMaybeSinglePrincipals = jest.fn();
const mockMaybeSingleProfiles = jest.fn();
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();

// NOTE: must start with "mock" because used inside jest.mock factory
const mockChainPrincipals = {
  select: jest.fn(() => mockChainPrincipals),
  eq: jest.fn(() => mockChainPrincipals),
  maybeSingle: (...args) => mockMaybeSinglePrincipals(...args),
};

const mockChainProfiles = {
  select: jest.fn(() => mockChainProfiles),
  eq: jest.fn(() => mockChainProfiles),
  maybeSingle: (...args) => mockMaybeSingleProfiles(...args),
};

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      getUser: (...args) => mockGetUser(...args),
    },
    from: (table) => {
      if (table === 'principals') return mockChainPrincipals;
      if (table === 'user_profiles') return mockChainProfiles;
      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockMaybeSingleProfiles.mockResolvedValue({ data: null, error: null });
  mockMaybeSinglePrincipals.mockResolvedValue({ data: null, error: null });
});



  it('render (positive): shows pleaseWait hint', async () => {
    mockAuthState = { user: null, loading: true };

    const utils = render(<RoleRouterScreen {...baseProps()} />);

    await waitFor(() => {
      expect(utils.getByText('الرجاء الانتظار...')).toBeTruthy();
    });
  });

  it('render (negative): if not logged in and not loading -> navigates login and does NOT query profile tables', async () => {
    mockAuthState = { user: null, loading: false };
    const navigateTo = jest.fn();

    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('login', {}, { replace: true });
      expect(mockMaybeSinglePrincipals).not.toHaveBeenCalled();
      expect(mockMaybeSingleProfiles).not.toHaveBeenCalled();
    });
  });

  it('render (negative): if auth loading=true -> does NOT navigate yet', async () => {
    mockAuthState = { user: null, loading: true };
    const navigateTo = jest.fn();

    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });

  /* =========================
   * ROUTING FLOW: 2 positive + 2 negative
   * ========================= */

 

  

  it('route (negative): principal exists but inactive -> falls through to home', async () => {
    mockAuthState = { user: { id: 'u3' }, loading: false };

    mockMaybeSinglePrincipals.mockResolvedValueOnce({
      data: { user_id: 'u3', is_active: false },
      error: null,
    });

    mockMaybeSingleProfiles.mockResolvedValueOnce({ data: { role: 'student' }, error: null });

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('home', {}, { replace: true });
    });
  });

  it('route (positive): app metadata admin -> navigates admin dashboard', async () => {
    mockAuthState = {
      user: { id: 'u-admin', app_metadata: { role: 'admin' } },
      loading: false,
      profile: null,
    };

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('adminDashboard', {}, { replace: true });
    });
  });

  it('route (security): user metadata admin is ignored without trusted role source', async () => {
    mockAuthState = {
      user: { id: 'u-user-meta-admin', user_metadata: { role: 'admin' } },
      loading: false,
      profile: null,
    };
    mockMaybeSingleProfiles.mockResolvedValueOnce({ data: { role: 'student' }, error: null });

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('home', {}, { replace: true });
      expect(navigateTo).not.toHaveBeenCalledWith('adminDashboard', {}, { replace: true });
    });
  });

  it('route (positive): database profile admin -> navigates admin dashboard', async () => {
    mockAuthState = {
      user: { id: 'u-admin-db', user_metadata: {} },
      loading: false,
      profile: null,
    };
    mockMaybeSingleProfiles.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('adminDashboard', {}, { replace: true });
    });
  });

  it('route (negative): supabase throws -> catches and navigates home', async () => {
    mockAuthState = { user: { id: 'u4' }, loading: false };

    mockMaybeSinglePrincipals.mockRejectedValueOnce(new Error('DB DOWN'));

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('home', {}, { replace: true });
    });
  });

  it('route (positive): fresh session admin -> navigates admin dashboard', async () => {
    mockAuthState = { user: null, loading: false, profile: null };
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'fresh-admin', app_metadata: { role: 'admin' }, user_metadata: {} } } },
      error: null,
    });

    const navigateTo = jest.fn();
    render(<RoleRouterScreen {...baseProps({ navigateTo })} />);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith('adminDashboard', {}, { replace: true });
    });
  });

