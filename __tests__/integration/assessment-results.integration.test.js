/**
 * Integration-style test: results screen + mocked Supabase + journey snapshot in one flow.
 */
import { render, waitFor } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (k) => k,
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({ studentData: { id: 'stu-int' } }),
}));

const mockSupabaseFrom = jest.fn();
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args) => mockSupabaseFrom(...args),
  },
}));

jest.mock('../../services/studentJourneyService', () => ({
  __esModule: true,
  getStudentJourneySnapshot: jest.fn(() =>
    Promise.resolve({ success: true, data: { recommendations: [] } })
  ),
}));

const TestResultsScreen = require('../../screens/AdaptiveTest/TestResultsScreen').default;

function sessionQueryPromise(session) {
  return Promise.resolve({ data: session, error: null });
}

function subjectQueryPromise(rows) {
  return Promise.resolve({ data: rows, error: null });
}

describe('Assessment results integration (mocked Supabase)', () => {
  it('resolves test_sessions and test_session_subjects in parallel for a session', async () => {
    mockSupabaseFrom.mockImplementation((table) => {
      if (table === 'test_sessions') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() =>
                sessionQueryPromise({
                  id: 'sess-int',
                  student_id: 'stu-int',
                  skipped_questions: 0,
                  total_time_seconds: 30,
                })
              ),
            })),
          })),
        };
      }
      if (table === 'test_session_subjects') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() =>
              subjectQueryPromise([
                {
                  subject_id: 's1',
                  questions_answered: 5,
                  correct_answers: 5,
                  subjects: { name_ar: 'علوم-تكامل' },
                },
              ])
            ),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => subjectQueryPromise(null)),
        })),
      };
    });

    const screen = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-int" studentId="stu-int" language="ar" />
    );

    await waitFor(() => {
      expect(mockSupabaseFrom).toHaveBeenCalledWith('test_sessions');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('test_session_subjects');
      expect(screen.getByText('نتائج الاختبار الشامل')).toBeTruthy();
    });
    expect(screen.getAllByText('علوم-تكامل').length).toBeGreaterThan(0);
  });
});
