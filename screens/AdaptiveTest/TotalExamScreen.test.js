// screens/AdaptiveTest/TotalExamScreen.test.js
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable } from 'react-native';

/**
 * =========================================================
 * Local-only mocks (DO NOT touch jest.setup.js)
 * =========================================================
 * - This screen uses expo-linear-gradient and vector icons.
 * - It also uses react-i18next with i18n.language + changeLanguage.
 * - We mock them here so this test is stable without changing global setup.
 */

/* -------------------- expo-linear-gradient mock -------------------- */
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props, props.children),
  };
});

/* -------------------- vector-icons mock -------------------- */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, null, `icon:${name}`);
  return {
    Ionicons: Icon,
    FontAwesome: Icon,
    MaterialIcons: Icon,
    MaterialCommunityIcons: Icon,
  };
});

/* -------------------- i18n mock (IMPORTANT) -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // force fallbacks: when rawT(key) === key, component uses fallback strings
    t: (k) => k,
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

/* -------------------- services mocks -------------------- */
const mockGetAllSubjects = jest.fn();
jest.mock('../../services/questionService', () => ({
  __esModule: true,
  getAllSubjects: (...args) => mockGetAllSubjects(...args),
}));

const mockStartComprehensiveAssessment = jest.fn();
jest.mock('../../services/adaptiveTestService', () => ({
  __esModule: true,
  default: {
    startComprehensiveAssessment: (...args) =>
      mockStartComprehensiveAssessment(...args),
  },
}));

/* -------------------- import AFTER mocks -------------------- */
const TotalExamScreen = require('./TotalExamScreen').default;

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    studentId: 'stu-1',
    studentName: 'طالب',
    language: 'ar',
    ...overrides,
  };
}

/**
 * Waits until the header exists and loading is finished
 * (either subjects appear OR the warning appears).
 */
async function waitScreenReady(utils) {
  // Real fallback title in the screen is: "الامتحان الشامل"
  await waitFor(() => {
    expect(utils.getByText('الامتحان الشامل')).toBeTruthy();
  });

  // Then wait until loading state is done:
  // Either subject tiles show, or "no subjects" warning shows, or loading text disappears.
  await waitFor(() => {
    const loadingStillThere = utils.queryByText('جاري تحميل المواد...');
    const noSubjects = utils.queryByText('لا توجد مواد متاحة حالياً.');
    const hasAnySubject =
      utils.queryByText('رياضيات') || utils.queryByText('لغة عربية');

    // at least one must be true that indicates loading ended
    expect(Boolean(noSubjects || hasAnySubject || !loadingStillThere)).toBe(true);
  });
}

/** Press the screen's single start Pressable */
function pressStart(utils) {
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

  /* ==================== RENDER ==================== */

  it('render (positive): shows header title and start button label', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitScreenReady(utils);

    // Real fallback title:
    expect(utils.getByText('الامتحان الشامل')).toBeTruthy();

    // Real start button fallback:
    expect(utils.getByText('ابدأ الامتحان')).toBeTruthy();
  });

  it('render (positive): shows fetched subject tiles', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitScreenReady(utils);

    expect(utils.getByText('رياضيات')).toBeTruthy();
    expect(utils.getByText('لغة عربية')).toBeTruthy();

    // Included badge fallback text exists on every tile
    expect(utils.getAllByText('مُضمن').length).toBeGreaterThan(0);
  });

  it('render (negative): when subjects API returns success=false, shows "no subjects" warning', async () => {
    mockGetAllSubjects.mockResolvedValueOnce({ success: false, error: 'FAILED' });

    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitScreenReady(utils);

    expect(utils.getByText('لا توجد مواد متاحة حالياً.')).toBeTruthy();
  });

  it('render (negative): when subjects API throws, shows "no subjects" warning', async () => {
    mockGetAllSubjects.mockRejectedValueOnce(new Error('Network down'));

    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitScreenReady(utils);

    expect(utils.getByText('لا توجد مواد متاحة حالياً.')).toBeTruthy();
  });

  /* ==================== START EXAM ==================== */

  it('start (positive): pressing start navigates to startAdaptiveTest with required fields', async () => {
    const navigateTo = jest.fn();

    const utils = render(<TotalExamScreen {...baseProps({ navigateTo })} />);
    await waitScreenReady(utils);

    pressStart(utils);

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith(
        'startAdaptiveTest',
        expect.objectContaining({
          sessionId: 'sess-1',
          studentId: 'stu-1',
          language: 'ar',
          isComprehensive: true,
        })
      );
    });
  });

  it('start (positive): service called with min/max questions and subjectIds', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitScreenReady(utils);

    pressStart(utils);

    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'stu-1',
          language: 'ar',
          minQuestionsPerSubject: 5,
          maxQuestionsPerSubject: 7,
          questionsPerSubject: 5,
          subjectIds: ['s1', 's2'],
        })
      );
    });
  });

  it('start (negative): if studentId missing, it does NOT call service and does NOT navigate', async () => {
    const navigateTo = jest.fn();

    const utils = render(
      <TotalExamScreen {...baseProps({ navigateTo, studentId: null })} />
    );
    await waitScreenReady(utils);

    // Button is disabled when studentId is missing, but we still press to be safe.
    pressStart(utils);

    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).not.toHaveBeenCalled();
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });

  it('start (negative): if service returns success=false, it does NOT navigate', async () => {
    mockStartComprehensiveAssessment.mockResolvedValueOnce({
      success: false,
      error: 'START FAILED',
    });

    const navigateTo = jest.fn();

    const utils = render(<TotalExamScreen {...baseProps({ navigateTo })} />);
    await waitScreenReady(utils);

    pressStart(utils);

    await waitFor(() => {
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });
});
