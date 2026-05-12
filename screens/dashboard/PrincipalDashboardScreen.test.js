import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PrincipalDashboardScreen from './PrincipalDashboardScreen';
import { getPrincipalAnalyticsSummary } from '../../services/principalAnalyticsService';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{`icon:${name}`}</Text>,
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }) => <View>{children}</View>,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => (options?.name ? `${key}:${options.name}` : key),
    i18n: { language: 'ar', changeLanguage: jest.fn() },
  }),
}));

jest.mock('../../services/principalAnalyticsService', () => ({
  getPrincipalAnalyticsSummary: jest.fn(),
}));

jest.mock('../../services/principalExperienceService', () => ({
  localizedPrincipalSchoolName: jest.fn((principal, language, fallback) => principal.school_name || fallback),
}));

const analytics = {
  principal: {
    full_name: 'مدير المدرسة',
    school_name: 'مدرسة الإعداد',
  },
  overview: {
    totalStudents: 24,
    activeStudents: 18,
    completedFullAssessments: 11,
    completedPersonality: 13,
    completedGames: 9,
    averageEngagement: 82,
    averagePerformance: 76,
    completionRate: 64,
    topMajor: 'physics',
    topInterests: [{ key: 'physics', label: 'فيزياء', count: 7 }],
  },
  career: {
    topCareers: [{ key: 'physics', label: 'فيزياء', count: 7, avgScore: 88 }],
  },
  personality: {
    distribution: [{ key: 'analytical', label: 'تحليلي', count: 8 }],
  },
  abilities: {
    strongest: [{ label: 'فيزياء', score: 90 }],
    weakest: [{ label: 'رياضيات', score: 52 }],
  },
  games: {
    completedGameSessions: 6,
    strongestSkills: [{ key: 'force_distribution', label: 'force_distribution', avgScore: 84 }],
  },
  learningPotential: {
    average: 71,
    followUpStudents: [
      {
        id: 'student-1',
        full_name: 'طالب يحتاج متابعة',
        grade: '10',
        class_section: 'alef',
        top_major: 'physics',
        top_major_key: 'physics',
        learning_potential_level: 'إمكانات متوسطة',
      },
    ],
  },
};

describe('PrincipalDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrincipalAnalyticsSummary.mockResolvedValue(analytics);
  });

  test('POSITIVE: renders principal analytics dashboard', async () => {
    const { findByText } = render(<PrincipalDashboardScreen navigateTo={jest.fn()} />);

    expect(await findByText('dashboard.title')).toBeTruthy();
    expect(await findByText('dashboard.greeting:مدير المدرسة')).toBeTruthy();
    expect(await findByText('24')).toBeTruthy();
  });

  test('POSITIVE: opens student management from dashboard action', async () => {
    const navigateTo = jest.fn();
    const { findByText } = render(<PrincipalDashboardScreen navigateTo={navigateTo} />);

    fireEvent.press(await findByText('dashboard.studentsAction'));

    expect(navigateTo).toHaveBeenCalledWith('principalStudents');
  });

  test('NEGATIVE: shows loading state before analytics resolve', () => {
    getPrincipalAnalyticsSummary.mockReturnValue(new Promise(() => {}));

    const { getByText } = render(<PrincipalDashboardScreen navigateTo={jest.fn()} />);

    expect(getByText('dashboard.loading')).toBeTruthy();
  });

  test('NEGATIVE: shows retryable error when analytics loading fails', async () => {
    getPrincipalAnalyticsSummary.mockRejectedValueOnce(new Error('Network down'));
    const { findByText } = render(<PrincipalDashboardScreen navigateTo={jest.fn()} />);

    expect(await findByText('common.loadErrorTitle')).toBeTruthy();
    expect(await findByText('Network down')).toBeTruthy();

    getPrincipalAnalyticsSummary.mockResolvedValueOnce(analytics);
    fireEvent.press(await findByText('common.retry'));

    await waitFor(() => {
      expect(getPrincipalAnalyticsSummary).toHaveBeenCalledTimes(2);
    });
  });
});
