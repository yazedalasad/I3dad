import { render, waitFor } from '@testing-library/react-native';
import StudentRecommendationsScreen from './StudentRecommendationsScreen';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/studentJourneyService', () => ({
  getStudentJourneySnapshot: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

const { useAuth } = require('../../contexts/AuthContext');
const { getStudentJourneySnapshot } = require('../../services/studentJourneyService');

describe('StudentRecommendationsScreen', () => {
  const navigateTo = jest.fn();

  test('shows loading then empty state', async () => {
    useAuth.mockReturnValue({ studentData: { id: 's1' } });
    getStudentJourneySnapshot.mockResolvedValue({
      success: true,
      data: { recommendations: [] },
    });

    const { getByText } = render(
      <StudentRecommendationsScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('No recommendations yet. Complete the tests and games first.')).toBeTruthy();
    });
  });

  test('renders recommendations when available', async () => {
    useAuth.mockReturnValue({ studentData: { id: 's1' } });

    getStudentJourneySnapshot.mockResolvedValue({
      success: true,
      data: {
        recommendations: [
          {
            degree_id: 'd1',
            name: 'Computer Science',
            scorePercent: 91,
            reasons: [],
            improvementAreas: [],
          },
        ],
      },
    });

    const { getByText } = render(
      <StudentRecommendationsScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('Computer Science')).toBeTruthy();
    });
  });
});
