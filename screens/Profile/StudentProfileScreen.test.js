import { fireEvent, render } from '@testing-library/react-native';
import StudentProfileScreen from './StudentProfileScreen';

let mockLanguage = 'ar';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/studentJourneyService', () => ({
  getStudentJourneySnapshot: jest.fn(),
}));

jest.mock('../../services/studentProfileSummaryService', () => ({
  buildStudentProfileSummary: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: mockLanguage, changeLanguage: jest.fn() },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

const { useAuth } = require('../../contexts/AuthContext');
const { getStudentJourneySnapshot } = require('../../services/studentJourneyService');
const { buildStudentProfileSummary } = require('../../services/studentProfileSummaryService');

describe('StudentProfileScreen', () => {
  const navigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = 'ar';
    buildStudentProfileSummary.mockResolvedValue({
      student: { id: 'student-1', first_name: 'Ali', last_name: 'Ahmad' },
      profileCompletion: 25,
      confidenceLevel: { level: 'low', label: 'Low', message: 'Needs more data' },
      abilityHighlights: [],
      interestHighlights: [],
      gameHighlights: { skills: [] },
      strengths: [],
      improvements: [],
      topFields: [],
      recommendedInstitutions: [],
      nextSteps: [],
      dataQuality: {},
    });
  });

  test('renders student name and profile action', async () => {
    getStudentJourneySnapshot.mockResolvedValue({ success: true, data: {} });
    useAuth.mockReturnValue({
      user: { email: 'a@test.com' },
      studentData: { id: 'student-1', first_name: 'Ali', last_name: 'Ahmad', points: 10 },
      signOut: jest.fn(),
    });

    const { findByText } = render(
      <StudentProfileScreen navigateTo={navigateTo} />
    );

    expect(await findByText(/Ali Ahmad/)).toBeTruthy();
    expect(await findByText('تعديل بياناتي')).toBeTruthy();
  });

  test('navigate to edit profile', async () => {
    getStudentJourneySnapshot.mockResolvedValue({ success: true, data: {} });
    useAuth.mockReturnValue({
      user: {},
      studentData: { id: 'student-1' },
      signOut: jest.fn(),
    });

    const { findByText } = render(
      <StudentProfileScreen navigateTo={navigateTo} />
    );

    fireEvent.press(await findByText('تعديل بياناتي'));
    expect(navigateTo).toHaveBeenCalledWith('editProfile', {});
  });

  test('shows friendly institution empty state when no recommendations exist', async () => {
    useAuth.mockReturnValue({
      user: {},
      studentData: { id: 'student-1' },
      signOut: jest.fn(),
    });

    const { findByText } = render(<StudentProfileScreen navigateTo={navigateTo} />);

    expect(await findByText('الجامعات والكليات المناسبة لك')).toBeTruthy();
    expect(await findByText('أكمل الاختبار أو الألعاب حتى نعرض لك الجامعات والكليات الأنسب لك.')).toBeTruthy();
  });

  test('renders matching institutions with merged majors and navigates to details', async () => {
    buildStudentProfileSummary.mockResolvedValue({
      student: { id: 'student-1', first_name: 'Ali', last_name: 'Ahmad', city: 'Nazareth' },
      profileCompletion: 80,
      bestRecommendation: { name: 'علوم الحاسوب', score_percent: 88, breakdown: {} },
      confidenceLevel: { level: 'high', label: 'High', message: 'Ready' },
      abilityHighlights: [],
      interestHighlights: [],
      gameHighlights: { skills: [] },
      strengths: [],
      improvements: [],
      topFields: [{ degree_id: 'cs', name: 'علوم الحاسوب', score_percent: 88 }],
      recommendedInstitutions: [
        {
          id: 'inst-1',
          institution: {
            id: 'inst-1',
            name_ar: 'جامعة حيفا',
            type: 'university',
            city_ar: 'حيفا',
            region: 'haifa',
          },
          same_region: true,
          distance_km: 22,
          bestScore: 88,
          majors: [
            { id: 'cs', name: 'علوم الحاسوب', score_percent: 88 },
            { id: 'eng', name: 'هندسة', score_percent: 72 },
          ],
        },
      ],
      nextSteps: [],
      dataQuality: {},
    });
    useAuth.mockReturnValue({
      user: {},
      studentData: { id: 'student-1' },
      signOut: jest.fn(),
    });

    const { findByText } = render(<StudentProfileScreen navigateTo={navigateTo} />);

    expect(await findByText('جامعة حيفا')).toBeTruthy();
    expect(await findByText('علوم الحاسوب (88%) | هندسة (72%)')).toBeTruthy();
    fireEvent.press(await findByText('تفاصيل المؤسسة'));
    expect(navigateTo).toHaveBeenCalledWith('institutionDetails', {
      institutionId: 'inst-1',
      institutionName: 'جامعة حيفا',
    });
  });

  test('shows no linked institution fallback and Hebrew title', async () => {
    mockLanguage = 'he';
    buildStudentProfileSummary.mockResolvedValue({
      student: { id: 'student-1' },
      profileCompletion: 50,
      bestRecommendation: { name: 'מדעי המחשב', score_percent: 65, breakdown: {} },
      confidenceLevel: { level: 'medium', label: 'Medium', message: 'Ok' },
      abilityHighlights: [],
      interestHighlights: [],
      gameHighlights: { skills: [] },
      strengths: [],
      improvements: [],
      topFields: [{ degree_id: 'cs', name: 'מדעי המחשב', score_percent: 65 }],
      recommendedInstitutions: [],
      nextSteps: [],
      dataQuality: {},
    });
    useAuth.mockReturnValue({
      user: {},
      studentData: { id: 'student-1' },
      signOut: jest.fn(),
    });

    const { findByText } = render(<StudentProfileScreen navigateTo={navigateTo} />);

    expect(await findByText('האוניברסיטאות והמכללות המתאימות לך')).toBeTruthy();
    expect(await findByText('לא נמצאה כרגע מסגרת מתאימה לתחום זה. השלם את המבחן המלא כדי לשפר את התוצאות.')).toBeTruthy();
  });
});
