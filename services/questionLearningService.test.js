import {
  computeSelectionPriority,
  recordQuestionOutcome,
  refreshSubjectLearningPriorities,
} from './questionLearningService';

const mockFrom = jest.fn();

jest.mock('../config/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

function singleQuery(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    update: jest.fn(() => query),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('questionLearningService', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  test('computeSelectionPriority favors informative correct-rate near 55%', () => {
    const strong = computeSelectionPriority({
      times_used: 12,
      times_correct: 7,
      discrimination: 1.6,
      weight: 1,
    });
    const weak = computeSelectionPriority({
      times_used: 12,
      times_correct: 12,
      discrimination: 1.6,
      weight: 1,
    });

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(60);
    expect(weak).toBeLessThan(strong);
  });

  test('computeSelectionPriority keeps exploration default for unused questions', () => {
    const score = computeSelectionPriority({
      times_used: 0,
      times_correct: 0,
      discrimination: 1.2,
      weight: 1,
    });

    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThanOrEqual(60);
  });

  test('recordQuestionOutcome increments usage and stores selection_priority', async () => {
    const update = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    }));

    mockFrom
      .mockReturnValueOnce(
        singleQuery({
          data: {
            id: 'q1',
            subject_id: 'math',
            times_used: 4,
            times_correct: 2,
            avg_time_seconds: 30,
            discrimination: 1.4,
            weight: 1,
          },
          error: null,
        })
      )
      .mockReturnValueOnce({
        update,
      });

    const result = await recordQuestionOutcome({
      questionId: 'q1',
      isCorrect: true,
      timeTakenSeconds: 42,
    });

    expect(result.success).toBe(true);
    expect(result.times_used).toBe(5);
    expect(result.times_correct).toBe(3);
    expect(result.selection_priority).toBeGreaterThan(0);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        times_used: 5,
        times_correct: 3,
        avg_time_seconds: 32.4,
        selection_priority: expect.any(Number),
      })
    );
  });

  test('refreshSubjectLearningPriorities updates changed priorities only', async () => {
    const updateEq = jest.fn(() => Promise.resolve({ error: null }));
    const update = jest.fn(() => ({ eq: updateEq }));

    mockFrom
      .mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: 'q1',
                    times_used: 10,
                    times_correct: 6,
                    discrimination: 1.5,
                    weight: 1,
                    selection_priority: 10,
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      })
      .mockReturnValueOnce({ update });

    const result = await refreshSubjectLearningPriorities('math');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
