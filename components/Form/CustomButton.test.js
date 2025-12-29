import { fireEvent, render } from '@testing-library/react-native';
import CustomButton from './CustomButton';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

describe('CustomButton', () => {
  test('renders title and handles press', () => {
    const onPress = jest.fn();

    const { getByText } = render(
      <CustomButton title="حفظ" onPress={onPress} />
    );

    fireEvent.press(getByText('حفظ'));
    expect(onPress).toHaveBeenCalled();
  });

  test('shows loader when loading is true', () => {
    const { queryByText } = render(
      <CustomButton title="حفظ" loading />
    );

    expect(queryByText('حفظ')).toBeNull();
  });

  test('does not trigger press when disabled', () => {
    const onPress = jest.fn();

    const { getByText } = render(
      <CustomButton title="حفظ" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('حفظ'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
