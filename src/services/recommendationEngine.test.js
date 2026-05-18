import {
  calculateConfidence,
  calculateMajorScores,
  explainMajorRecommendation,
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
    gameSessions: overrides.gameSessions || [],
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
    expect(score.game_signal_bonus).toBeLessThanOrEqual(10);
    expect(score.match_percentage).toBeGreaterThan(20);
    expect(score.match_percentage).toBeLessThanOrEqual(54);
  });

  test('game-only recommendations are varied instead of fixed at 45 percent', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 1 },
      weights: { assessment: 0, personality: 0, interests: 0, potential: 0, games: 1 },
      games: { technology: 1, logic: 0.95, math: 0.85 },
    });

    const scores = calculateMajorScores(studentProfile, [
      csMajor,
      { id: 'electrical', code: 'EE_BSC', category: 'electrical_engineering' },
      { id: 'civil', code: 'CE_BSC', category: 'civil_engineering' },
      { id: 'architecture', code: 'ARCH_BARCH', category: 'architecture' },
      { id: 'physics', code: 'PHYS_BSC', category: 'physics' },
    ]);

    expect(new Set(scores.map((score) => score.match_percentage)).size).toBeGreaterThan(1);
    expect(scores.every((score) => score.match_percentage !== 45)).toBe(true);
    expect(scores[0].major_key).toBe('computer_science');
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

  test('student with no data gets zero-score low-confidence placeholders', () => {
    const studentProfile = profile();

    const [score] = calculateMajorScores(studentProfile, [csMajor]);

    expect(score.confidence_level).toBe('low');
    expect(score.match_percentage).toBe(0);
    expect(score.is_preliminary).toBe(true);
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

  test('assessment-only math and logic does not collapse because technology/personality are missing', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true },
      weights: { assessment: 1, personality: 0, interests: 0, potential: 0, games: 0 },
      assessment: { math: 0.72, logic: 0.7 },
    });

    const [score] = calculateMajorScores(studentProfile, [csMajor]);

    expect(score.match_score).toBeGreaterThanOrEqual(70);
    expect(score.confidence_score).toBeGreaterThanOrEqual(55);
    expect(score.data_sources_used).toEqual(['assessment']);
    expect(score.breakdown.available_sources[0].effectiveWeight).toBe(100);
  });

  test('full data gives high confidence and caps game impact at fifteen points', () => {
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
    expect(score.game_signal_bonus).toBeLessThanOrEqual(15);
    expect(score.match_percentage).toBeGreaterThan(70);
  });

  test('strong math and physics ranks physics/engineering above unrelated majors', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasInterests: true },
      weights: { assessment: 0.65, interests: 0.35, personality: 0, potential: 0, games: 0 },
      assessment: { math: 0.95, physics: 0.95, logic: 0.85, science: 0.8 },
      interests: { physics: 0.9, engineering: 0.8, science: 0.85 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'physics', code: 'PHYS_BSC', category: 'physics' },
      { id: 'electrical', code: 'EE_BSC', category: 'electrical_engineering' },
      { id: 'civil', code: 'CE_BSC', category: 'civil_engineering' },
      { id: 'law', code: 'LAW_LLB', category: 'law' },
    ]);

    expect(scores[0].major_key).not.toBe('law');
    expect(scores[0].match_percentage).toBeGreaterThan(scores[2].match_percentage);
  });

  test('strong biology and chemistry ranks health/science majors above business', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasInterests: true },
      weights: { assessment: 0.65, interests: 0.35, personality: 0, potential: 0, games: 0 },
      assessment: { biology: 0.95, chemistry: 0.9, science: 0.85 },
      interests: { biology: 0.9, health: 0.85, science: 0.8 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'medicine', code: 'MED_MD', category: 'medicine' },
      { id: 'chemistry', code: 'CHEM_BSC', category: 'chemistry' },
      { id: 'business', code: 'BUS_BA', category: 'business' },
    ]);

    expect(scores[0].major_key).not.toBe('business');
    expect(scores[0].match_percentage).toBeGreaterThan(60);
  });

  test('social and humanities signals rank social tracks above engineering', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasPersonality: true, hasInterests: true },
      weights: { assessment: 0.53, interests: 0.29, personality: 0.18, potential: 0, games: 0 },
      assessment: { language: 0.9, humanities: 0.85, social: 0.82 },
      interests: { social: 0.9, humanities: 0.82, education: 0.8 },
      personality: { social: 0.88, empathy: 0.82, communication: 0.8 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'social-work', code: 'BSW', category: 'social_work' },
      { id: 'education', code: 'BED', category: 'education' },
      { id: 'engineering', code: 'EE_BSC', category: 'electrical_engineering' },
    ]);

    expect(scores[0].major_key).not.toBe('electrical_engineering');
    expect(scores[0].match_percentage).toBeGreaterThan(scores[2].match_percentage);
  });

  test('interests-only and personality-only stay preliminary but non-fake', () => {
    const interestsOnly = profile({
      evidence: { hasInterests: true },
      weights: { interests: 1, assessment: 0, personality: 0, potential: 0, games: 0 },
      interests: { technology: 0.9, logic: 0.8 },
    });
    const personalityOnly = profile({
      evidence: { hasPersonality: true },
      weights: { personality: 1, assessment: 0, interests: 0, potential: 0, games: 0 },
      personality: { technology: 0.8, logic: 0.75 },
    });

    expect(calculateMajorScores(interestsOnly, [csMajor])[0].confidence_level).toBe('low');
    expect(calculateMajorScores(personalityOnly, [csMajor])[0].confidence_level).toBe('low');
    expect(calculateMajorScores(interestsOnly, [csMajor])[0].match_percentage).toBeGreaterThan(20);
  });

  test('explanations mention major-specific signals', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasInterests: true },
      weights: { assessment: 0.7, interests: 0.3, personality: 0, potential: 0, games: 0 },
      assessment: { math: 0.95, logic: 0.9, technology: 0.88 },
      interests: { technology: 0.9, math: 0.8 },
    });

    const [score] = calculateMajorScores(studentProfile, [csMajor]);
    const explanation = explainMajorRecommendation(score, studentProfile, {}, 'ar');

    expect(explanation.explanation).toContain('علوم الحاسوب');
    expect(explanation.explanation).toMatch(/الرياضيات|التفكير المنطقي|الميول التقنية/);
    expect(explanation.top_reasons.join(' ')).toMatch(/الاختبار|اهتماماتك/);
  });

  test('assessment plus games keeps assessment dominant and explanation is not game-only', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasGames: true, completedGameCount: 1 },
      weights: { assessment: 0.82, games: 0.18, interests: 0, personality: 0, potential: 0 },
      assessment: { math: 0.92, logic: 0.88, technology: 0.86 },
      games: { technology: 0.7, logic: 0.7 },
    });

    const [score] = calculateMajorScores(studentProfile, [csMajor]);
    const explanation = explainMajorRecommendation(score, studentProfile, {}, 'he');

    expect(score.match_score).toBeGreaterThan(60);
    expect(score.confidence_score).toBeGreaterThanOrEqual(55);
    expect(score.data_sources_used).toEqual(expect.arrayContaining(['assessment', 'games']));
    expect(explanation.explanation).toContain('תוצאות המבחן');
    expect(explanation.explanation).not.toBe('המשחקים נתנו אות תומך, אך הם לא המקור המרכזי להמלצה.');
  });

  test('full tech evidence calibrates supported recommendations above 70', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasPersonality: true, hasInterests: true, hasGames: true, completedGameCount: 2 },
      assessment: { math: 0.74, logic: 0.72, technology: 0.68, data_interpretation: 0.66 },
      interests: { technology: 0.8, data_interpretation: 0.75, math: 0.68 },
      personality: { planning: 0.76, responsibility: 0.78, creativity: 0.7 },
      games: { technology: 0.75, logic: 0.72, data_interpretation: 0.7 },
    });

    const scores = calculateMajorScores(studentProfile, [
      csMajor,
      { id: 'data', code: 'DATA_BSC', category: 'data_science' },
      { id: 'civil', code: 'CE_BSC', category: 'civil_engineering' },
    ]);

    expect(scores[0].match_score).toBeGreaterThanOrEqual(70);
    expect(scores[0].confidence_score).toBeGreaterThanOrEqual(80);
    expect(scores[0].data_sources_used).toEqual(expect.arrayContaining(['assessment', 'personality', 'interests', 'games']));
  });

  test('medical evidence ranks lab/medicine strongly without game-only explanation', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasPersonality: true, hasInterests: true, hasGames: true, completedGameCount: 1 },
      assessment: { biology: 0.78, chemistry: 0.76, science: 0.72 },
      interests: { biology: 0.8, chemistry: 0.75, medical: 0.7 },
      personality: { responsibility: 0.82, accuracy: 0.8, empathy: 0.7 },
      games: { medical: 0.78, biology: 0.72, chemistry: 0.7 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'lab', code: 'MLS_BSC', category: 'medical_laboratory_science' },
      { id: 'medicine', code: 'MED_MD', category: 'medicine' },
      { id: 'business', code: 'BUS_BA', category: 'business_management' },
    ]);
    const explanation = explainMajorRecommendation(scores[0], studentProfile, {}, 'he');

    expect(scores[0].match_score).toBeGreaterThanOrEqual(70);
    expect(scores[0].major_key).not.toBe('business_management');
    expect(explanation.explanation).toContain('תוצאות המבחן');
    expect(explanation.explanation).toContain('פרופיל האישיות');
  });

  test('spatial design evidence can lift architecture above 60 without lifting unrelated majors', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasPersonality: true, hasGames: true, completedGameCount: 2 },
      assessment: { physics: 0.65, math: 0.62, spatial_reasoning: 0.76 },
      personality: { creativity: 0.84, planning: 0.74 },
      games: { spatial_reasoning: 0.88, creativity: 0.8, planning: 0.72 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'architecture', code: 'ARCH_BARCH', category: 'architecture' },
      { id: 'business', code: 'BUS_BA', category: 'business_management' },
    ]);

    expect(scores[0].major_key).toBe('architecture');
    expect(scores[0].match_score).toBeGreaterThanOrEqual(60);
    expect(scores[1].match_score).toBeLessThan(60);
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
    expect(scores.every((score) => score.game_signal_bonus <= 10)).toBe(true);
  });

  test('only physics game returns limited preliminary physics and engineering directions', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 1 },
      gameSessions: [{ game_id: 'physics_lab', status: 'completed' }],
      games: { physics: 0.95, math: 0.88, problem_solving: 0.82, logic: 0.72 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'physics', code: 'PHYS_BSC', category: 'physics' },
      { id: 'mechanical', code: 'ME_BSC', category: 'mechanical_engineering' },
      { id: 'electrical', code: 'EE_BSC', category: 'electrical_engineering' },
      { id: 'civil', code: 'CE_BSC', category: 'civil_engineering' },
      { id: 'math', code: 'MATH_BSC', category: 'mathematics' },
      csMajor,
      { id: 'cyber', code: 'CYBER_BSC', category: 'cyber_security' },
      { id: 'economics', code: 'ECON_BA', category: 'economics' },
    ]);
    const explanation = explainMajorRecommendation(scores[0], studentProfile, {}, 'he');

    expect(scores.map((score) => score.major_key)).toEqual(
      expect.arrayContaining(['physics', 'mechanical_engineering', 'electrical_engineering', 'civil_engineering', 'mathematics'])
    );
    expect(scores.map((score) => score.major_key)).not.toEqual(expect.arrayContaining(['economics', 'cyber_security']));
    expect(scores[0].match_score).toBeLessThanOrEqual(55);
    expect(scores[0].confidence_score).toBe(25);
    expect(scores.every((score) => score.is_game_only_preliminary)).toBe(true);
    expect(new Set(scores.map((score) => score.match_score)).size).toBeGreaterThan(1);
    expect(explanation.explanation).toContain('משחק הפיזיקה');
  });

  test('only medical game stays in medical and science directions', () => {
    const studentProfile = profile({
      evidence: { hasGames: true, completedGameCount: 1 },
      gameSessions: [{ game_id: 'doctor_soroka', status: 'completed' }],
      games: { medical: 0.9, biology: 0.82, chemistry: 0.75, communication: 0.65 },
    });

    const scores = calculateMajorScores(studentProfile, [
      { id: 'medicine', code: 'MED_MD', category: 'medicine' },
      { id: 'nursing', code: 'NURS_BN', category: 'nursing' },
      { id: 'lab', code: 'MLS_BSC', category: 'medical_laboratory_science' },
      { id: 'biology', code: 'BIO_BSC', category: 'biology' },
      csMajor,
      { id: 'economics', code: 'ECON_BA', category: 'economics' },
    ]);

    expect(scores.map((score) => score.major_key)).toEqual(
      expect.arrayContaining(['medicine', 'nursing', 'medical_laboratory_science', 'biology'])
    );
    expect(scores.map((score) => score.major_key)).not.toEqual(expect.arrayContaining(['computer_science', 'economics']));
    expect(scores.every((score) => score.confidence_score === 25)).toBe(true);
  });

  test('assessment after a game replaces game-only filtering', () => {
    const studentProfile = profile({
      evidence: { hasAssessment: true, hasGames: true, completedGameCount: 1 },
      gameSessions: [{ game_id: 'physics_lab', status: 'completed' }],
      assessment: { technology: 0.9, logic: 0.86, math: 0.8 },
      games: { physics: 0.7, problem_solving: 0.65 },
    });

    const scores = calculateMajorScores(studentProfile, [
      csMajor,
      { id: 'physics', code: 'PHYS_BSC', category: 'physics' },
    ]);

    expect(scores[0].major_key).toBe('computer_science');
    expect(scores[0].is_game_only_preliminary).toBe(false);
    expect(scores[0].match_score).toBeGreaterThan(60);
  });
});
