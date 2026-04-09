import { buildSessionAnalytics } from '../shared';

export function computeDoctorSorokaSummary({
  rawScores = {},
  totalAnswers = 0,
  correctAnswers = 0,
  totalTimeMs = 0,
}) {
  const analytics = buildSessionAnalytics({
    rawScores,
    totalAnswers,
    correctAnswers,
    totalTimeMs,
  });

  const dominant = analytics.topSubjects?.[0]?.subjectCode || null;

  return {
    ...analytics,
    dominantSubject: dominant,
    recommendationText:
      dominant === 'medicine'
        ? 'נראה שיש לך נטייה טובה לחשיבה רפואית: איסוף מידע, קישור בין ממצאים ובחירת צעד הבא.'
        : 'המשחק מראה אילו תחומים מעניינים אותך, אבל במקרה הזה בלטה בעיקר חשיבה רפואית.',
  };
}
