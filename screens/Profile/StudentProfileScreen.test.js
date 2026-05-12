import { fireEvent, render } from '@testing-library/react-native';
import StudentProfileScreen from './StudentProfileScreen';

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
    i18n: { language: 'ar', changeLanguage: jest.fn() },
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
});
