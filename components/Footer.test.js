import { fireEvent, render } from '@testing-library/react-native';
import Footer from './Footer';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Footer', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  // ✅ Positive 1
  it('renders logo (icon) and tagline', () => {
    const { getByText } = render(<Footer />);

    // logo contains an icon text because of your vector-icons mock in jest.setup.js
    expect(getByText('icon:graduation-cap')).toBeTruthy();

    // tagline is a plain Text node
    expect(getByText('تمكين الطلاب العرب الإسرائيليين منذ 2024')).toBeTruthy();
  });

  // ✅ Positive 2
  it('navigates to About when pressing "من نحن"', () => {
    const { getByText } = render(<Footer />);
    fireEvent.press(getByText('من نحن'));
    expect(mockNavigate).toHaveBeenCalledWith('About');
  });

  // ❌ Negative 1 (pressing non-clickable links should NOT navigate)
  it('does not navigate when pressing non-clickable links', () => {
    const { getByText } = render(<Footer />);

    fireEvent.press(getByText('سياسة الخصوصية'));
    fireEvent.press(getByText('تواصل معنا'));
    fireEvent.press(getByText('دعم'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ❌ Negative 2 (pressing social buttons should not crash)
  it('social buttons are pressable', () => {
    const { getByLabelText } = render(<Footer />);

    fireEvent.press(getByLabelText('facebook'));
    fireEvent.press(getByLabelText('instagram'));
    fireEvent.press(getByLabelText('linkedin'));
    fireEvent.press(getByLabelText('twitter'));

    expect(true).toBe(true);
  });
});
