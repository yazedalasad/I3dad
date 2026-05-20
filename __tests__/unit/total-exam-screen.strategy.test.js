/**
 * TotalExamScreen — unit coverage aligned with project doc §6.2 (B).
 * Mocks are local so this file runs regardless of global jest.setup.js.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props, props.children),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, null, `icon:${name}`);
  return { Ionicons: Icon, FontAwesome: Icon, MaterialIcons: Icon, MaterialCommunityIcons: Icon };
});

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

const mockGetAllSubjects = jest.fn();
jest.mock('../../services/questionService', () => ({
  __esModule: true,
  getAllSubjects: (...args) => mockGetAllSubjects(...args),
}));

const mockStartComprehensiveAssessment = jest.fn();
jest.mock('../../services/adaptiveTestService', () => ({
  __esModule: true,
  default: {
    startComprehensiveAssessment: (...args) => mockStartComprehensiveAssessment(...args),
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: (...args) => mockUseAuth(...args),
}));

const TotalExamScreen = require('../../screens/AdaptiveTest/TotalExamScreen').default;

function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    studentId: 'stu-1',
    studentName: 'طالب',
    language: 'ar',
    ...overrides,
  };
}

async function waitForArabicHeader(utils) {
  await waitFor(() => {
    expect(utils.getByText('الامتحان الشامل')).toBeTruthy();
  });
  await waitFor(() => {
    const loading = utils.queryByText('جاري تحميل المواد...');
    const noSubjects = utils.queryByText('لا توجد مواد متاحة حالياً.');
    const hasSubject = utils.queryByText('رياضيات');
    expect(Boolean(!loading || noSubjects || hasSubject)).toBe(true);
  });
}

describe('TotalExamScreen (__tests__/unit — strategy)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      studentData: {
        id: 'stu-auth',
        first_name: 'Test',
        last_name: 'Student',
        school_name: 'School',
        grade: 10,
        birthday: '2007-05-19',
      },
      studentDataLoading: false,
      studentId: 'stu-auth',
      loading: false,
      user: null,
    });
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
      subjectStates: {},
      subjectIds: ['s1', 's2'],
    });
  });

  it('loads subjects from questionService and shows Arabic names', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitForArabicHeader(utils);
    expect(mockGetAllSubjects).toHaveBeenCalled();
    expect(utils.getByText('رياضيات')).toBeTruthy();
    expect(utils.getByText('لغة عربية')).toBeTruthy();
  });

  it('auto-selects all subjects so startComprehensiveAssessment receives every subject id', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitForArabicHeader(utils);
    fireEvent.press(utils.getByTestId('total-exam-start-button'));
    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          subjectIds: expect.arrayContaining(['s1', 's2']),
          minQuestionsPerSubject: 5,
          maxQuestionsPerSubject: 7,
        })
      );
    });
    expect(mockStartComprehensiveAssessment.mock.calls[0][0].subjectIds).toHaveLength(2);
  });

  it('starts comprehensive assessment with minQuestionsPerSubject 5 and maxQuestionsPerSubject 7', async () => {
    const utils = render(<TotalExamScreen {...baseProps()} />);
    await waitForArabicHeader(utils);
    fireEvent.press(utils.getByTestId('total-exam-start-button'));
    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          minQuestionsPerSubject: 5,
          maxQuestionsPerSubject: 7,
          questionsPerSubject: 5,
        })
      );
    });
  });

  it('prevents start when studentId is missing (no service call, no navigation)', async () => {
    mockUseAuth.mockReturnValue({
      studentData: null,
      studentDataLoading: false,
      studentId: null,
      loading: false,
      user: null,
    });
    const navigateTo = jest.fn();
    const utils = render(<TotalExamScreen {...baseProps({ navigateTo, studentId: null })} />);
    await waitForArabicHeader(utils);
    fireEvent.press(utils.getByTestId('total-exam-start-button'));
    expect(
      utils.getByText('تعذر العثور على ملف الطالب. سجل الدخول بحساب طالب صالح ثم جرب مرة أخرى.')
    ).toBeTruthy();
    await waitFor(() => {
      expect(mockStartComprehensiveAssessment).not.toHaveBeenCalled();
      expect(navigateTo).not.toHaveBeenCalled();
    });
  });
});
