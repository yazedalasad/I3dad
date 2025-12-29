import { act, render, waitFor } from '@testing-library/react-native';
import AdaptiveTestScreen from './AdaptiveTestScreen';

// Works even when jest.useFakeTimers() is enabled
const flushMicrotasks = () => Promise.resolve();

/* -------------------- AppState mock -------------------- */
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
  };
});

/* -------------------- UI mocks -------------------- */
jest.mock('../../components/AdaptiveTest/ProgressIndicator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function ProgressIndicatorMock(props) {
    return (
      <View testID="progress-indicator">
        <Text>{`current:${String(props?.current ?? '')}`}</Text>
        <Text>{`total:${String(props?.total ?? '')}`}</Text>
        <Text>{`timeLeft:${String(props?.timeLeft ?? '')}`}</Text>
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

        {/* "buttons" (Text with onPress) */}
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

/* -------------------- Service mocks (names must start with mock*) -------------------- */
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

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    sessionId: 'sess-1',
    studentId: 'stu-1',
    subjectStates: {
      s1: { questionsAnswered: 0, correctAnswers: 0, targetQuestions: 1 },
    },
    subjectIds: ['s1'],
    language: 'ar',
    isComprehensive: true,
    subjectNames: { s1: 'رياضيات' },
    ...overrides,
  };
}

describe('AdaptiveTestScreen', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // prevent any interval/timer from leaking between tests
    jest.clearAllTimers();
    await act(async () => {
      await flushMicrotasks();
    });
  });

  it('if sessionId or studentId missing, it should not call getNextQuestion', () => {
    render(<AdaptiveTestScreen {...baseProps({ sessionId: null })} />);
    expect(mockGetNextQuestion).not.toHaveBeenCalled();
  });

  it('shows loading then renders a question', async () => {
    mockGetNextQuestion.mockResolvedValueOnce({
      success: true,
      question: { id: 'q1', question_text_ar: 'سؤال تجريبي' },
    });

    const { getByText, findByTestId } = render(<AdaptiveTestScreen {...baseProps()} />);

    // ⚠️ Must match your screen text EXACTLY.
    // If your screen uses "جارٍ تحميل السؤال." then change this line.
    expect(getByText('جارٍ تحميل السؤال...')).toBeTruthy();

    const q = await findByTestId('question-text');
    expect(q.props.children).toBe('سؤال تجريبي');

    expect(mockGetNextQuestion).toHaveBeenCalledTimes(1);
  });

  it('calls recordHeartbeat every 15s', async () => {
    mockGetNextQuestion.mockResolvedValueOnce({
      success: true,
      question: { id: 'q1', question_text_ar: 'سؤال' },
    });

    render(<AdaptiveTestScreen {...baseProps()} />);

    await waitFor(() => expect(mockGetNextQuestion).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(15000);
      await flushMicrotasks();
    });

    expect(mockRecordHeartbeat).toHaveBeenCalled();
    expect(mockRecordHeartbeat.mock.calls[0][0]).toMatchObject({
      sessionId: 'sess-1',
      studentId: 'stu-1',
      eventType: 'heartbeat',
    });
  });

  it('navigates to personalityTest when ALL_SUBJECTS_COMPLETE happens', async () => {
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
        'personalityTest',
        expect.objectContaining({
          studentId: props.studentId,
          language: 'ar',
          abilitySessionId: props.sessionId,
          subjectNames: props.subjectNames,
        })
      );
    });
  });

  it('skip requests next question again', async () => {
    mockGetNextQuestion
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q1', question_text_ar: 'سؤال 1' },
      })
      .mockResolvedValueOnce({
        success: true,
        question: { id: 'q2', question_text_ar: 'سؤال 2' },
      });

    const { findByTestId, getByTestId } = render(<AdaptiveTestScreen {...baseProps()} />);

    const q1 = await findByTestId('question-text');
    expect(q1.props.children).toBe('سؤال 1');

    await act(async () => {
      getByTestId('skip').props.onPress();
      await flushMicrotasks();
    });

    expect(mockGetNextQuestion).toHaveBeenCalledTimes(2);

    const q2 = await findByTestId('question-text');
    expect(q2.props.children).toBe('سؤال 2');
  });
});
