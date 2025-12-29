import { render, waitFor } from '@testing-library/react-native';
import StudentRecommendationsScreen from './StudentRecommendationsScreen';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/recommendationService', () => ({
  recommendTopDegrees: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { FontAwesome: ({ name }) => <Text>{name}</Text> };
});

const { useAuth } = require('../../contexts/AuthContext');
const { recommendTopDegrees } = require('../../services/recommendationService');

describe('StudentRecommendationsScreen', () => {
  const navigateTo = jest.fn();

  test('shows loading then empty state', async () => {
    useAuth.mockReturnValue({ studentData: { id: 's1' } });
    recommendTopDegrees.mockResolvedValue({
      success: true,
      data: [],
    });

    const { getByText } = render(
      <StudentRecommendationsScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('لا توجد توصيات حالياً. أكمل الاختبارات أولاً.')).toBeTruthy();
    });
  });

  test('renders recommendations when available', async () => {
    useAuth.mockReturnValue({ studentData: { id: 's1' } });

    recommendTopDegrees.mockResolvedValue({
      success: true,
      data: [
        {
          degree_id: 'd1',
          name_he: 'Computer Science',
          score: 0.9,
          explanation: { top_subjects: [] },
        },
      ],
    });

    const { getByText } = render(
      <StudentRecommendationsScreen navigateTo={navigateTo} />
    );

    await waitFor(() => {
      expect(getByText('Computer Science')).toBeTruthy();
    });
  });
});
