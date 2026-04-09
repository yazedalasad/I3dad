import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';

import StudentInsightReportScreen from './StudentInsightReportScreen';

/* -------------------- i18n -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (k) => k,
    i18n: { language: 'ar', changeLanguage: jest.fn().mockResolvedValue(true) },
  }),
}));

/* -------------------- UI / Expo -------------------- */
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }) => children }));

jest.mock('../../components/AdaptiveTest/RadarChart', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockRadarChart() {
    return <View testID="radar-chart" />;
  };
});

/**
 * expo-print & expo-sharing virtual mocks
 */
const mockPrintToFileAsync = jest.fn();
jest.mock(
  'expo-print',
  () => ({
    printToFileAsync: (...args) => mockPrintToFileAsync(...args),
  }),
  { virtual: true }
);

const mockIsSharingAvailable = jest.fn();
const mockShareAsync = jest.fn();
jest.mock(
  'expo-sharing',
  () => ({
    isAvailableAsync: (...args) => mockIsSharingAvailable(...args),
    shareAsync: (...args) => mockShareAsync(...args),
  }),
  { virtual: true }
);

/* -------------------- Services -------------------- */
const mockGetStudentAbilities = jest.fn();
const mockUpdateAbilitiesFromSession = jest.fn();
jest.mock('../../services/abilityService', () => ({
  __esModule: true,
  getStudentAbilities: (...args) => mockGetStudentAbilities(...args),
  updateAbilitiesFromSession: (...args) => mockUpdateAbilitiesFromSession(...args),
}));

const mockGetStudentPersonalityProfile = jest.fn();
jest.mock('../../services/personalityTestService', () => ({
  __esModule: true,
  getStudentPersonalityProfile: (...args) => mockGetStudentPersonalityProfile(...args),
}));

const mockRecommendTopDegrees = jest.fn();
jest.mock('../../services/recommendationService', () => ({
  __esModule: true,
  recommendTopDegrees: (...args) => mockRecommendTopDegrees(...args),
}));

/* -------------------- Supabase -------------------- */
const makeSupabaseChain = ({ data = null, error = null } = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data, error }),
});

const makeSupabaseListChain = ({ data = [], error = null } = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue({ data, error }),
});

const mockFrom = jest.fn();
jest.mock('../../config/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}));

/* -------------------- Helpers -------------------- */
const flush = async () => act(async () => {});
const flushMore = async () => {
  await flush();
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  Platform.OS = 'ios';
  global.Platform = Platform;

  // default success
  mockPrintToFileAsync.mockResolvedValue({ uri: 'file:///report.pdf' });
  mockIsSharingAvailable.mockResolvedValue(false);
  mockShareAsync.mockResolvedValue(true);

  global.window = undefined;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('StudentInsightReportScreen', () => {
  test('renders main content (basic happy path)', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'students') {
        return makeSupabaseChain({
          data: { id: 'stu1', full_name: 'Ahmad Student' },
          error: null,
        });
      }
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockUpdateAbilitiesFromSession.mockResolvedValue({ success: true });
    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    const { getByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stu1" language="ar" />
    );

    await flushMore();

    await waitFor(() => {
      expect(getByText('تقرير شامل للطالب')).toBeTruthy();
      expect(getByText('Ahmad Student')).toBeTruthy();
    });
  });

  test('missing studentId => shows alert (negative)', async () => {
    render(<StudentInsightReportScreen navigateTo={jest.fn()} studentId={null} language="ar" />);

    await flushMore();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [title, msg] = Alert.alert.mock.calls[0];
      expect(title).toBe('خطأ');
      expect(msg).toBe('لا يوجد studentId.');
    });
  });

  test('renders empty states when no data', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: null, error: null });
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    const { getByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stuX" language="ar" />
    );

    await flushMore();

    await waitFor(() => {
      expect(getByText('لا توجد نتائج شخصية بعد. أكمل اختبار الشخصية أولاً.')).toBeTruthy();
      expect(getByText('لا توجد قدرات بعد. أكمل الاختبار الشامل (Total Exam) أولاً.')).toBeTruthy();
      expect(getByText('لا توجد بيانات اهتمام بعد.')).toBeTruthy();
      expect(getByText(/لا توجد توصيات حالياً\..*أولاً\./)).toBeTruthy();
    });
  });

  test('renders data: personality + abilities + interests + recommendations', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: { id: 'stu1', full_name: 'Maha' }, error: null });

      if (table === 'student_interests') {
        return makeSupabaseListChain({
          data: [
            {
              id: 'i1',
              student_id: 'stu1',
              subject_id: 's1',
              interest_score: 77,
              metadata: { examType: 'total_exam' },
              subjects: { name_ar: 'رياضيات', name_he: 'מתמטיקה', name_en: 'Math' },
            },
          ],
          error: null,
        });
      }

      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({
      success: true,
      abilities: [
        {
          id: 'a1',
          subject_id: 's1',
          ability_score: 80,
          accuracy_rate: 70,
          confidence_level: 60,
          subjects: { name_ar: 'رياضيات', name_he: 'מתמטיקה', name_en: 'Math' },
        },
      ],
    });

    mockGetStudentPersonalityProfile.mockResolvedValue({
      success: true,
      profile: {
        openness: 55,
        conscientiousness: 66,
        extraversion: 44,
        agreeableness: 77,
        neuroticism: 22,
        confidence_level: 88,
      },
      insights: { personality_type_description_ar: 'وصف عربي للشخصية' },
    });

    mockRecommendTopDegrees.mockResolvedValue({
      success: true,
      data: [
        {
          degree_id: 'd1',
          name_ar: 'هندسة برمجيات',
          name_he: 'הנדסת תוכנה',
          name_en: 'Software Engineering',
          score: 0.82,
          explanation: {
            top_subjects: [{ subject_id: 's1', subject_name_he: 'מתמטיקה' }],
          },
        },
      ],
    });

    const { getByText, getAllByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stu1" language="ar" />
    );

    await flushMore();

    await waitFor(() => {
      expect(getByText('Maha')).toBeTruthy();
      expect(getByText('وصف عربي للشخصية')).toBeTruthy();
      expect(getAllByText('رياضيات').length).toBeGreaterThan(0);
      expect(getByText('هندسة برمجيات')).toBeTruthy();
      expect(getByText(/מתמטיקה/)).toBeTruthy();
    });
  });

  test('Back Home => navigateTo("home")', async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: null, error: null });
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    const navigateTo = jest.fn();

    const { getByText } = render(
      <StudentInsightReportScreen navigateTo={navigateTo} studentId="stu1" language="ar" />
    );

    await flushMore();

    fireEvent.press(getByText('العودة للرئيسية'));
    expect(navigateTo).toHaveBeenCalledWith('home');
  });

  test('onExportPdf WEB negative: popup blocked => shows popup hint', async () => {
    Platform.OS = 'web';
    global.Platform = Platform;

    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: { id: 'stu1', full_name: 'Maha' }, error: null });
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    global.window = { open: jest.fn(() => null) };

    const { getAllByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stu1" language="ar" />
    );

    await flushMore();

    fireEvent.press(getAllByText('تحميل PDF')[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [, msg] = Alert.alert.mock.calls.at(-1);
      expect(String(msg)).toMatch(/popup|popups|فعّل/i);
    });
  });

  test('onExportPdf WEB positive: opens window and triggers print', async () => {
    Platform.OS = 'web';
    global.Platform = Platform;

    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: { id: 'stu1', full_name: 'Maha' }, error: null });
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    const w = { document: doc, focus: jest.fn(), print: jest.fn() };
    global.window = { open: jest.fn(() => w) };

    const { getAllByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stu1" language="ar" />
    );

    await flushMore();

    fireEvent.press(getAllByText('تحميل PDF')[0]);
    act(() => jest.advanceTimersByTime(800));

    expect(global.window.open).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalled();
    expect(w.print).toHaveBeenCalled();
  });

  test('onExportPdf NATIVE negative: printToFileAsync fails => shows error alert', async () => {
    Platform.OS = 'android';
    global.Platform = Platform;

    mockPrintToFileAsync.mockRejectedValue(new Error('print failed'));

    mockFrom.mockImplementation((table) => {
      if (table === 'students') return makeSupabaseChain({ data: { id: 'stu1', full_name: 'Maha' }, error: null });
      if (table === 'student_interests') return makeSupabaseListChain({ data: [], error: null });
      return makeSupabaseListChain({ data: [], error: null });
    });

    mockGetStudentAbilities.mockResolvedValue({ success: true, abilities: [] });
    mockGetStudentPersonalityProfile.mockResolvedValue({ success: false });
    mockRecommendTopDegrees.mockResolvedValue({ success: true, data: [] });

    const { getAllByText } = render(
      <StudentInsightReportScreen navigateTo={jest.fn()} studentId="stu1" language="ar" />
    );

    await flushMore();

    fireEvent.press(getAllByText('تحميل PDF')[0]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
      const [title] = Alert.alert.mock.calls.at(-1);
      expect(title).toBe('خطأ');
    });
  });


});
