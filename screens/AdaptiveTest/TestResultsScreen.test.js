import { fireEvent, render, waitFor } from '@testing-library/react-native';
import TestResultsScreen from './TestResultsScreen';

/* -------------------- UI child mocks (NO out-of-scope vars) -------------------- */
jest.mock('../../components/AdaptiveTest/RadarChart', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function RadarChartMock() {
    return React.createElement(View, { testID: 'radar-chart' });
  };
});

/* -------------------- AuthContext mock -------------------- */
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ studentData: { id: 'stu-1' } }),
}));

/* -------------------- Supabase chain mocks (chainable eq/other) -------------------- */
const mockSupabaseFrom = jest.fn();
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

function mockSupabaseReturn({ data, error }) {
  const response = { data, error };

  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve(response)),
    maybeSingle: jest.fn(() => Promise.resolve(response)),
    then: (resolve) => Promise.resolve(response).then(resolve),
    catch: (reject) => Promise.resolve(response).catch(reject),
  };

  mockSupabaseFrom.mockReturnValue(chain);
  return chain;
}

describe('TestResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseReturn({
      data: [
        {
          subject_id: 's1',
          questions_answered: 10,
          correct_answers: 7,
          subjects: { id: 's1', name_ar: 'رياضيات' },
        },
      ],
      error: null,
    });
  });

  it('renders results (positive): shows title, subject name, and percentage', async () => {
    const navigateTo = jest.fn();

    const { getByText, getAllByText } = render(
      <TestResultsScreen navigateTo={navigateTo} sessionId="sess-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('نتائج الاختبار')).toBeTruthy();
      expect(getByText('رياضيات')).toBeTruthy();

      // could appear more than once in the UI
      const pct = getAllByText(/70%/);
      expect(pct.length).toBeGreaterThan(0);
    });
  });

  it('navigation (positive): pressing review answers navigates with sessionId', async () => {
    const navigateTo = jest.fn();

    const { getByText } = render(
      <TestResultsScreen navigateTo={navigateTo} sessionId="sess-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('مراجعة الإجابات')).toBeTruthy();
    });

    fireEvent.press(getByText('مراجعة الإجابات'));
    expect(navigateTo).toHaveBeenCalledWith('reviewAnswers', { sessionId: 'sess-1' });
  });

  it('supabase (negative): if query returns error, screen still renders (no crash)', async () => {
    mockSupabaseReturn({
      data: null,
      error: { message: 'DB error' },
    });

    const navigateTo = jest.fn();

    const { getByText } = render(
      <TestResultsScreen navigateTo={navigateTo} sessionId="sess-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('نتائج الاختبار')).toBeTruthy();
    });
  });

  it('data (negative): if data is empty array, screen still renders (no crash)', async () => {
    mockSupabaseReturn({
      data: [],
      error: null,
    });

    const navigateTo = jest.fn();

    const { getByText, queryByText } = render(
      <TestResultsScreen navigateTo={navigateTo} sessionId="sess-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('نتائج الاختبار')).toBeTruthy();
    });

    expect(queryByText('رياضيات')).toBeNull();
  });
});
