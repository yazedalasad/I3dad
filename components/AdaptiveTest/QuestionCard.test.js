import { render } from '@testing-library/react-native';
import QuestionCard from './QuestionCard';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

describe('QuestionCard', () => {
  const question = {
    id: 1,
    question_text_ar: 'ما هي عاصمة فلسطين؟',
    answers: ['القدس', 'رام الله'],
    correct_answer: 'القدس',
    question_order: 1,
  };

  test('renders question text', () => {
    const { getByText } = render(
      <QuestionCard
        question={question}
        selectedAnswer={null}
        disabled={true}
        showFeedback={false}
        language="ar"
      />
    );

    expect(getByText('ما هي عاصمة فلسطين؟')).toBeTruthy();
  });
});

