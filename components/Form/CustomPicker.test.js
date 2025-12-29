import { fireEvent, render } from '@testing-library/react-native';
import CustomPicker from './CustomPicker';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

describe('CustomPicker', () => {
  const items = [
    { label: 'رياضيات', value: 'math' },
    { label: 'لغة عربية', value: 'arabic' },
  ];

  test('renders placeholder when no value selected', () => {
    const { getByText } = render(
      <CustomPicker items={items} onValueChange={jest.fn()} />
    );

    expect(getByText('اختر...')).toBeTruthy();
  });

  test('opens modal and selects item', () => {
    const onValueChange = jest.fn();

    const { getByText } = render(
      <CustomPicker
        label="المادة"
        items={items}
        onValueChange={onValueChange}
      />
    );

    fireEvent.press(getByText('اختر...'));
    fireEvent.press(getByText('رياضيات'));

    expect(onValueChange).toHaveBeenCalledWith('math');
  });

  test('shows error message when error prop exists', () => {
    const { getByText } = render(
      <CustomPicker
        items={items}
        onValueChange={jest.fn()}
        error="هذا الحقل مطلوب"
      />
    );

    expect(getByText('هذا الحقل مطلوب')).toBeTruthy();
  });
});
