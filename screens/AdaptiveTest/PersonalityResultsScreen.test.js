// screens/AdaptiveTest/PersonalityResultsScreen.test.js
import { fireEvent, render, waitFor } from '@testing-library/react-native';

/**
 * ✅ LOCAL i18n FIX (do NOT touch jest.setup.js):
 * PersonalityResultsScreen uses:
 *   const { t, i18n } = useTranslation();
 *   i18n.language + i18n.changeLanguage()
 * Your global mock may not include i18n for this run, so we ensure it here.
 */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // return key (so component will use its built-in fallbacks)
    t: (key) => key,
    i18n: {
      language: 'ar',
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

/**
 * ✅ Alert mock: component calls Alert.alert on errors/missing studentId
 */
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      ...RN.Alert,
      alert: jest.fn(),
    },
  };
});

const PersonalityResultsScreen = require('./PersonalityResultsScreen').default;

/* -------------------- UI mocks -------------------- */
jest.mock('../../components/AdaptiveTest/RadarChart', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function RadarChartMock() {
    return React.createElement(View, { testID: 'radar-chart' });
  };
});

/* -------------------- Service mock -------------------- */
const mockGetStudentPersonalityProfile = jest.fn();

jest.mock('../../services/personalityTestService', () => ({
  __esModule: true,
  getStudentPersonalityProfile: (...args) => mockGetStudentPersonalityProfile(...args),
}));

/* -------------------- Shared data -------------------- */
const successPayload = {
  success: true,
  profile: {
    openness: 80,
    conscientiousness: 60,
    extraversion: 40,
    agreeableness: 70,
    neuroticism: 20,
    confidence_level: 90,
  },
  insights: {
    personality_type_description_ar: 'وصف عربي',
    personality_type_description_he: 'תיאור בעברית',
  },
};

describe('PersonalityResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading then renders traits, chart, and buttons (success UI)', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    const navigateTo = jest.fn();

    const { getByText, queryByText, getByTestId } = render(
      <PersonalityResultsScreen navigateTo={navigateTo} studentId="stu-1" language="ar" />
    );

    // ✅ loading text in the component is common.loading fallback:
    // "جاري التحميل…"
    expect(getByText('جاري التحميل…')).toBeTruthy();

    await waitFor(() => {
      expect(queryByText('جاري التحميل…')).toBeNull();

      // ✅ Title is: "نتائج الشخصية"
      expect(getByText('نتائج الشخصية')).toBeTruthy();

      // ✅ Traits section + one trait label
      expect(getByText('الصفات')).toBeTruthy();
      expect(getByText('الانفتاح')).toBeTruthy();

      // ✅ Insights description
      expect(getByText('وصف عربي')).toBeTruthy();

      // ✅ Chart is rendered
      expect(getByTestId('radar-chart')).toBeTruthy();

      // ✅ Buttons exist
      expect(getByText('العودة للرئيسية')).toBeTruthy();
      expect(getByText('نتائج الاختبار الكامل')).toBeTruthy();
    });

    fireEvent.press(getByText('العودة للرئيسية'));
    expect(navigateTo).toHaveBeenCalledWith('home');

    fireEvent.press(getByText('نتائج الاختبار الكامل'));
    expect(navigateTo).toHaveBeenCalledWith('testResults');
  });

  /* =========================================================
     getStudentPersonalityProfile — 2 positive + 2 negative
     ========================================================= */

  it('getStudentPersonalityProfile (positive): called with correct studentId', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-999" language="ar" />
    );

    await waitFor(() => {
      expect(mockGetStudentPersonalityProfile).toHaveBeenCalledTimes(1);
    });

    const args = mockGetStudentPersonalityProfile.mock.calls[0];
    expect(args[0]).toBe('stu-999');
  });

  it('getStudentPersonalityProfile (positive): called with exactly 1 argument (studentId)', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="he" />
    );

    await waitFor(() => {
      expect(mockGetStudentPersonalityProfile).toHaveBeenCalledTimes(1);
    });

    const args = mockGetStudentPersonalityProfile.mock.calls[0];
    expect(args).toHaveLength(1);
    expect(args[0]).toBe('stu-1');
  });

  it('getStudentPersonalityProfile (negative): NOT called when studentId is missing', async () => {
    render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId={null} language="ar" />
    );

    // effect runs, but should early-return before service call
    await waitFor(() => {
      expect(mockGetStudentPersonalityProfile).not.toHaveBeenCalled();
    });
  });

  it('getStudentPersonalityProfile (negative): handles failure response gracefully (no crash)', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce({
      success: false,
      error: 'FAILED',
    });

    const { queryByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    await waitFor(() => {
      // loading should disappear eventually
      expect(queryByText('جاري التحميل…')).toBeNull();
    });

    // No assertion on Alert text needed — just ensuring it doesn't crash.
  });
});
