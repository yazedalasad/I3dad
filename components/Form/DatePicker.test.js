import { fireEvent, render } from '@testing-library/react-native';
import DatePicker from './DatePicker';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

/**
 * ✅ Fix: Do NOT reference Text from outer scope inside jest.mock factory.
 * Always require it inside the factory.
 */
jest.mock('./CustomButton', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ title, onPress }) => <Text onPress={onPress}>{title}</Text>;
});

describe('DatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders placeholder', () => {
    const { getByText } = render(<DatePicker onValueChange={jest.fn()} />);
    expect(getByText(/اختر التاريخ/)).toBeTruthy();
  });

  test('opens modal and confirms date', () => {
    const onValueChange = jest.fn();

    const { getByText } = render(
      <DatePicker label="تاريخ الميلاد" onValueChange={onValueChange} />
    );

    // open
    fireEvent.press(getByText(/اختر التاريخ/));

    // confirm
    fireEvent.press(getByText('تأكيد'));

    expect(onValueChange).toHaveBeenCalled();
  });
});
