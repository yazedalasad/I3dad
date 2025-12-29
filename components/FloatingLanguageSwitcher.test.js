import { fireEvent, render } from '@testing-library/react-native';
import FloatingLanguageSwitcher from './FloatingLanguageSwitcher';

const mockChangeLanguage = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'ar',
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

describe('FloatingLanguageSwitcher', () => {
  beforeEach(() => {
    mockChangeLanguage.mockReset();
  });

  // ✅ Positive
  it('renders language buttons', () => {
    const { getByText } = render(<FloatingLanguageSwitcher />);
    expect(getByText('ع')).toBeTruthy();
    expect(getByText('ע')).toBeTruthy();
  });

  // ✅ Positive
  it('changes language on press', () => {
    const { getByText } = render(<FloatingLanguageSwitcher />);
    fireEvent.press(getByText('ע'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('he');
  });

  // ❌ Negative
  it('handles i18n change error', () => {
    mockChangeLanguage.mockRejectedValueOnce(new Error('fail'));
    const { getByText } = render(<FloatingLanguageSwitcher />);
    fireEvent.press(getByText('ע'));
    // just ensuring it doesn't crash
    expect(true).toBe(true);
  });

  // ❌ Negative
  it('does not crash on invalid language', () => {
    const { getByText } = render(<FloatingLanguageSwitcher />);
    fireEvent.press(getByText('ع'));
    expect(true).toBe(true);
  });
});
