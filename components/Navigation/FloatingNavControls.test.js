import { fireEvent, render } from '@testing-library/react-native';

import FloatingNavControls from './FloatingNavControls';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

describe('FloatingNavControls', () => {
  test('renders back and forward buttons when visible', () => {
    const onBack = jest.fn();
    const onForward = jest.fn();

    const { getByText } = render(
      <FloatingNavControls
        canGoBack
        canGoForward
        onBack={onBack}
        onForward={onForward}
        isRTL={false}
      />
    );

    expect(getByText('arrow-left')).toBeTruthy();
    expect(getByText('arrow-right')).toBeTruthy();
  });

  test('uses mirrored icons in RTL mode', () => {
    const { getByText } = render(
      <FloatingNavControls
        canGoBack
        canGoForward={false}
        onBack={jest.fn()}
        onForward={jest.fn()}
        isRTL
      />
    );

    expect(getByText('arrow-right')).toBeTruthy();
    expect(getByText('arrow-left')).toBeTruthy();
  });

  test('does not render when hidden', () => {
    const { queryByText } = render(
      <FloatingNavControls hidden onBack={jest.fn()} onForward={jest.fn()} />
    );

    expect(queryByText('arrow-left')).toBeNull();
  });

  test('forward press is ignored when disabled', () => {
    const onForward = jest.fn();

    const { getByText } = render(
      <FloatingNavControls
        canGoBack
        canGoForward={false}
        onBack={jest.fn()}
        onForward={onForward}
      />
    );

    fireEvent.press(getByText('arrow-right'));
    expect(onForward).not.toHaveBeenCalled();
  });
});
