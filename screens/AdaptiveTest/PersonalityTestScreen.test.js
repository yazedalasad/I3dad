// screens/AdaptiveTest/PersonalityTestScreen.test.js
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

/**
 * =========================================================
 * LOCAL-ONLY FIXES (do NOT touch jest.setup.js)
 * =========================================================
 *
 * PersonalityTestScreen uses:
 *   const { t, i18n } = useTranslation('adaptiveTest')
 *   i18n.language + i18n.changeLanguage()
 *
 * Also, RN event listeners must return { remove() } in Jest.
 */

// ✅ i18n mock with i18n.language + changeLanguage
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

// ✅ HARD FIX for "remove" crashes (AppState/Keyboard/Dimensions)
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const makeSub = () => ({ remove: jest.fn() });

  return {
    ...RN,

    AppState: {
      ...RN.AppState,
      currentState: 'active',
      addEventListener: jest.fn(() => makeSub()),
      removeEventListener: jest.fn(),
    },

    Keyboard: {
      ...RN.Keyboard,
      addListener: jest.fn(() => makeSub()),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },

    Dimensions: {
      ...RN.Dimensions,
      addEventListener: jest.fn(() => makeSub()),
      removeEventListener: jest.fn(),
    },
  };
});

// ✅ Expo LinearGradient mock
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

// ✅ Alert spy
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ✅ service mocks
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

// ⛔️ require AFTER mocks
const PersonalityTestScreen = require('./PersonalityTestScreen').default;

// helpers
const flushMicrotasks = () => Promise.resolve();

function baseProps(overrides = {}) {
  return {
    navigateTo: jest.fn(),
    studentId: 'stu-1',
    language: 'ar',
    abilitySessionId: 'ability-1',
    abilityJustFinished: false,
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

function qMultipleChoice({ answered = 0, id = 'q1', text = 'سؤال اختيارات', options = null } = {}) {
  return {
    success: true,
    progress: { answered },
    question: {
      id,
      question_type: 'multiple_choice',
      question_text_ar: text,
      personality_dimensions: { name_ar: 'البعد' },
      options:
        options ??
        [
          { ar: 'خيار 1', he: 'אפשרות 1', en: 'Option 1' },
          { ar: 'خيار 2', he: 'אפשרות 2', en: 'Option 2' },
        ],
    },
  };
}

function qOpenEnded({ answered = 0, id = 'q1', text = 'سؤال مفتوح' } = {}) {
  return {
    success: true,
    progress: { answered },
    question: {
      id,
      question_type: 'open_ended',
      question_text_ar: text,
      personality_dimensions: { name_ar: 'البعد' },
      options: [],
    },
  };
}

function qForcedChoice({ answered = 0, id = 'q1', text = 'اختر بين A/B' } = {}) {
  return {
    success: true,
    progress: { answered },
    question: {
      id,
      question_type: 'forced_choice_pair',
      question_text_ar: text,
      personality_dimensions: { name_ar: 'البعد' },
      options: {
        A: { ar: 'A عربي', he: 'A עברית', en: 'A en' },
        B: { ar: 'B عربي', he: 'B עברית', en: 'B en' },
      },
    },
  };
}

function qRanking10({ answered = 0, id = 'q1', text = 'رتّب العناصر' } = {}) {
  return {
    success: true,
    progress: { answered },
    question: {
      id,
      question_type: 'ranking_10',
      question_text_ar: text,
      personality_dimensions: { name_ar: 'البعد' },
      options: [
        { id: '1', ar: 'عنصر 1', he: 'פריט 1', en: 'Item 1' },
        { id: '2', ar: 'عنصر 2', he: 'פריט 2', en: 'Item 2' },
        { id: '3', ar: 'عنصر 3', he: 'פריט 3', en: 'Item 3' },
      ],
    },
  };
}

describe('PersonalityTestScreen', () => {
  // ✅ Silence the noisy RN prop-type deprecation logs (doesn’t affect other files)
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = (...args) => {
      const msg = String(args?.[0] ?? '');
      if (
        msg.includes('ColorPropType will be removed') ||
        msg.includes('EdgeInsetsPropType will be removed') ||
        msg.includes('PointPropType will be removed') ||
        msg.includes('ViewPropTypes will be removed')
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await flushMicrotasks();
    });
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
      expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(1);
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
     existingPersonalitySessionId — resume flow tests
     ========================================================= */

  it('resume (positive): if existingPersonalitySessionId provided, does NOT call startPersonalityTest', async () => {
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ text: 'سؤال من جلسة موجودة' }));

    render(<PersonalityTestScreen {...baseProps({ existingPersonalitySessionId: 'p-existing-1' })} />);

    await waitFor(() => {
      expect(mockStartPersonalityTest).not.toHaveBeenCalled();
      expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(1);
    });
  });

  it('resume (negative): if existingPersonalitySessionId provided but getQuestion fails, finishes (complete called)', async () => {
    mockGetPersonalityQuestion.mockResolvedValueOnce({ success: false, error: 'DONE' });
    mockCompletePersonalityTest.mockResolvedValueOnce({ success: true, profile: { openness: 10 } });

    const props = baseProps({ existingPersonalitySessionId: 'p-existing-2' });
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(mockCompletePersonalityTest).toHaveBeenCalledTimes(1);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: props.studentId,
          language: props.language,
          personalitySessionId: 'p-existing-2',
        })
      );
    });
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

  it('getPersonalityQuestion (negative): if service returns success:false, finishes and navigates to results', async () => {
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
     (scale_10)
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

    expect(mockGetPersonalityQuestion).toHaveBeenCalledTimes(1);
  });

  /* =========================================================
     submitPersonalityAnswer — additional question types coverage
     ========================================================= */

  it('multiple_choice: selecting one option and submitting calls submitPersonalityAnswer', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-mc' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(
      qMultipleChoice({
        id: 'mc-1',
        text: 'سؤال اختيارات 1',
        options: [
          { ar: 'خيار A', he: 'A', en: 'A' },
          { ar: 'خيار B', he: 'B', en: 'B' },
        ],
      })
    );
    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال اختيارات 1')).toBeTruthy());

    fireEvent.press(getByText('خيار A'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1));

    const args = mockSubmitPersonalityAnswer.mock.calls[0];
    expect(args[0]).toBe('p-sess-mc');
    expect(args[1]).toBe('mc-1');
    expect(args[2]).toMatchObject({
      optionIndex: 0,
      optionTextAr: 'خيار A',
    });
  });

  it('open_ended: typing text and submitting calls submitPersonalityAnswer with textResponse', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-oe' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qOpenEnded({ id: 'oe-1', text: 'سؤال مفتوح 1' }));
    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText, getByPlaceholderText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال مفتوح 1')).toBeTruthy());

    // ✅ real placeholder in UI: "اكتب إجابتك هنا..."
    fireEvent.changeText(getByPlaceholderText('اكتب إجابتك هنا...'), 'إجابة نصية');
    fireEvent.press(getByText('التالي'));

    await waitFor(() => expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1));

    const args = mockSubmitPersonalityAnswer.mock.calls[0];
    expect(args[0]).toBe('p-sess-oe');
    expect(args[1]).toBe('oe-1');
    expect(args[2]).toEqual({ textResponse: 'إجابة نصية' });
  });

  it('forced_choice_pair: choosing A then submit sends { chosen: "A" }', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-fc' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qForcedChoice({ id: 'fc-1', text: 'اختر بين A/B' }));
    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('اختر بين A/B')).toBeTruthy());

    fireEvent.press(getByText('A عربي'));
    fireEvent.press(getByText('التالي'));

    await waitFor(() => expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1));

    const args = mockSubmitPersonalityAnswer.mock.calls[0];
    expect(args[0]).toBe('p-sess-fc');
    expect(args[1]).toBe('fc-1');
    expect(args[2]).toEqual({ chosen: 'A' });
  });

  it('ranking_10: pressing next without ranking still submits (validation requires at least 2 items)', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-rk' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qRanking10({ id: 'rk-1', text: 'رتّب العناصر' }));
    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('رتّب العناصر')).toBeTruthy());

    fireEvent.press(getByText('التالي'));

    await waitFor(() => expect(mockSubmitPersonalityAnswer).toHaveBeenCalledTimes(1));

    const args = mockSubmitPersonalityAnswer.mock.calls[0];
    expect(args[0]).toBe('p-sess-rk');
    expect(args[1]).toBe('rk-1');
    expect(args[2]).toMatchObject({
      order: expect.any(Array),
    });
  });

  /* =========================================================
     completePersonalityTest — navigation targets
     ========================================================= */

  it('completePersonalityTest (positive): fast-finishes when answered >= 12 and navigates to results', async () => {
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

  it('completePersonalityTest (positive): when abilityJustFinished=true, navigates to studentInsightReport', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-insight' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ answered: 12 }));

    mockCompletePersonalityTest.mockResolvedValueOnce({ success: true, profile: { openness: 1 } });

    const props = baseProps({ abilityJustFinished: true, abilitySessionId: 'ability-XYZ' });
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(mockCompletePersonalityTest).toHaveBeenCalledTimes(1);
      expect(props.navigateTo).toHaveBeenCalledWith(
        'studentInsightReport',
        expect.objectContaining({
          studentId: 'stu-1',
          language: 'ar',
          abilitySessionId: 'ability-XYZ',
          personalitySessionId: 'p-sess-insight',
        })
      );
    });
  });

  it('completePersonalityTest (negative): if complete throws, still navigates (results or insight)', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-throw' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ answered: 12 }));
    mockCompletePersonalityTest.mockRejectedValueOnce(new Error('complete broke'));

    const props = baseProps({ abilityJustFinished: false });
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          personalitySessionId: 'p-sess-throw',
        })
      );
    });
  });

  it('completePersonalityTest (negative): if getQuestion returns success:false AND complete throws, still navigates', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-sess-done' });
    mockGetPersonalityQuestion.mockResolvedValueOnce({ success: false, error: 'DONE' });
    mockCompletePersonalityTest.mockRejectedValueOnce(new Error('complete broke'));

    const props = baseProps();
    render(<PersonalityTestScreen {...props} />);

    await waitFor(() => {
      expect(props.navigateTo).toHaveBeenCalledWith(
        'personalityResults',
        expect.objectContaining({
          studentId: 'stu-1',
          personalitySessionId: 'p-sess-done',
        })
      );
    });
  });

  /* =========================================================
     Misc: sanity checks for UI strings / progress presence
     ========================================================= */

  it('renders title "اختبار الشخصية" in Arabic mode', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-ui-1' });
    mockGetPersonalityQuestion.mockResolvedValueOnce(qScale({ text: 'سؤال UI' }));

    const { getByText } = render(<PersonalityTestScreen {...baseProps({ language: 'ar' })} />);

    await waitFor(() => {
      expect(getByText('اختبار الشخصية')).toBeTruthy();
      expect(getByText('سؤال UI')).toBeTruthy();
    });
  });

  it('shows loading question text when loadingQuestion is active (during next question load)', async () => {
    mockStartPersonalityTest.mockResolvedValueOnce({ success: true, sessionId: 'p-load-1' });

    mockGetPersonalityQuestion
      .mockResolvedValueOnce(qScale({ id: 'q1', text: 'سؤال 1' }))
      .mockImplementationOnce(() => new Promise(() => {})); // hang on next question

    mockSubmitPersonalityAnswer.mockResolvedValueOnce({ success: true });

    const { getByText } = render(<PersonalityTestScreen {...baseProps()} />);

    await waitFor(() => expect(getByText('سؤال 1')).toBeTruthy());

    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('التالي'));

    // ✅ real loading UI text: "جاري تحميل السؤال…"
    await waitFor(() => {
      expect(getByText('جاري تحميل السؤال…')).toBeTruthy();
    });
  });
});
