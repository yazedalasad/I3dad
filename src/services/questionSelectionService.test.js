const mockFrom = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock('../../services/questionLearningService', () => ({
  computeSelectionPriority: jest.fn((question) => {
    const used = Number(question?.times_used || 0);
    const correct = Number(question?.times_correct || 0);
    if (used <= 0) return Number(question?.selection_priority || 50);
    return Math.round((correct / used) * 100);
  }),
}));

const {
  getNextDiverseQuestion,
  pickRandomCandidate,
} = require('./questionSelectionService');

function queryResult(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => Promise.resolve(result)),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('question selection service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  test('pickRandomCandidate chooses a candidate near target difficulty', () => {
    const picked = pickRandomCandidate([
      { id: 'easy', difficulty: -2 },
      { id: 'target', difficulty: 1.1 },
      { id: 'hard', difficulty: 3 },
    ], 1);

    expect(picked.id).toBe('target');
  });

  test('pickRandomCandidate prefers higher learning priority among similar difficulty', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.01;

    try {
      const picked = pickRandomCandidate(
        [
          { id: 'low', difficulty: 1, selection_priority: 20 },
          { id: 'high', difficulty: 1, selection_priority: 95 },
        ],
        1
      );

      expect(picked.id).toBe('high');
    } finally {
      Math.random = originalRandom;
    }
  });

  test('getNextDiverseQuestion avoids current session and recent questions when alternatives exist', async () => {
    mockFrom
      .mockReturnValueOnce(queryResult({ data: [{ question_id: 'q1' }], error: null }))
      .mockReturnValueOnce(queryResult({ data: [{ metadata: { usedQuestionIds: ['q2'] } }], error: null }))
      .mockReturnValueOnce(queryResult({ data: [{ question_id: 'q3', questions: { subject_id: 'math' } }], error: null }));

    const result = await getNextDiverseQuestion({
      studentId: 'student-1',
      sessionId: 'session-1',
      subjectId: 'math',
      difficultyTarget: 1,
      candidates: [
        { id: 'q1', difficulty: 1 },
        { id: 'q2', difficulty: 1 },
        { id: 'q3', difficulty: 1 },
        { id: 'q4', difficulty: 1 },
        { id: 'q5', difficulty: 1 },
        { id: 'q6', difficulty: 1 },
      ],
    });

    expect(['q4', 'q5', 'q6']).toContain(result.question.id);
    expect(result.selectionMeta.currentSessionExcluded).toBeGreaterThanOrEqual(2);
    expect(result.selectionMeta.usedRecentFilter).toBe(true);
  });
});
