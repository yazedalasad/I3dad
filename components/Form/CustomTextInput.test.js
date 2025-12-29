import { fireEvent, render } from '@testing-library/react-native';
import CustomTextInput from './CustomTextInput';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

describe('CustomTextInput', () => {
  test('renders label and placeholder', () => {
    const { getByText } = render(
      <CustomTextInput
        label="الاسم"
        placeholder="أدخل الاسم"
        value=""
        onChangeText={jest.fn()}
      />
    );

    expect(getByText('الاسم')).toBeTruthy();
  });

  test('calls onChangeText when typing', () => {
    const onChangeText = jest.fn();

    const { getByPlaceholderText } = render(
      <CustomTextInput
        placeholder="أدخل الاسم"
        value=""
        onChangeText={onChangeText}
      />
    );

    fireEvent.changeText(getByPlaceholderText('أدخل الاسم'), 'أحمد');
    expect(onChangeText).toHaveBeenCalledWith('أحمد');
  });

  test('shows error message when error exists', () => {
    const { getByText } = render(
      <CustomTextInput
        value=""
        onChangeText={jest.fn()}
        error="خطأ في الإدخال"
      />
    );

    expect(getByText('خطأ في الإدخال')).toBeTruthy();
  });
});
