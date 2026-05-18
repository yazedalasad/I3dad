// screens/AdaptiveTest/PersonalityResultsScreen.test.js
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

let mockLanguage = 'ar';
let mockWidth = 390;

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    i18n: {
      language: mockLanguage,
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const descriptors = Object.getOwnPropertyDescriptors(RN);
  delete descriptors.DevMenu;
  const mockRN = {};
  Object.defineProperties(mockRN, descriptors);
  Object.defineProperty(mockRN, 'Alert', {
    configurable: true,
    value: { ...RN.Alert, alert: jest.fn() },
  });
  Object.defineProperty(mockRN, 'useWindowDimensions', {
    configurable: true,
    value: () => ({ width: mockWidth, height: 800, scale: 1, fontScale: 1 }),
  });
  return mockRN;
});

const mockGetStudentPersonalityProfile = jest.fn();

jest.mock('../../services/personalityTestService', () => ({
  __esModule: true,
  getStudentPersonalityProfile: (...args) => mockGetStudentPersonalityProfile(...args),
}));

const PersonalityResultsScreen = require('./PersonalityResultsScreen').default;

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
    personality_type_description_en: 'English description',
  },
};

describe('PersonalityResultsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = 'ar';
    mockWidth = 390;
  });

  it('renders polished Arabic report with traits, chart, interpretation, and buttons', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);
    const navigateTo = jest.fn();

    const { getByText, getAllByText, queryByText } = render(
      <PersonalityResultsScreen navigateTo={navigateTo} studentId="stu-1" language="ar" />
    );

    expect(getByText('جاري التحميل…')).toBeTruthy();

    await waitFor(() => {
      expect(queryByText('جاري التحميل…')).toBeNull();
      expect(getByText('نتائج الشخصية')).toBeTruthy();
      expect(getByText('ثقة 90%')).toBeTruthy();
      expect(getByText('ملخص سريع')).toBeTruthy();
      expect(getAllByText('الانفتاح').length).toBeGreaterThan(0);
      expect(getAllByText(/80/).length).toBeGreaterThan(0);
      expect(getByText('الرسم')).toBeTruthy();
      expect(getByText('ماذا تعني هذه النتائج؟')).toBeTruthy();
      expect(getByText('كيف يؤثر هذا على التوصيات؟')).toBeTruthy();
      expect(getByText('عرض التقرير الكامل')).toBeTruthy();
      expect(getByText('العودة للصفحة الرئيسية')).toBeTruthy();
    });

    fireEvent.press(getByText('عرض التقرير الكامل'));
    expect(navigateTo).toHaveBeenCalledWith('studentInsightReport', {
      studentId: 'stu-1',
      language: 'ar',
    });

    fireEvent.press(getByText('العودة للصفحة الرئيسية'));
    expect(navigateTo).toHaveBeenCalledWith('home');
  });

  it('renders Hebrew RTL copy', async () => {
    mockLanguage = 'he';
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    const { findByText, findAllByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="he" />
    );

    expect(await findByText('תוצאות אישיות')).toBeTruthy();
    expect(await findByText('ביטחון 90%')).toBeTruthy();
    expect(await findByText('סיכום מהיר')).toBeTruthy();
    expect((await findAllByText('מצפוניות')).length).toBeGreaterThan(0);
    expect(await findByText('מה זה אומר?')).toBeTruthy();
    expect(await findByText('פירוט הדוח המלא')).toBeTruthy();
  });

  it('renders English LTR copy', async () => {
    mockLanguage = 'en';
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    const { findByText, findAllByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="en" />
    );

    expect(await findByText('Personality Results')).toBeTruthy();
    expect(await findByText('Confidence 90%')).toBeTruthy();
    expect(await findByText('Quick Summary')).toBeTruthy();
    expect((await findAllByText('Conscientiousness')).length).toBeGreaterThan(0);
    expect(await findByText('What does this mean?')).toBeTruthy();
  });

  it('handles missing Big Five data without NaN or empty chart space', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce({
      success: true,
      profile: { confidence_level: null },
      insights: {},
    });

    const { findByText, findAllByText, queryByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    expect(await findByText('ثقة 0%')).toBeTruthy();
    expect((await findAllByText(/0/)).length).toBeGreaterThan(0);
    expect(await findByText('لا توجد بيانات كافية لعرض الرسم.')).toBeTruthy();
    expect(queryByText('NaN%')).toBeNull();
  });

  it('supports partial data safely', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce({
      success: true,
      profile: { openness: 55, confidence_level: 75 },
      insights: {},
    });

    const { findAllByText, queryByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    expect((await findAllByText(/55/)).length).toBeGreaterThan(0);
    expect((await findAllByText(/0/)).length).toBeGreaterThan(0);
    expect(queryByText('NaN%')).toBeNull();
  });

  it('uses wide layout without breaking rendering', async () => {
    mockWidth = 900;
    mockGetStudentPersonalityProfile.mockResolvedValueOnce(successPayload);

    const { findByText, findAllByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    expect(await findByText('سمات الشخصية الخمس')).toBeTruthy();
    expect((await findAllByText('التعاون')).length).toBeGreaterThan(0);
  });

  it('does not call service when studentId is missing', async () => {
    render(<PersonalityResultsScreen navigateTo={jest.fn()} studentId={null} language="ar" />);

    await waitFor(() => {
      expect(mockGetStudentPersonalityProfile).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  it('handles service failure without crashing', async () => {
    mockGetStudentPersonalityProfile.mockResolvedValueOnce({ success: false, error: 'FAILED' });

    const { queryByText } = render(
      <PersonalityResultsScreen navigateTo={jest.fn()} studentId="stu-1" language="ar" />
    );

    await waitFor(() => {
      expect(queryByText('جاري التحميل…')).toBeNull();
      expect(Alert.alert).toHaveBeenCalledWith('خطأ', 'FAILED');
    });
  });
});
