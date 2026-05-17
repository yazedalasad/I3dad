import {
  calculateConfidence,
  calculateMajorScores,
  getMissingRecommendationSteps,
} from './recommendationEngine';

function profile(overrides = {}) {
  const evidence = {
    hasAssessment: false,
    hasPersonality: false,
    hasInterests: false,
    hasPotential: false,
    hasGames: false,
    completedGameCount: 0,
    ...overrides.evidence,
  };
  return {
    evidence,
    weights: overrides.weights || {
      assessment: evidence.hasAssessment ? 0.4 : 0,
      personality: evidence.hasPersonality ? 0.2 : 0,
      interests: evidence.hasInterests ? 0.2 : 0,
      potential: evidence.hasPotential ? 0.1 : 0,
      games: evidence.hasGames ? 0.1 : 0,
    },
    vectors: {
      assessment: overrides.assessment || {},
      personality: overrides.personality || {},
      interests: overrides.interests || {},
      potential: overrides.potential || {},
      games: overrides.games || {},
    },
  };
}

const csMajor = {
  id: 'major-cs',
  code: 'CS_BSC',
  name_ar: 'علوم الحاسوب',
  name_he: 'מדעי המחשב',
  name_en: 'Computer Science',
  category: 'computer_science',
};

describe('recommendation engine confidence and scoring', () => {
  test('one game only stays low confidence and preliminary', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 1 },
      weights: { assessment: 0, personality: 0, interests: 0, potential: 0, games: 0.05 },
      games: { technology: 1, logic: 0.9, math: 0.8 },
    });

    const confidence = calculateConfidence(studentProfile);
    const [score] = calculateMajorScores(studentProfile, [csMajor]);

    expect(confidence.confidence_level).toBe('low');
    expect(score.is_preliminary).toBe(true);
    expect(score.game_signal_bonus).toBeLessThanOrEqual(5);
  });

  test('two games only remain low confidence preliminary recommendations', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 2 },
      weights: { assessment: 0, personality: 0, interests: 0, potential: 0, games: 0.08 },
      games: { technology: 1, logic: 1, math: 1 },
    });

    const [score] = calculateMajorScores(studentProfile, [csMajor]);
    expect(score.confidence_level).toBe('low');
    expect(score.is_preliminary).toBe(true);
    expect(score.game_signal_bonus).toBeLessThanOrEqual(8);
  });

  test('comprehensive test only gives medium confidence and missing steps', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true },
      weights: { assessment: 1, personality: 0, interests: 0, potential: 0, games: 0 },
      assessment: { math: 0.9, logic: 0.85, technology: 0.8 },
    });

    expect(calculateConfidence(studentProfile).confidence_level).toBe('medium');
    expect(getMissingRecommendationSteps(studentProfile).map((step) => step.key)).toEqual(
      expect.arrayContaining(['personality_test', 'interests', 'games'])
    );
  });

  test('full data gives high confidence and caps game impact at ten points', () => {
    const studentProfile = profile({
      evidence: {
        hasAssessment: true,
        hasPersonality: true,
        hasInterests: true,
        hasPotential: true,
        hasGames: true,
        completedGameCount: 4,
      },
      weights: { assessment: 0.4, personality: 0.2, interests: 0.2, potential: 0.1, games: 0.1 },
      assessment: { math: 0.9, logic: 0.95, technology: 0.9, creativity: 0.8, language: 0.7, business: 0.6 },
      personality: { math: 0.75, logic: 0.8, technology: 0.8, creativity: 0.75, language: 0.7, business: 0.6 },
      interests: { math: 0.8, logic: 0.85, technology: 0.9, creativity: 0.75, language: 0.7, business: 0.65 },
      potential: { math: 0.75, logic: 0.8, technology: 0.8, creativity: 0.7, language: 0.65, business: 0.6 },
      games: { math: 1, logic: 1, technology: 1, creativity: 0.8, language: 0.7, business: 0.6 },
    });

    const [score] = calculateMajorScores(studentProfile, [csMajor]);
    expect(score.confidence_level).toBe('high');
    expect(score.game_signal_bonus).toBeLessThanOrEqual(10);
    expect(score.match_percentage).toBeGreaterThan(70);
  });

  test('one engineering game can produce varied preliminary major directions', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 1 },
      weights: { assessment: 0, personality: 0, interests: 0, potential: 0, games: 0.05 },
      games: {
        physics: 0.95,
        spatial_reasoning: 0.95,
        engineering: 0.9,
        planning: 0.88,
        creativity: 0.82,
        optimization: 0.78,
        problem_solving: 0.85,
      },
    });

    const majors = [
      { id: 'civil', code: 'CE_BSC', category: 'civil_engineering' },
      { id: 'architecture', code: 'ARCH_BARCH', category: 'architecture' },
      { id: 'mechanical', code: 'ME_BSC', category: 'mechanical_engineering' },
      { id: 'industrial', code: 'IE_BSC', category: 'industrial_engineering' },
    ];

    const scores = calculateMajorScores(studentProfile, majors);

    expect(scores).toHaveLength(4);
    expect(new Set(scores.map((score) => score.major_key))).toEqual(
      new Set(['civil_engineering', 'architecture', 'mechanical_engineering', 'industrial_engineering'])
    );
    expect(scores.every((score) => score.confidence_level === 'low')).toBe(true);
    expect(scores.every((score) => score.is_preliminary)).toBe(true);
    expect(scores.every((score) => score.game_signal_bonus <= 5)).toBe(true);
  });
});
