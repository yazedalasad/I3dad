import {
  isAdaptiveAnswerCorrect,
  normalizeAnswerLetter,
  resolveCorrectAnswerLetter,
} from './adaptiveTestAnswerUtils';

describe('adaptiveTestAnswerUtils', () => {
  const question = {
    correct_answer: 'B',
    option_a_ar: '96',
    option_b_ar: '80',
    option_c_ar: '64',
    option_d_ar: '48',
    option_a_he: '96',
    option_b_he: '80',
    option_c_he: '64',
    option_d_he: '48',
  };

  test('normalizes answer letters', () => {
    expect(normalizeAnswerLetter(' b ')).toBe('B');
    expect(normalizeAnswerLetter('x')).toBe('');
  });

  test('detects correct letter answers', () => {
    expect(isAdaptiveAnswerCorrect(question, 'B', 'ar')).toBe(true);
    expect(isAdaptiveAnswerCorrect(question, 'A', 'ar')).toBe(false);
  });

  test('resolves correct answer from option text when needed', () => {
    expect(resolveCorrectAnswerLetter({ ...question, correct_answer: '80' }, 'ar')).toBe('B');
  });
});
