// screens/AdaptiveTest/TestResultsScreen.test.js
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

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

const TestResultsScreen = require('./TestResultsScreen').default;

const sessionRow = {
  id: 'sess-1',
  student_id: 'student-1',
  status: 'completed',
  skipped_questions: 2,
  total_time_seconds: 245,
  engagement_score: 88,
  metadata: {},
};

const subjectRows = [
  {
    subject_id: 'math',
    questions_answered: 10,
    correct_answers: 9,
    subjects: { name_ar: 'رياضيات', name_he: 'מתמטיקה', name_en: 'Math' },
  },
  {
    subject_id: 'logic',
    questions_answered: 8,
    correct_answers: 4,
    subjects: { name_ar: 'تفكير منطقي', name_he: 'חשיבה לוגית', name_en: 'Logical thinking' },
  },
];

const journeyData = {
  recommendations: [
    {
      degree_id: 'major-1',
      name: 'هندسة برمجيات',
      score_percent: 91,
      confidence_score: 82,
      explanation: 'ملائم بسبب الأداء القوي في الرياضيات.',
      institutions: [
        {
          institution_id: 'inst-1',
          institution_name: 'كلية الجليل',
          city: 'حيفا',
          region: 'north',
          type: 'college',
          program_name: 'هندسة برمجيات',
        },
      ],
    },
    {
      degree_id: 'major-2',
      name: 'تحليل بيانات',
      score_percent: 76,
      confidence_score: 65,
      explanation: 'ملائم لقدرات التحليل.',
      institutions: [
        {
          institution_id: 'inst-1',
          institution_name: 'كلية الجليل',
          city: 'حيفا',
          region: 'north',
          type: 'college',
          program_name: 'تحليل بيانات',
        },
      ],
    },
  ],
};

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

function mockDb({ session = sessionRow, subjects = subjectRows, sessionError = null, subjectError = null } = {}) {
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

describe('TestResultsScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = 'ar';
    mockUseAuth.mockReturnValue({ studentData: { id: 'student-1' } });
    mockDb();
    mockGetStudentJourneySnapshot.mockResolvedValue({ success: true, data: journeyData });
  });

  it('renders a modern Arabic assessment report with subjects, recommendations and institutions', async () => {
    const { getByText, getAllByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('نتائج الاختبار الشامل')).toBeTruthy();
      expect(getByText('أداء المواد')).toBeTruthy();
      expect(getAllByText('رياضيات').length).toBeGreaterThan(0);
      expect(getAllByText(/90%/).length).toBeGreaterThan(0);
      expect(getByText('تخصصات مقترحة لك')).toBeTruthy();
      expect(getByText('هندسة برمجيات')).toBeTruthy();
      expect(getByText('جامعات وكليات مناسبة')).toBeTruthy();
      expect(getByText('كلية الجليل')).toBeTruthy();
    });
  });

  it('renders Hebrew RTL copy safely', async () => {
    mockLanguage = 'he';
    const { getByText, getAllByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="he" />
    );

    await waitFor(() => {
      expect(getByText('תוצאות המבחן המלא')).toBeTruthy();
      expect(getByText('ביצועים לפי מקצוע')).toBeTruthy();
      expect(getAllByText('מתמטיקה').length).toBeGreaterThan(0);
    });
  });

  it('renders English LTR copy safely', async () => {
    mockLanguage = 'en';
    const { getByText, getAllByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="en" />
    );

    await waitFor(() => {
      expect(getByText('Full Assessment Results')).toBeTruthy();
      expect(getByText('Subject performance')).toBeTruthy();
      expect(getAllByText('Math').length).toBeGreaterThan(0);
    });
  });

  it('shows compact empty states when subjects and recommendations are missing', async () => {
    mockDb({ subjects: [] });
    mockGetStudentJourneySnapshot.mockResolvedValue({ success: true, data: { recommendations: [] } });

    const { getByText } = render(
      <TestResultsScreen navigateTo={jest.fn()} sessionId="sess-1" studentId="student-1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('لا توجد نتائج مواد لهذه الجلسة بعد.')).toBeTruthy();
      expect(getByText('لم تظهر توصيات كافية بعد. أكمل الاختبار أو الألعاب لتحسين النتائج.')).toBeTruthy();
      expect(getByText('لا توجد مؤسسات مرتبطة بالتخصصات المقترحة حالياً.')).toBeTruthy();
    });
  });

  it('shows recommendation refresh warning without blocking the report', async () => {
    const { getByText } = render(
      <TestResultsScreen
        navigateTo={jest.fn()}
        sessionId="sess-1"
        studentId="student-1"
        language="ar"
        recommendationRefreshError="failed"
      />
    );

    await waitFor(() => {
      expect(getByText('تم حفظ الامتحان، لكن تحديث التوصيات يحتاج إعادة محاولة.')).toBeTruthy();
      expect(getByText('نتائج الاختبار الشامل')).toBeTruthy();
    });
  });

  it('navigates to recommendations, institutions, profile, review, and retake actions', async () => {
    const navigateTo = jest.fn();
    const { getByText, getAllByText } = render(
      <TestResultsScreen navigateTo={navigateTo} sessionId="sess-1" studentId="student-1" language="ar" />
    );

    await waitFor(() => getByText('نتائج الاختبار الشامل'));

    fireEvent.press(getAllByText('عرض التوصيات الكاملة')[0]);
    fireEvent.press(getByText('عرض الجامعات والكليات المناسبة'));
    fireEvent.press(getByText('الانتقال إلى البروفايل'));
    fireEvent.press(getByText('مراجعة الإجابات'));
    fireEvent.press(getByText('إعادة الاختبار لاحقاً'));

    expect(navigateTo).toHaveBeenCalledWith('recommendations', expect.objectContaining({ studentId: 'student-1' }));
    expect(navigateTo).toHaveBeenCalledWith('universitiesAndColleges', expect.objectContaining({ studentId: 'student-1' }));
    expect(navigateTo).toHaveBeenCalledWith('profile', expect.objectContaining({ studentId: 'student-1' }));
    expect(navigateTo).toHaveBeenCalledWith('reviewAnswers', { sessionId: 'sess-1', language: 'ar' });
    expect(navigateTo).toHaveBeenCalledWith('adaptiveTest');
  });

  it('guards missing student or session before querying data', async () => {
    mockUseAuth.mockReturnValue({ studentData: null });

    render(<TestResultsScreen navigateTo={jest.fn()} sessionId={null} language="ar" />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});
