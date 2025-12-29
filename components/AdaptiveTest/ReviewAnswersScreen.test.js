import { render, waitFor } from '@testing-library/react-native';
import ReviewAnswersScreen from './ReviewAnswersScreen';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    studentData: { id: 's1' },
  }),
}));

jest.mock('../../components/AdaptiveTest/QuestionCard', () => () => null);

describe('ReviewAnswersScreen', () => {
  test('renders loading state first', () => {
    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="123" />
    );

    expect(getByText('جارٍ تحميل مراجعة الإجابات...')).toBeTruthy();
  });

  test('renders empty state when no answers', async () => {
    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="123" />
    );

    await waitFor(() => {
      expect(getByText('لا توجد إجابات لهذه الجلسة.')).toBeTruthy();
    });
  });
});
