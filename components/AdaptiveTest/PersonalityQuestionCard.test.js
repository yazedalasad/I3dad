// components/AdaptiveTest/PersonalityQuestionCard.test.js
import { fireEvent, render } from '@testing-library/react-native';

/**
 * =========================================================
 * Local-only mocks (DO NOT touch jest.setup.js)
 * =========================================================
 *
 * PersonalityQuestionCard uses:
 *   const { t: rawT, i18n } = useTranslation();
 *   String(i18n.language) ... and i18n.changeLanguage(...)
 *
 * So we MUST provide i18n.language + changeLanguage in the mock.
 *
 * Also t() in this component is key-safe:
 *   if rawT(key) returns key itself, it uses fallback strings.
 * We intentionally return the key so we assert the fallback UI text.
 */

globalThis.__TEST_LANG__ = 'ar';

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // return key itself so component falls back to its Arabic/Hebrew defaults
    t: (key) => key,
    i18n: {
      get language() {
        return globalThis.__TEST_LANG__;
      },
      changeLanguage: jest.fn((next) => {
        globalThis.__TEST_LANG__ = next;
        return Promise.resolve();
      }),
    },
  }),
}));

import PersonalityQuestionCard from './PersonalityQuestionCard';

describe('PersonalityQuestionCard', () => {
  beforeEach(() => {
    globalThis.__TEST_LANG__ = 'ar';
    jest.clearAllMocks();
  });

  /* ---------------------------------------------------------
     SCALE 10
  --------------------------------------------------------- */

  test('renders supported question (scale_10) and shows the Arabic question text', () => {
    const onScaleChange = jest.fn();

    const question = {
      id: 'q1',
      question_type: 'scale_10',
      question_text_ar: 'أحب العمل ضمن فريق',
      question_text_he: 'אני אוהב/ת לעבוד בצוות',
      scale_min: 1,
      scale_max: 10,
    };

    const { getByText } = render(
      <PersonalityQuestionCard
        question={question}
        language="ar"
        scaleValue={null}
        onScaleChange={onScaleChange}
      />
    );

    // Arabic question text is selected when i18n.language != 'he'
    expect(getByText('أحب العمل ضمن فريق')).toBeTruthy();

    // scale buttons exist, press "5"
    fireEvent.press(getByText('5'));
    expect(onScaleChange).toHaveBeenCalledWith(5);
  });

  test('renders supported question (scale_10) in Hebrew when language="he"', () => {
    const onScaleChange = jest.fn();

    const question = {
      id: 'q1',
      question_type: 'scale_10',
      question_text_ar: 'أحب العمل ضمن فريق',
      question_text_he: 'אני אוהב/ת לעבוד בצוות',
      scale_min: 1,
      scale_max: 10,
    };

    const { getByText } = render(
      <PersonalityQuestionCard
        question={question}
        language="he"
        scaleValue={null}
        onScaleChange={onScaleChange}
      />
    );

    // When prop language="he", component syncs i18n to he and uses Hebrew text
    expect(getByText('אני אוהב/ת לעבוד בצוות')).toBeTruthy();

    fireEvent.press(getByText('7'));
    expect(onScaleChange).toHaveBeenCalledWith(7);
  });

  /* ---------------------------------------------------------
     MULTIPLE CHOICE
  --------------------------------------------------------- */

  test('renders multiple_choice options and allows selecting one', () => {
    const onChoiceChange = jest.fn();

    const question = {
      id: 'q2',
      question_type: 'multiple_choice',
      question_text_ar: 'اختر خيارًا',
      question_text_he: 'בחר/י אפשרות',
      options: [
        { ar: 'خيار A', he: 'אפשרות A', en: 'Option A' },
        { ar: 'خيار B', he: 'אפשרות B', en: 'Option B' },
      ],
    };

    const { getByText } = render(
      <PersonalityQuestionCard
        question={question}
        language="ar"
        choiceIndex={null}
        onChoiceChange={onChoiceChange}
      />
    );

    // Arabic labels
    expect(getByText('خيار A')).toBeTruthy();
    expect(getByText('خيار B')).toBeTruthy();

    fireEvent.press(getByText('خيار B'));
    expect(onChoiceChange).toHaveBeenCalledWith(1);
  });

  test('renders "no options" fallback when multiple_choice has empty options (Arabic)', () => {
    const question = {
      id: 'q3',
      question_type: 'multiple_choice',
      question_text_ar: 'سؤال بدون خيارات',
      options: [],
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="ar" />
    );

    // fallback Arabic string inside the component
    expect(getByText('لا توجد خيارات.')).toBeTruthy();
  });

  test('renders "no options" fallback when multiple_choice has empty options (Hebrew)', () => {
    const question = {
      id: 'q3',
      question_type: 'multiple_choice',
      question_text_he: 'שאלה בלי אפשרויות',
      options: [],
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="he" />
    );

    // fallback Hebrew string inside the component
    expect(getByText('אין אפשרויות.')).toBeTruthy();
  });

  /* ---------------------------------------------------------
     OPEN ENDED
  --------------------------------------------------------- */

  test('renders open_ended input with Arabic placeholder and calls onTextChange', () => {
    const onTextChange = jest.fn();

    const question = {
      id: 'q4',
      question_type: 'open_ended',
      question_text_ar: 'اكتب رأيك',
      question_text_he: 'כתוב/כתבי את דעתך',
    };

    const { getByText, getByPlaceholderText } = render(
      <PersonalityQuestionCard
        question={question}
        language="ar"
        textValue=""
        onTextChange={onTextChange}
      />
    );

    expect(getByText('اكتب رأيك')).toBeTruthy();

    // placeholder uses key-safe t() with fallback Arabic string
    const input = getByPlaceholderText('اكتب إجابتك هنا...');

    fireEvent.changeText(input, 'إجابة تجريبية');
    expect(onTextChange).toHaveBeenCalledWith('إجابة تجريبية');
  });

  test('renders open_ended input with Hebrew placeholder when language="he"', () => {
    const onTextChange = jest.fn();

    const question = {
      id: 'q4',
      question_type: 'open_ended',
      question_text_ar: 'اكتب رأيك',
      question_text_he: 'כתוב/כתבי את דעתך',
    };

    const { getByText, getByPlaceholderText } = render(
      <PersonalityQuestionCard
        question={question}
        language="he"
        textValue=""
        onTextChange={onTextChange}
      />
    );

    expect(getByText('כתוב/כתבי את דעתך')).toBeTruthy();

    // Hebrew fallback placeholder
    const input = getByPlaceholderText('כתוב/כתבי כאן...');

    fireEvent.changeText(input, 'תשובה לדוגמה');
    expect(onTextChange).toHaveBeenCalledWith('תשובה לדוגמה');
  });

  /* ---------------------------------------------------------
     UNSUPPORTED / COMING SOON TYPES
  --------------------------------------------------------- */

  test('renders fallback message for unsupported question type (Arabic)', () => {
    const question = {
      id: 'q5',
      question_type: 'UNKNOWN_TYPE',
      question_text_ar: 'سؤال تجريبي',
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="ar" />
    );

    expect(getByText('نوع سؤال غير مدعوم.')).toBeTruthy();
  });

  test('renders "coming soon" message for forced_choice_pair (Arabic)', () => {
    const question = {
      id: 'q6',
      question_type: 'forced_choice_pair',
      question_text_ar: 'اختر بين خيارين',
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="ar" />
    );

    expect(getByText('هذا النوع قيد التطوير.')).toBeTruthy();
  });

  test('renders "coming soon" message for ranking_10 (Hebrew)', () => {
    const question = {
      id: 'q7',
      question_type: 'ranking_10',
      question_text_he: 'דרג/י פריטים',
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="he" />
    );

    expect(getByText('הסוג הזה בפיתוח.')).toBeTruthy();
  });

  /* ---------------------------------------------------------
     SAFETY
  --------------------------------------------------------- */

  test('does not crash when question is null (renders empty text)', () => {
    const { toJSON } = render(<PersonalityQuestionCard question={null} language="ar" />);
    expect(toJSON()).toBeTruthy();
  });
});
