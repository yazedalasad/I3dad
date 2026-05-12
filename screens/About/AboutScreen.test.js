import { fireEvent, render } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import AboutScreen from './AboutScreen';

describe('AboutScreen (unit/component tests)', () => {
  it('renders the main title key', () => {
    const { getAllByText } = render(<AboutScreen navigateTo={() => {}} />);

    expect(getAllByText('title').length).toBeGreaterThan(0);
  });

  it('renders the vision section key', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);

    expect(getByText('visionTitle')).toBeTruthy();
  });

  it('renders the partners section key', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);

    expect(getByText('partnersTitle')).toBeTruthy();
  });

  it('calls navigateTo("home") when back button is pressed', () => {
    const navigateTo = jest.fn();

    const { UNSAFE_getAllByType } = render(<AboutScreen navigateTo={navigateTo} />);
    const touchables = UNSAFE_getAllByType(TouchableOpacity);

    expect(touchables.length).toBeGreaterThan(0);
    fireEvent.press(touchables[0]);

    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith('home');
  });

  it('does not crash when navigateTo prop is missing and back is pressed', () => {
    const { UNSAFE_getAllByType } = render(<AboutScreen />);
    const touchables = UNSAFE_getAllByType(TouchableOpacity);

    expect(touchables.length).toBeGreaterThan(0);
    expect(() => fireEvent.press(touchables[0])).not.toThrow();
  });

  it('throws if navigateTo is not a function (e.g., string)', () => {
    const { UNSAFE_getAllByType } = render(<AboutScreen navigateTo="home" />);
    const touchables = UNSAFE_getAllByType(TouchableOpacity);

    expect(touchables.length).toBeGreaterThan(0);
    expect(() => fireEvent.press(touchables[0])).toThrow();
  });
});
