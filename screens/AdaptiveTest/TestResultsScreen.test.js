// screens/AdaptiveTest/TestResultsScreen.test.js
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

/**
 * =========================================================
 * LOCAL FIXES ONLY (do NOT touch jest.setup.js)
 * =========================================================
 */

// ---------- i18n ----------
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key) => key, // force fallback strings
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

// ---------- RadarChart ----------
jest.mock('../../components/AdaptiveTest/RadarChart', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function RadarChartMock() {
    return React.createElement(View, { testID: 'radar-chart' });
  };
});

// ---------- AuthContext ----------
const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

// ---------- Supabase ----------
const mockSupabaseFrom = jest.fn();
jest.mock('../../config/supabase', () => ({
  __esModule: true,
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

    then: (resolve) => Promise.resolve(response).then(resolve),
    catch: (reject) => Promise.resolve(response).catch(reject),
  };

  mockSupabaseFrom.mockReturnValue(chain);
  return chain;
}

// ⛔ IMPORTANT: import AFTER mocks
const TestResultsScreen = require('./TestResultsScreen').default;

describe('TestResultsScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();

    // default auth
    mockUseAuth.mockReturnValue({
      studentData: { id: 'student-1' },
    });

    // default DB response
    mockSupabaseReturn({
      data: [
        {
          subject_id: 'math',
          questions_answered: 10,
          correct_answers: 7,
          is_complete: true,
          metadata: {},
          subjects: {
            name_ar: 'رياضيات',
            name_en: 'Math',
            name_he: 'מתמטיקה',
          },
        },
      ],
      error: null,
    });

    // silence noisy logs
    console.log = (...args) => {
      const msg = String(args?.[0] ?? '');
      if (
        msg.includes('Results query error') ||
        msg.includes('TestResultsScreen error')
      ) {
        return;
      }
      originalConsoleLog(...args);
    };
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('renders title, subject name and percentage', async () => {
    const navigateTo = jest.fn();

    const { getByText, getAllByText, getByTestId } = render(
      <TestResultsScreen
        navigateTo={navigateTo}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => {
      expect(getByText('نتائج الاختبار')).toBeTruthy();
      expect(getByText('رياضيات')).toBeTruthy();
      expect(getAllByText(/70%/).length).toBeGreaterThan(0);
      expect(getByTestId('radar-chart')).toBeTruthy();
    });
  });

  it('pressing "مراجعة" navigates to reviewAnswers with sessionId + language', async () => {
    const navigateTo = jest.fn();

    const { getByText } = render(
      <TestResultsScreen
        navigateTo={navigateTo}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => getByText('نتائج الاختبار'));

    fireEvent.press(getByText('مراجعة'));

    expect(navigateTo).toHaveBeenCalledWith('reviewAnswers', {
      sessionId: 'sess-1',
      language: 'ar',
    });
  });

  it('pressing "رجوع" navigates back to adaptiveTest', async () => {
    const navigateTo = jest.fn();

    const { getByText } = render(
      <TestResultsScreen
        navigateTo={navigateTo}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => getByText('نتائج الاختبار'));

    fireEvent.press(getByText('رجوع'));

    expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
  });

  it('shows alert if Supabase returns error', async () => {
    mockSupabaseReturn({
      data: null,
      error: { message: 'DB error' },
    });

    render(
      <TestResultsScreen
        navigateTo={jest.fn()}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  it('renders empty state when no subject data', async () => {
    mockSupabaseReturn({
      data: [],
      error: null,
    });

    const { getByText, queryByText } = render(
      <TestResultsScreen
        navigateTo={jest.fn()}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => getByText('نتائج الاختبار'));

    expect(queryByText('رياضيات')).toBeNull();
    expect(getByText('لا توجد نتائج مواد لهذه الجلسة.')).toBeTruthy();
  });

  it('guards: missing studentId shows alert and does not query DB', async () => {
    mockUseAuth.mockReturnValue({ studentData: null });

    render(
      <TestResultsScreen
        navigateTo={jest.fn()}
        sessionId="sess-1"
        language="ar"
      />
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('guards: missing sessionId shows alert and does not query DB', async () => {
    render(
      <TestResultsScreen
        navigateTo={jest.fn()}
        sessionId={null}
        language="ar"
      />
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});
