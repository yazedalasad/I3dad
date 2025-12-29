import { fireEvent, render } from '@testing-library/react-native';
import AboutScreen from './AboutScreen';

describe('AboutScreen (unit/component tests)', () => {
  // ✅ Positive 1: renders main title (fallback Arabic)
  it('renders the main title "عن إعداد"', () => {
    const { getAllByText } = render(<AboutScreen navigateTo={() => {}} />);
    const titles = getAllByText('عن إعداد');
    expect(titles.length).toBeGreaterThan(0);
  });

  // ✅ Positive 2: back press triggers navigateTo("home")
  it('calls navigateTo("home") when back button is pressed', () => {
    const navigateTo = jest.fn();
    const { getByText } = render(<AboutScreen navigateTo={navigateTo} />);

    // uses our FontAwesome mock in jest.setup.js => "icon:arrow-left"
    fireEvent.press(getByText('icon:arrow-left'));

    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith('home');
  });

  // ✅ Positive 3: renders a real section title
  it('renders the section header "رؤيتنا"', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);
    expect(getByText('رؤيتنا')).toBeTruthy();
  });

  // ✅ Positive 4: renders a real contact value
  it('renders the contact email "info@i3dad.com"', () => {
    const { getByText } = render(<AboutScreen navigateTo={() => {}} />);
    expect(getByText('info@i3dad.com')).toBeTruthy();
  });

  // ❌ Negative 1: should not crash if navigateTo is missing (because you used navigateTo?.)
  it('does not crash when navigateTo prop is missing and back is pressed', () => {
    const { getByText } = render(<AboutScreen />);
    expect(() => fireEvent.press(getByText('icon:arrow-left'))).not.toThrow();
  });

  // ❌ Negative 2: wrong navigateTo type should throw (catches misuse)
  it('throws if navigateTo is not a function (e.g., string)', () => {
    const { getByText } = render(<AboutScreen navigateTo={'home'} />);
    expect(() => fireEvent.press(getByText('icon:arrow-left'))).toThrow();
  });
});
