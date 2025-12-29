import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import TotalExamScreen from './TotalExamScreen';

/* -------------------- mocks -------------------- */
const mockGetAllSubjects = jest.fn();
jest.mock('../../services/questionService', () => ({
  __esModule: true,
  default: { getAllSubjects: (...args) => mockGetAllSubjects(...args) },
  getAllSubjects: (...args) => mockGetAllSubjects(...args),
}));

const mockStartComprehensiveAssessment = jest.fn();
jest.mock('../../services/adaptiveTestService', () => ({
  __esModule: true,
  default: { startComprehensiveAssessment: (...args) => mockStartComprehensiveAssessment(...args) },
  startComprehensiveAssessment: (...args) => mockStartComprehensiveAssessment(...args),
}));

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    studentId: 'stu-1',
    studentName: 'طالب',
    ...overrides,
  };
}

async function waitSubjectsLoaded(utils, { expectSubjectName } = {}) {
  // Wait until loading spinner/header finishes by waiting for either a subject name or "no subjects" message.
  await waitFor(() => {
    // title should always exist
    expect(utils.getByText('اختبار شامل')).toBeTruthy();
  });

  if (expectSubjectName) {
    await waitFor(() => {
      expect(utils.getByText(expectSubjectName)).toBeTruthy();
    });
  } else {
    // Just wait for "loading" text to disappear if present
    await waitFor(() => {
      expect(utils.queryByText('جاري تحميل المواد...')).toBeNull();
    });
  }
}

function pressStartButton(utils) {
  // Reliable: press the actual Pressable (there is only one in this screen)
  const btn = utils.UNSAFE_getByType(Pressable);
  fireEvent.press(btn);
}

/* -------------------- tests -------------------- */
describe('TotalExamScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAllSubjects.mockResolvedValue({
      success: true,
      subjects: [
        { id: 's1', name_ar: 'رياضيات' },
        { id: 's2', name_ar: 'لغة عربية' },
      ],
    });

    mockStartComprehensiveAssessment.mockResolvedValue({
      success: true,
      sessionId: 'sess-1',
      studentId: 'stu-1',
      subjectStates: {
        s1: { questionsAnswered: 0, correctAnswers: 0, targetQuestions: 5 },
        s2: { questionsAnswered: 0, correctAnswers: 0, targetQuestions: 5 },
      },
      subjectIds: ['s1', 's2'],
    });
  });

  /* ==================== RENDER: 2 positive + 2 negative ==================== */

  it('render (positive): shows header + start button text', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitSubjectsLoaded(utils);

    expect(utils.getByText('اختبار شامل')).toBeTruthy();
    expect(utils.getAllByText('ابدأ الاختبار').length).toBeGreaterThan(0);
  });

  it('render (positive): shows fetched subjects tiles', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitSubjectsLoaded(utils, { expectSubjectName: 'رياضيات' });

    expect(utils.getByText('لغة عربية')).toBeTruthy();
  });

  it('render (negative): when subjects API returns success=false, shows "no subjects" warning', async () => {
    mockGetAllSubjects.mockResolvedValueOnce({ success: false, error: 'FAILED' });

    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitSubjectsLoaded(utils);

    expect(utils.getByText('لا توجد مواد متاحة حالياً.')).toBeTruthy();
  });

  it('render (negative): when subjects API throws, shows "no subjects" warning', async () => {
    mockGetAllSubjects.mockRejectedValueOnce(new Error('Network down'));

    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitSubjectsLoaded(utils);

    expect(utils.getByText('لا توجد مواد متاحة حالياً.')).toBeTruthy();
  });

  /* ==================== START EXAM: 2 positive + 2 negative ==================== */

  it('start (positive): pressing start navigates to startAdaptiveTest with required fields', async () => {
    const navigateTo = jest.fn();
    const utils = render(<TotalExamScreen {...baseProps({ navigateTo })} />);
    await waitSubjectsLoaded(utils, { expectSubjectName: 'رياضيات' });

    pressStartButton(utils);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith(
        'startAdaptiveTest',
        expect.objectContaining({
          studentId: 'stu-1',
          isComprehensive: true,
          language: 'ar',
          sessionId: 'sess-1',
        })
      );
    });
  });

  it('start (positive): startComprehensiveAssessment is called with min/max questions per subject', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitSubjectsLoaded(utils, { expectSubjectName: 'رياضيات' });

    pressStartButton(utils);

    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'stu-1',
          language: 'ar',
          minQuestionsPerSubject: 5,
          maxQuestionsPerSubject: 7,
          questionsPerSubject: 5,
          subjectIds: expect.arrayContaining(['s1', 's2']),
        })
      );
    });
  });

  it('start (negative): if studentId missing, does NOT navigate', async () => {
    const navigateTo = jest.fn();
    const utils = render(<TotalExamScreen {...baseProps({ navigateTo, studentId: null })} />);
    await waitSubjectsLoaded(utils, { expectSubjectName: 'رياضيات' });

    // In your current component, the button is disabled when !studentId
    // so pressing should not do anything.
    pressStartButton(utils);

    await waitFor(() => {
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });

  it('start (negative): if startComprehensiveAssessment returns success=false, does NOT navigate', async () => {
    mockStartComprehensiveAssessment.mockResolvedValueOnce({
      success: false,
      error: 'START FAILED',
    });

    const navigateTo = jest.fn();
    const utils = render(<TotalExamScreen {...baseProps({ navigateTo })} />);
    await waitSubjectsLoaded(utils, { expectSubjectName: 'رياضيات' });

    pressStartButton(utils);

    await waitFor(() => {
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });
});
