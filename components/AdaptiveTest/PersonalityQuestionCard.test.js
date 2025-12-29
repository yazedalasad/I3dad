import { fireEvent, render } from '@testing-library/react-native';
import PersonalityQuestionCard from './PersonalityQuestionCard';

describe('PersonalityQuestionCard', () => {
  test('renders supported question (scale_10) and shows the question text', () => {
    const onScaleChange = jest.fn();

    const question = {
      id: 'q1',
      question_type: 'scale_10',
      question_text_ar: 'أحب العمل ضمن فريق',
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

    // ✅ question text is rendered from question.question_text_ar
    expect(getByText('أحب العمل ضمن فريق')).toBeTruthy();

    // ✅ scale buttons exist (press "5" for example)
    fireEvent.press(getByText('5'));
    expect(onScaleChange).toHaveBeenCalledWith(5);
  });

  test('renders fallback message for unsupported question type', () => {
    const question = {
      id: 'q2',
      question_type: 'UNKNOWN_TYPE',
      question_text_ar: 'سؤال تجريبي',
    };

    const { getByText } = render(
      <PersonalityQuestionCard question={question} language="ar" />
    );

    expect(getByText('نوع سؤال غير مدعوم.')).toBeTruthy();
  });
});
