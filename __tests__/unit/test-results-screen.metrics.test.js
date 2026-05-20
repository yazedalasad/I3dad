/**
 * TestResultsScreen — accuracy, overall score, Arabic names, empty rows.
 * Supabase client is mocked (from → select → eq chain).
 */
import { render, waitFor } from '@testing-library/react-native';

let mockLanguage = 'ar';

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: mockLanguage,
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockSupabaseFrom = jest.fn();
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

const mockGetStudentJourneySnapshot = jest.fn();
jest.mock('../../services/studentJourneyService', () => ({
  __esModule: true,
  getStudentJourneySnapshot: (...args) => mockGetStudentJourneySnapshot(...args),
}));

const TestResultsScreen = require('../../screens/AdaptiveTest/TestResultsScreen').default;

function createChain(response, extra = {}) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve(response)),
    then: (resolve, reject) => Promise.resolve(response).then(resolve, reject),
    catch: (reject) => Promise.resolve(response).catch(reject),
    ...extra,
  };
  return chain;
}

function mockDb({ session, subjects, sessionError = null, subjectError = null } = {}) {
  mockSupabaseFrom.mockImplementation((table) => {
    if (table === 'test_sessions') {
      return createChain({ data: session, error: sessionError });
    }
    if (table === 'test_session_subjects') {
      return createChain({ data: subjects, error: subjectError });
    }
    return createChain({ data: null, error: null });
  });
}

describe('TestResultsScreen (__tests__/unit — metrics)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = 'ar';
    mockUseAuth.mockReturnValue({ studentData: { id: 'student-1' } });
    mockGetStudentJourneySnapshot.mockResolvedValue({ success: true, data: { recommendations: [] } });
  });

  it('loads test_session_subjects via supabase.from().select().eq()', async () => {
    const session = {
      id: 'sess-1',
      student_id: 'student-1',
      final_score: null,
      skipped_questions: 0,
      total_time_seconds: 0,
    };
    const subjects = [
      {
        subject_id: 'math',
        questions_answered: 10,
        correct_answers: 9,
        subjects: { name_ar: 'رياضيات', name_he: 'מתמטיקה' },
      },
    ];
    mockDb({ session, subjects });
    render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );
    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('test_session_subjects');
    });
  });

  it('shows per-subject accuracy and overall score from answered totals (72% for 13/18)', async () => {
    const session = {
      id: 'sess-1',
      student_id: 'student-1',
      skipped_questions: 0,
      total_time_seconds: 120,
    };
    const subjects = [
      {
        subject_id: 'math',
        questions_answered: 10,
        correct_answers: 9,
        subjects: { name_ar: 'رياضيات' },
      },
      {
        subject_id: 'logic',
        questions_answered: 8,
        correct_answers: 4,
        subjects: { name_ar: 'تفكير منطقي' },
      },
    ];
    mockDb({ session, subjects });
    const { getAllByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );
    await waitFor(() => {
      expect(getAllByText(/72%/).length).toBeGreaterThan(0);
      expect(getAllByText('90%').length).toBeGreaterThan(0);
      expect(getAllByText('50%').length).toBeGreaterThan(0);
    });
  });

  it('displays Arabic subject names when available', async () => {
    mockDb({
      session: { id: 'sess-1', student_id: 'student-1' },
      subjects: [
        {
          subject_id: 'x',
          questions_answered: 4,
          correct_answers: 4,
          subjects: { name_ar: 'فيزياء', name_he: 'פיזיקה' },
        },
      ],
    });
    const { getAllByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );
    await waitFor(() => {
      expect(getAllByText('فيزياء').length).toBeGreaterThan(0);
    });
  });

  it('handles empty subject rows with compact empty copy', async () => {
    mockDb({
      session: { id: 'sess-1', student_id: 'student-1' },
      subjects: [],
    });
    const { getByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );
    await waitFor(() => {
      expect(getByText('لا توجد نتائج مواد لهذه الجلسة بعد.')).toBeTruthy();
    });
  });
});
