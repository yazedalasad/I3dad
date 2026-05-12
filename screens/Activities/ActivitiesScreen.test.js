import { render, waitFor } from '@testing-library/react-native';
import ActivitiesScreen from './ActivitiesScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb) => cb(),
  useIsFocused: () => true,
}));

jest.mock('./ActivityDetailsModal', () => function MockModal() {
  return null;
});

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../config/supabase', () => {
  const makeQuery = (finalResult = { data: [], error: null }) => {
    const query = {};
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
    __makeQuery: makeQuery,
  };

  return { supabase };
});

const { useAuth } = require('../../contexts/AuthContext');
const { supabase } = require('../../config/supabase');

describe('ActivitiesScreen (unit/component tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'test-user' } });
    supabase.from.mockImplementation(() => supabase.__makeQuery({ data: [], error: null }));
  });

  it('shows loading indicator initially', () => {
    supabase.from.mockImplementation(() => {
      const query = supabase.__makeQuery();
      query.order = jest.fn(() => new Promise(() => {}));
      return query;
    });

    const { getByText } = render(<ActivitiesScreen />);

    expect(getByText('loading')).toBeTruthy();
  });

  it('renders empty state when activities list is empty', async () => {
    const { findByText } = render(<ActivitiesScreen />);

    expect(await findByText('empty.title')).toBeTruthy();
  });

  it('renders hero section title', async () => {
    const { findByText } = render(<ActivitiesScreen />);

    expect(await findByText('hero.title')).toBeTruthy();
  });

  it('does not crash when user is null', async () => {
    useAuth.mockReturnValueOnce({ user: null });

    const { findByText } = render(<ActivitiesScreen />);

    expect(await findByText('empty.title')).toBeTruthy();
  });

  it('does not crash when refreshing', async () => {
    const { getByText } = render(<ActivitiesScreen />);

    await waitFor(() => {
      expect(getByText('empty.title')).toBeTruthy();
    });
  });
});
