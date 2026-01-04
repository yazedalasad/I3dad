// components/AdaptiveTest/ReviewAnswersScreen.test.js

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ReviewAnswersScreen from './ReviewAnswersScreen';

/* =========================================================
   Alert mock
========================================================= */
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

/* =========================================================
   i18n mock — IMPORTANT:
   Component reads i18n.language + calls i18n.changeLanguage()
========================================================= */
globalThis.__TEST_LANG__ = 'ar';

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // return key so component shows keys (no setup change needed)
    t: (key, fallback) => (fallback ?? key),
    i18n: {
      get language() {
        return globalThis.__TEST_LANG__;
      },
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

/* =========================================================
   LinearGradient mock
========================================================= */
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props, props.children),
  };
});

/* =========================================================
   Icons mock
========================================================= */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, null, `icon:${name}`);
  return {
    Ionicons: Icon,
  };
});

/* =========================================================
   QuestionCard mock (keep this test focused)
========================================================= */
jest.mock('./QuestionCard', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return function MockQuestionCard({ question, selectedAnswer, isCorrect }) {
    const qText =
      question?.question_text_ar ||
      question?.question_text_he ||
      question?.question_text ||
      'UNKNOWN_QUESTION';

    return (
      <View>
        <Text>{qText}</Text>
        <Text>{`selected:${String(selectedAnswer)}`}</Text>
        <Text>{`correct:${String(!!isCorrect)}`}</Text>
      </View>
    );
  };
});

/* =========================================================
   Auth mock
========================================================= */
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

/* =========================================================
   Supabase mock — full chain:
   from().select().eq().order()
========================================================= */
const mockOrder = jest.fn();

jest.mock('../../config/supabase', () => ({
  __esModule: true,
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: (...args) => mockOrder(...args),
        })),
      })),
    })),
  },
}));

const { useAuth } = require('../../contexts/AuthContext');

describe('ReviewAnswersScreen (component)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.__TEST_LANG__ = 'ar';

    useAuth.mockReturnValue({
      studentData: { id: 'student-1' },
    });
  });

  test('shows loading state initially', () => {
    mockOrder.mockImplementationOnce(() => new Promise(() => {})); // keep pending

    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="S1" language="ar" />
    );

    expect(getByText('review.loading')).toBeTruthy();
  });

  test('renders empty state when no answers exist for the session', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="S1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('review.empty')).toBeTruthy();
    });
  });

  test('renders list items when data exists', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'r1',
          session_id: 'S1',
          question_id: 'q1',
          student_id: 'student-1',
          selected_answer: 'A',
          is_correct: true,
          time_taken_seconds: 12,
          question_order: 1,
          created_at: '2026-01-01T00:00:00Z',
          questions: {
            id: 'q1',
            question_text_ar: 'سؤال تجريبي 1',
          },
        },
      ],
      error: null,
    });

    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="S1" language="ar" />
    );

    await waitFor(() => {
      expect(getByText('سؤال تجريبي 1')).toBeTruthy();
      expect(getByText('selected:A')).toBeTruthy();
      expect(getByText('correct:true')).toBeTruthy();
    });
  });

  test('pressing back button in empty state calls navigateTo("testResults", { sessionId, language })', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    const navigateTo = jest.fn();

    const { getByText } = render(
      <ReviewAnswersScreen navigateTo={navigateTo} sessionId="S1" language="ar" />
    );

    await waitFor(() => expect(getByText('review.empty')).toBeTruthy());

    // ✅ In EMPTY STATE the button label is t('generic.back')
    fireEvent.press(getByText('generic.back'));

    expect(navigateTo).toHaveBeenCalledTimes(1);
    expect(navigateTo).toHaveBeenCalledWith('testResults', {
      sessionId: 'S1',
      language: 'ar',
    });
  });

  test('if studentData.id is missing, shows alert and stops loading', async () => {
    useAuth.mockReturnValueOnce({ studentData: null });

    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const { queryByText } = render(
      <ReviewAnswersScreen navigateTo={jest.fn()} sessionId="S1" language="ar" />
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    expect(queryByText('review.loading')).toBeNull();
  });
});
