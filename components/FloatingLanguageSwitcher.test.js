import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
    mockChangeLanguage.mockResolvedValue(undefined);
  });

  it('renders only the selected language by default', () => {
    const { getByText, getByTestId, queryByTestId } = render(<FloatingLanguageSwitcher />);

    expect(getByText('AR')).toBeTruthy();
    expect(getByTestId('floating-language-ar')).toBeTruthy();
    expect(getByTestId('floating-language-indicator')).toBeTruthy();
    expect(queryByTestId('floating-language-he')).toBeNull();
  });

  it('expands to show the other language on press', () => {
    const { getByLabelText, getByTestId } = render(<FloatingLanguageSwitcher />);

    fireEvent.press(getByLabelText('Current language AR'));

    expect(getByTestId('floating-language-he')).toBeTruthy();
  });

  it('changes language on press', async () => {
    const { getByLabelText, getByTestId } = render(<FloatingLanguageSwitcher />);

    fireEvent.press(getByLabelText('Current language AR'));

    fireEvent.press(getByTestId('floating-language-he'));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('he');
    });
  });

  it('handles i18n change error', async () => {
    mockChangeLanguage.mockRejectedValueOnce(new Error('fail'));
    const { getByLabelText, getByTestId } = render(<FloatingLanguageSwitcher />);

    fireEvent.press(getByLabelText('Current language AR'));

    fireEvent.press(getByTestId('floating-language-he'));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('he');
    });
  });

  it('accepts Arabic button presses without crashing', async () => {
    const { getByTestId } = render(<FloatingLanguageSwitcher />);

    fireEvent.press(getByTestId('floating-language-ar'));

    await waitFor(() => {
      expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
    });
  });
});
