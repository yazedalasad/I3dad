import { render } from '@testing-library/react-native';
import ProgressIndicator from './ProgressIndicator';

jest.mock('../../utils/irt/irtCalculations', () => ({
  thetaToPercentage: jest.fn(() => 60),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

describe('ProgressIndicator', () => {
  test('renders subject name and progress numbers', () => {
    const { getByText } = render(
      <ProgressIndicator
        current={3}
        total={10}
        subjectName="Math"
        correctCount={2}
        incorrectCount={1}
        skippedCount={0}
      />
    );

    expect(getByText('Math')).toBeTruthy();
    expect(getByText('3/10')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
  });

  test('renders default title when subject is missing', () => {
    const { getByText } = render(<ProgressIndicator />);
    expect(getByText('Progress')).toBeTruthy();
  });
});
