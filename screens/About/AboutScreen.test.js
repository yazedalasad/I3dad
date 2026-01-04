// screens/About/AboutScreen.test.js
import { fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import AboutScreen from './AboutScreen';

describe('AboutScreen (unit/component tests)', () => {
  it('renders the main title "عن إعداد"', () => {
    const { getAllByText } = render(<AboutScreen navigateTo={() => {}} />);

    // Title can appear more than once. Ensure at least one exists.
    expect(getAllByText('عن إعداد').length).toBeGreaterThan(0);
  });

  it('renders the section header "رؤيتنا"', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);
    expect(getByText('رؤيتنا')).toBeTruthy();
  });

  it('renders the contact email "info@i3dad.com"', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);
    expect(getByText('info@i3dad.com')).toBeTruthy();
  });

  it('calls navigateTo("home") when back button is pressed', () => {
    const navigateTo = jest.fn();

    const { UNSAFE_getAllByType } = render(<AboutScreen navigateTo={navigateTo} />);

    // The back button is the first TouchableOpacity in the navbar.
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    expect(touchables.length).toBeGreaterThan(0);

    const backBtn = touchables[0];
    fireEvent.press(backBtn);

    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith('home');
  });

  it('does not crash when navigateTo prop is missing and back is pressed', () => {
    const { UNSAFE_getAllByType } = render(<AboutScreen />);

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    expect(touchables.length).toBeGreaterThan(0);

    const backBtn = touchables[0];

    // navigateTo?.('home') is safe when navigateTo is undefined/null
    expect(() => fireEvent.press(backBtn)).not.toThrow();
  });

  it('throws if navigateTo is not a function (e.g., string)', () => {
    const { UNSAFE_getAllByType } = render(<AboutScreen navigateTo={'home'} />);

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    expect(touchables.length).toBeGreaterThan(0);

    const backBtn = touchables[0];

    // Optional chaining does NOT protect against non-function values.
    // If navigateTo is a string, calling it will throw TypeError.
    expect(() => fireEvent.press(backBtn)).toThrow();
  });
});
