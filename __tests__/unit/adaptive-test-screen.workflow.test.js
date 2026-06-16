/**
 * AdaptiveTestScreen — workflow tests (submit, skip/timeout vs submit API, completion).
 * Aligns with project doc §6.2 (B). Skip/timeout keep the question as "pending" in UI
 * and advance without calling submitComprehensiveAnswer until the student answers from history.
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const descriptors = Object.getOwnPropertyDescriptors(RN);
  delete descriptors.DevMenu;
  const mockRN = {};
  Object.defineProperties(mockRN, descriptors);
  Object.defineProperty(mockRN, 'AppState', {
    configurable: true,
    value: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
  });
  return mockRN;
});

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

const AdaptiveTestScreen = require('../../screens/AdaptiveTest/AdaptiveTestScreen').default;

const flushMicrotasks = () => Promise.resolve();

jest.mock('../../components/AdaptiveTest/ProgressIndicator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function ProgressIndicatorMock(props) {
    return (
      <View testID="progress-indicator">
        <Text>{`current:${String(props?.current ?? '')}`}</Text>
      </View>
    );
  };
});

jest.mock('../../components/AdaptiveTest/QuestionCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function QuestionCardMock(props) {
    const q =
      props?.question?.question_text_ar ||
      props?.question?.question_text_he ||
      'question';
    return (
      <View testID="question-card">
        <Text testID="question-text">{q}</Text>
        <Text testID="pick-A" onPress={() => props?.onAnswerSelect?.('A')}>
          pick A
        </Text>
        <Text testID="skip" onPress={() => props?.onSkipQuestion?.()}>
          skip
        </Text>
      </View>
    );
  };
});

const mockRecordHeartbeat = jest.fn().mockResolvedValue({ success: true });
const mockGetNextQuestion = jest.fn();
const mockSubmitComprehensiveAnswer = jest.fn();
const mockCompleteComprehensiveAssessment = jest.fn().mockResolvedValue({ success: true });

jest.mock('../../services/adaptiveTestService', () => ({
  __esModule: true,
  default: {
    recordHeartbeat: (...args) => mockRecordHeartbeat(...args),
    getNextQuestion: (...args) => mockGetNextQuestion(...args),
    submitComprehensiveAnswer: (...args) => mockSubmitComprehensiveAnswer(...args),
    completeComprehensiveAssessment: (...args) => mockCompleteComprehensiveAssessment(...args),
  },
}));

const mockUpdateAbilitiesFromSession = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/abilityService', () => ({
  __esModule: true,
  default: {
    updateAbilitiesFromSession: (...args) => mockUpdateAbilitiesFromSession(...args),
  },
}));

const mockUpdateInterestsFromSession = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/interestService', () => ({
  __esModule: true,
  default: {
    updateInterestsFromSession: (...args) => mockUpdateInterestsFromSession(...args),
  },
}));

const mockRegenerateRecommendations = jest.fn().mockResolvedValue({ success: true, data: [] });
jest.mock('../../services/recommendationService', () => ({
  __esModule: true,
  regenerateRecommendations: (...args) => mockRegenerateRecommendations(...args),
}));

function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    sessionId: 'sess-1',
    studentId: 'stu-1',
    subjectStates: {
      s1: { questionsAnswered: 0, correctAnswers: 0, targetQuestions: 5 },
    },
    subjectIds: ['s1'],
    language: 'ar',
    isComprehensive: true,
    subjectNames: { s1: 'رياضيات' },
    ...overrides,
  };
}

describe('AdaptiveTestScreen (__tests__/unit — workflow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordHeartbeat.mockReset();
    mockGetNextQuestion.mockReset();
    mockSubmitComprehensiveAnswer.mockReset();
    mockCompleteComprehensiveAssessment.mockReset();
    mockUpdateAbilitiesFromSession.mockReset();
    mockUpdateInterestsFromSession.mockReset();
    mockRegenerateRecommendations.mockReset();
    mockRecordHeartbeat.mockResolvedValue({ success: true });
    mockCompleteComprehensiveAssessment.mockResolvedValue({ success: true });
    mockUpdateAbilitiesFromSession.mockResolvedValue({ success: true });
    mockUpdateInterestsFromSession.mockResolvedValue({ success: true });
    mockRegenerateRecommendations.mockResolvedValue({ success: true, data: [] });
  });
  afterEach(async () => {
    await act(async () => {
      await flushMicrotasks();
    });
  });

  it('loads the first question via adaptiveTestService.getNextQuestion', async () => {
    mockGetNextQuestion.mockResolvedValueOnce({
      success: true,
      question: { id: 'q1', question_text_ar: 'سؤال أول' },
    });
    const { findByTestId } = render(<AdaptiveTestScreen {...baseProps()} />);
    const q = await findByTestId('question-text');
    expect(q.props.children).toBe('سؤال أول');
    expect(mockGetNextQuestion).toHaveBeenCalledTimes(1);
  });

  it('submits an answer via submitComprehensiveAnswer then loads the next question', async () => {
    const nextStates = {
      s1: { questionsAnswered: 1, correctAnswers: 1, targetQuestions: 5 },
    };
    mockGetNextQuestion
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q1', question_text_ar: 'س1' },
      })
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q2', question_text_ar: 'س2' },
      });
    mockSubmitComprehensiveAnswer.mockResolvedValueOnce({
      success: true,
      subjectStates: nextStates,
    });

    const { findByTestId, getByTestId } = render(<AdaptiveTestScreen {...baseProps()} />);
    await findByTestId('question-text');
    await act(async () => {
      fireEvent.press(getByTestId('pick-A'));
      await flushMicrotasks();
    });
    await waitFor(
      () => {
        expect(mockSubmitComprehensiveAnswer).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'sess-1',
            studentId: 'stu-1',
            selectedAnswer: 'A',
            question: expect.objectContaining({ id: 'q1' }),
          })
        );
      },
      { timeout: 3000 }
    );
    await waitFor(() => {
      expect(mockGetNextQuestion).toHaveBeenCalledTimes(2);
    });
  });

  it('skip does not call submitComprehensiveAnswer; advances with getNextQuestion (pending in UI)', async () => {
    mockGetNextQuestion
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q1', question_text_ar: 'س1' },
      })
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q2', question_text_ar: 'س2' },
      });
    const { findByTestId, getByTestId } = render(<AdaptiveTestScreen {...baseProps()} />);
    await findByTestId('question-text');
    await act(async () => {
      fireEvent.press(getByTestId('skip'));
      await flushMicrotasks();
    });
    expect(mockSubmitComprehensiveAnswer).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockGetNextQuestion).toHaveBeenCalledTimes(2);
    });
  });

  it('when ALL_SUBJECTS_COMPLETE, finishes test, updates abilities/interests, navigates to testResults', async () => {
    mockGetNextQuestion.mockResolvedValueOnce({
      success: false,
      error: 'ALL_SUBJECTS_COMPLETE',
    });
    const props = baseProps();
    render(<AdaptiveTestScreen {...props} />);
    await waitFor(() => {
      expect(mockCompleteComprehensiveAssessment).toHaveBeenCalled();
      expect(mockUpdateAbilitiesFromSession).toHaveBeenCalledWith(props.sessionId);
      expect(mockUpdateInterestsFromSession).toHaveBeenCalledWith(props.sessionId);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'testResults',
        expect.objectContaining({
          studentId: props.studentId,
          sessionId: props.sessionId,
          language: 'ar',
          assessmentCompleted: true,
        }),
        { replace: true }
      );
    });
    expect(props.navigateTo).not.toHaveBeenCalledWith(
      'legacyResults',
      expect.anything()
    );
  });
});
