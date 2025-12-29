import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PersonalityResultsScreen from './PersonalityResultsScreen';

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
  default: {
    getStudentPersonalityProfile: (...args) => mockGetStudentPersonalityProfile(...args),
  },
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

  it('shows loading then renders traits and buttons (smoke success UI)', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    const navigateTo = jest.fn();

    const { getByText, queryByText } = render(
      <PersonalityResultsScreen navigateTo={navigateTo} studentId="stu-1" language="ar" />
    );

    expect(getByText('جارٍ تحميل النتائج...')).toBeTruthy();

    await waitFor(() => {
      expect(queryByText('جارٍ تحميل النتائج...')).toBeNull();
      expect(getByText('نتيجة اختبار الشخصية')).toBeTruthy();
      expect(getByText('الانفتاح')).toBeTruthy();
      expect(getByText('وصف عربي')).toBeTruthy();
    });

    fireEvent.press(getByText('العودة للرئيسية'));
    expect(navigateTo).toHaveBeenCalledWith('home');

    fireEvent.press(getByText('نتائج الاختبار الكامل'));
    expect(navigateTo).toHaveBeenCalledWith('testResults');
  });

  /* =========================================================
     getStudentPersonalityProfile — 2 positive + 2 negative
     Real call detected: getStudentPersonalityProfile(studentId)  (1 arg)
     ========================================================= */

  // ✅ Positive #1: called with correct studentId
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

  // ✅ Positive #2: called with exactly one argument (studentId)
  it('getStudentPersonalityProfile (positive): called with exactly 1 argument', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="he" />
    );

    await waitFor(() => {
      expect(mockGetStudentPersonalityProfile).toHaveBeenCalledTimes(1);
    });

    const args = mockGetStudentPersonalityProfile.mock.calls[0];
    expect(args).toHaveLength(1); // ✅ proves language is not passed as param
    expect(args[0]).toBe('stu-1');
  });

  // ❌ Negative #1: not called when studentId missing
  it('getStudentPersonalityProfile (negative): NOT called when studentId is missing', () => {
    render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId={null} language="ar" />
    );

    expect(mockGetStudentPersonalityProfile).not.toHaveBeenCalled();
  });

  // ❌ Negative #2: handles service failure (success:false) without crashing
  it('getStudentPersonalityProfile (negative): handles failure response gracefully', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce({
      success: false,
      error: 'FAILED',
    });

    const { queryByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    await waitFor(() => {
      expect(queryByText('جارٍ تحميل النتائج...')).toBeNull();
    });
  });
});
