import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PersonalityTestScreen from './PersonalityTestScreen';

/* -------------------- HARD FIX for "remove" crashes -------------------- */
/**
 * In Jest, RN event listeners often return undefined.
 * RN expects subscriptions with .remove(), so we must return { remove: fn }.
 */
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  const makeSub = () => ({ remove: jest.fn() });

  return {
    ...RN,

    // AppState listeners sometimes used by RN internals
    AppState: {
      ...RN.AppState,
      currentState: 'active',
      addEventListener: jest.fn(() => makeSub()),
      removeEventListener: jest.fn(),
    },

    // KeyboardAvoidingView / TextInput can attach keyboard listeners
    Keyboard: {
      ...RN.Keyboard,
      addListener: jest.fn(() => makeSub()),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },

    // RN internals can listen to dimensions changes
    Dimensions: {
      ...RN.Dimensions,
      addEventListener: jest.fn(() => makeSub()),
      removeEventListener: jest.fn(),
    },
  };
});

/* -------------------- Expo mock -------------------- */
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

/* -------------------- Alert spy -------------------- */
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* -------------------- Service mocks -------------------- */
const mockStartPersonalityTest = jest.fn();
const mockGetPersonalityQuestion = jest.fn();
const mockSubmitPersonalityAnswer = jest.fn();
const mockCompletePersonalityTest = jest.fn();

jest.mock('../../services/personalityTestService', () => ({
  __esModule: true,
  startPersonalityTest: (...args) => mockStartPersonalityTest(...args),
  getPersonalityQuestion: (...args) => mockGetPersonalityQuestion(...args),
  submitPersonalityAnswer: (...args) => mockSubmitPersonalityAnswer(...args),
  completePersonalityTest: (...args) => mockCompletePersonalityTest(...args),
}));

/* -------------------- helpers -------------------- */
function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    studentId: 'stu-1',
    language: 'ar',
    abilitySessionId: 'ability-1',
    existingPersonalitySessionId: null,
    ...overrides,
  };
}

function qScale({ answered = 0, id = 'q1', text = 'سؤال شخصية 1' } = {}) {
  return {
    success: true,
    progress: { answered },
    question: {
      id,
      question_type: 'scale_10',
      question_text_ar: text,
      personality_dimensions: { name_ar: 'البعد' },
      options: [],
    },
  };
}

describe('PersonalityTestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* =========================================================
     startPersonalityTest — 2 positive + 2 negative
     ========================================================= */

  it('startPersonalityTest (positive): starts session on mount when no existing session', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale());

    render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => {
      expect(mockStartPersonalityTest).toHaveBeenCalledTimes(1);
    });
  });

  it('startPersonalityTest (positive): called with correct studentId and language', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-2' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale());

    render(<PersonalityTestScreen {...baseProps({ studentId: 'stu-999', language: 'he' })} />);

    await waitFor(() => {
      expect(mockStartPersonalityTest).toHaveBeenCalledTimes(1);
    });

    const args = mockStartPersonalityTest.mock.calls[0];
    expect(args[0]).toBe('stu-999');
    expect(args[1]).toBe('he');
  });

  it('startPersonalityTest (negative): if studentId missing, shows alert and does NOT start', async () => {
    render(<PersonalityTestScreen {...baseProps({ studentId: null })} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockStartPersonalityTest).not.toHaveBeenCalled();
    expect(mockGetPersonalityQuestion).not.toHaveBeenCalled();
  });

  it('startPersonalityTest (negative): if start fails, shows alert and does NOT load question', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: false, error: 'FAILED START' });

    render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockGetPersonalityQuestion).not.toHaveBeenCalled();
  });

  /* =========================================================
     getPersonalityQuestion — 2 positive + 2 negative
     ========================================================= */

  it('getPersonalityQuestion (positive): loads first question and renders it', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ text: 'سؤال شخصية 1' }));

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => {
      expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(1);
      expect(getByText('سؤال شخصية 1')).toBeTruthy();
    });
  });

  it('getPersonalityQuestion (positive): after a successful submit, loads next question again', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });

    mockGetPersonalityQuestion
      .mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }))
      .mockResolvedValueOnce(qScale({ id: 'q2', text: 'سؤال 2', answered: 1 }));

    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال 1')).toBeTruthy());

    fireEvent.press(getByText('5'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => {
      expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(2);
      expect(getByText('سؤال 2')).toBeTruthy();
    });
  });

  it('getPersonalityQuestion (negative): if service returns success:false, finishes and navigates', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce({ success: false, error: 'DONE' });

    mockCompletePersonalityTest.mockResolvedValueOnce({ success: true, profile: { openness: 50 } });

    const props = baseProps();
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(mockCompletePersonalityTest).toHaveBeenCalledTimes(1);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          language: 'ar',
          abilitySessionId: 'ability-1',
          personalitySessionId: 'p-sess-1',
        })
      );
    });
  });

  it('getPersonalityQuestion (negative): if service throws, shows alert', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockRejectedValueOnce(new Error('boom'));

    render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  /* =========================================================
     submitPersonalityAnswer — 2 positive + 2 negative
     ========================================================= */

  it('submitPersonalityAnswer (positive): submits correct payload for scale_10', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });

    mockGetPersonalityQuestion
      .mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }))
      .mockResolvedValueOnce(qScale({ id: 'q2', text: 'سؤال 2', answered: 1 }));

    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال 1')).toBeTruthy());

    fireEvent.press(getByText('7'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1));

    const args = mockSubmitPersonalityAnswer.mock.calls[0];
    expect(args[0]).toBe('p-sess-1');
    expect(args[1]).toBe('q1');
    expect(args[2]).toEqual({ scaleValue: 7 });
    expect(typeof args[3]).toBe('number');
  });

  it('submitPersonalityAnswer (positive): after submit success, calls getPersonalityQuestion again', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });

    mockGetPersonalityQuestion
      .mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }))
      .mockResolvedValueOnce(qScale({ id: 'q2', text: 'سؤال 2', answered: 1 }));

    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال 1')).toBeTruthy());

    fireEvent.press(getByText('3'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => {
      expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1);
      expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(2);
      expect(getByText('سؤال 2')).toBeTruthy();
    });
  });

  it('submitPersonalityAnswer (negative): pressing Next without choosing scale shows alert and does NOT submit', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }));

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('التالي')).toBeTruthy());

    fireEvent.press(getByText('التالي'));

    expect(alertSpy).toHaveBeenCalled();
    expect(mockSubmitPersonalityAnswer).not.toHaveBeenCalled();
  });

  it('submitPersonalityAnswer (negative): if submit returns success:false, shows alert and does NOT load next', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }));

    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: false, error: 'FAILED SUBMIT' });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال 1')).toBeTruthy());

    fireEvent.press(getByText('4'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1);
    });

    // submit failed -> should not load a second question
    expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(1);
  });

  /* =========================================================
     completePersonalityTest — 2 positive + 2 negative
     ========================================================= */

  it('completePersonalityTest (positive): fast-finishes when answered >= 12 and navigates', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ answered: 12 }));

    mockCompletePersonalityTest.mockResolvedValueOnce({ success: true, profile: { openness: 50 } });

    const props = baseProps();
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(mockCompletePersonalityTest).toHaveBeenCalledTimes(1);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          language: 'ar',
          abilitySessionId: 'ability-1',
          personalitySessionId: 'p-sess-1',
        })
      );
    });
  });

  it('completePersonalityTest (positive): pressing إنهاء الاختبار triggers complete and navigates', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }));

    mockCompletePersonalityTest.mockResolvedValueOnce({ success: true, profile: { openness: 10 } });

    const props = baseProps();
    const { getByText } = render(<PersonalityTestScreen {...props} />);

    await waitFor(() => expect(getByText('إنهاء الاختبار')).toBeTruthy());

    fireEvent.press(getByText('إنهاء الاختبار'));

    await waitFor(() => {
      expect(mockCompletePersonalityTest).toHaveBeenCalledTimes(1);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          personalitySessionId: 'p-sess-1',
        })
      );
    });
  });

  it('completePersonalityTest (negative): if complete throws, still navigates to results', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ answered: 12 }));

    mockCompletePersonalityTest.mockRejectedValueOnce(new Error('complete broke'));

    const props = baseProps();
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          personalitySessionId: 'p-sess-1',
        })
      );
    });
  });

  it('completePersonalityTest (negative): if getQuestion returns success:false and complete throws, still navigates', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce({ success: false, error: 'DONE' });

    mockCompletePersonalityTest.mockRejectedValueOnce(new Error('complete broke'));

    const props = baseProps();
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          personalitySessionId: 'p-sess-1',
        })
      );
    });
  });
});
