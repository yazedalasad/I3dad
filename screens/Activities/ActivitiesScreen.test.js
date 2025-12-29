import { render, waitFor } from '@testing-library/react-native';
import ActivitiesScreen from './ActivitiesScreen';

// -------------------- MOCKS --------------------

// ✅ React Navigation (common cause of hook timeouts / unmounted component)
jest.mock('@react-navigation/native', () => {
  return {
    // if your screen uses useNavigation()
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      isFocused: jest.fn(() => true),
    }),

    // if your screen uses useRoute()
    useRoute: () => ({ params: {} }),

    // if your screen uses useFocusEffect()
    useFocusEffect: (cb) => {
      // run immediately in tests
      cb();
    },

    // sometimes screens use useIsFocused()
    useIsFocused: () => true,
  };
});

// ✅ mock ActivityDetailsModal (tested separately)
jest.mock('./ActivityDetailsModal', () => {
  return function MockModal() {
    return null;
  };
});

// ✅ mock auth (make it controllable)
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// ✅ mock supabase (flexible chain so screen doesn't crash/unmount)
jest.mock('../../config/supabase', () => {
  const makeQuery = (finalResult = { data: [], error: null }) => {
    const query = {};

    // chainable methods (return query)
    const chain = () => query;

    query.select = jest.fn(chain);
    query.eq = jest.fn(chain);
    query.neq = jest.fn(chain);
    query.in = jest.fn(chain);
    query.ilike = jest.fn(chain);
    query.gte = jest.fn(chain);
    query.lte = jest.fn(chain);
    query.lt = jest.fn(chain);
    query.gt = jest.fn(chain);
    query.order = jest.fn(async () => finalResult);
    query.limit = jest.fn(chain);
    query.range = jest.fn(chain);
    query.single = jest.fn(async () => finalResult);
    query.maybeSingle = jest.fn(async () => finalResult);

    return query;
  };

  const supabase = {
    from: jest.fn(() => makeQuery()),
  };

  // expose helper so we can swap results per test if needed
  supabase.__makeQuery = makeQuery;

  return { supabase };
});

// -------------------- TESTS --------------------
const { useAuth } = require('../../contexts/AuthContext');
const { supabase } = require('../../config/supabase');

describe('ActivitiesScreen (unit/component tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // default auth
    useAuth.mockReturnValue({ user: { id: 'test-user' } });

    // default supabase result = empty list
    supabase.from.mockImplementation(() => supabase.__makeQuery({ data: [], error: null }));
  });

  // ✅ Positive 1: renders loading state
  it('shows loading indicator initially', async () => {
    const { findByText } = render(<ActivitiesScreen />);

    // using findByText avoids timing flakiness
    expect(await findByText('جاري تحميل الفعاليات…')).toBeTruthy();
  });

  // ✅ Positive 2: renders empty state when no activities exist
  it('renders empty state when activities list is empty', async () => {
    const { findByText } = render(<ActivitiesScreen />);
    expect(await findByText('ما في فعاليات حالياً')).toBeTruthy();
  });

  // ✅ Positive 3: renders hero title
  it('renders hero section title', async () => {
    const { findByText } = render(<ActivitiesScreen />);
    expect(await findByText('فعاليات بتقرّبك من حلمك 🎯')).toBeTruthy();
  });

  // ❌ Negative 1: does not crash if user is null
  it('does not crash when user is null', async () => {
    useAuth.mockReturnValueOnce({ user: null });

    const { findByText } = render(<ActivitiesScreen />);
    expect(await findByText('ما في فعاليات حالياً')).toBeTruthy();
  });

  // ❌ Negative 2: refresh action does not throw (basic stability test)
  it('does not crash when refreshing', async () => {
    const { getByText } = render(<ActivitiesScreen />);

    // wait until empty state appears (means fetch finished)
    await waitFor(() => {
      expect(getByText('ما في فعاليات حالياً')).toBeTruthy();
    });

    // If you later add a RefreshControl or button, trigger it here.
    // For now this test ensures the screen reaches stable state without throwing.
  });
});
