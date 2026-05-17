import { supabase } from '../../config/supabase';
import { GAME_TOPIC_MAPPINGS } from '../../services/gameCareerSignalService';
import { getMajorProfileForRow, majorProfiles, normalizeMajorKey } from '../data/majorProfiles';
import { getInstitutionsForMajor } from './institutionMatchingService';

const DEFAULT_WEIGHTS = {
  assessment: 0.4,
  personality: 0.2,
  interests: 0.2,
  potential: 0.1,
  games: 0.1,
};

const CONFIDENCE_MESSAGES = {
  low: {
    ar: 'توصية أولية فقط — أكمل الاختبار الشامل للحصول على نتيجة أدق',
    he: 'המלצה ראשונית בלבד — השלם את המבחן המקיף כדי לקבל תוצאה מדויקת יותר',
    en: 'Preliminary recommendation only. Complete the comprehensive test for a more accurate result.',
  },
  medium: {
    ar: 'توصية جيدة، لكن يمكن تحسينها بإكمال باقي الخطوات',
    he: 'המלצה טובה, אך ניתן לשפר אותה באמצעות השלמת שלבים נוספים',
    en: 'Good recommendation, but it can improve by completing the remaining steps.',
  },
  high: {
    ar: 'توصية قوية مبنية على عدة مصادر',
    he: 'המלצה חזקה המבוססת על כמה מקורות מידע',
    en: 'Strong recommendation based on multiple data sources.',
  },
};

const MISSING_STEP_COPY = {
  comprehensive_test: {
    ar: 'ابدأ الاختبار الشامل',
    he: 'התחל את המבחן המקיף',
    en: 'Start the comprehensive test',
  },
  personality_test: {
    ar: 'أكمل اختبار الشخصية لتحسين التوصية',
    he: 'השלם את מבחן האישיות כדי לשפר את ההמלצה',
    en: 'Complete the personality test to improve the recommendation',
  },
  interests: {
    ar: 'حدّث اهتماماتك في الملف الشخصي',
    he: 'עדכן תחומי עניין בפרופיל',
    en: 'Update your interests in the profile',
  },
  games: {
    ar: 'جرّب لعبة تعليمية لدعم ملفك',
    he: 'נסה משחק לימודי כדי לחזק את הפרופיל',
    en: 'Try an educational game to support your profile',
  },
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLang(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function localized(copy, language) {
  const lang = normalizeLang(language);
  return copy?.[lang] || copy?.en || copy?.ar || copy?.he || '';
}

function textToSkillKey(value) {
  const key = normalizeMajorKey(value);
  const aliases = {
    mathematics: 'math',
    maths: 'math',
    computer: 'technology',
    computers: 'technology',
    computer_science: 'technology',
    hebrew: 'language',
    arabic: 'language',
    english: 'language',
    biology: 'biology',
    chemistry: 'chemistry',
    physics: 'physics',
    science: 'science',
    civics: 'social',
    citizenship: 'social',
    literature: 'humanities',
  };
  return aliases[key] || key;
}

function addSignal(vector, key, value, weight = 1) {
  if (!key) return;
  const normalizedKey = textToSkillKey(key);
  const score = clamp(value, 0, 100) / 100;
  const current = vector[normalizedKey] || { sum: 0, weight: 0 };
  vector[normalizedKey] = {
    sum: current.sum + score * weight,
    weight: current.weight + weight,
  };
}

function finalizeVector(weightedVector) {
  return Object.fromEntries(
    Object.entries(weightedVector).map(([key, value]) => [key, clamp01(value.sum / Math.max(1e-9, value.weight))])
  );
}

function dotProfile(studentVector = {}, majorVector = {}) {
  const entries = Object.entries(majorVector || {});
  if (!entries.length) return 0.45;
  let sum = 0;
  let weight = 0;
  entries.forEach(([key, importance]) => {
    const w = safeNum(importance, 0);
    if (w <= 0) return;
    sum += w * safeNum(studentVector[key], 0.35);
    weight += w;
  });
  return clamp01(sum / Math.max(1e-9, weight));
}

function redistributeWeights(available, gamesCap = DEFAULT_WEIGHTS.games) {
  const weights = {};
  const gameAvailable = !!available.games;
  const gameWeight = gameAvailable ? Math.min(DEFAULT_WEIGHTS.games, gamesCap) : 0;
  const nonGameKeys = ['assessment', 'personality', 'interests', 'potential'].filter((key) => available[key]);
  const nonGameDefaultSum = nonGameKeys.reduce((sum, key) => sum + DEFAULT_WEIGHTS[key], 0);
  const remaining = 1 - gameWeight;

  nonGameKeys.forEach((key) => {
    weights[key] = nonGameDefaultSum > 0 ? (DEFAULT_WEIGHTS[key] / nonGameDefaultSum) * remaining : 0;
  });

  weights.games = gameWeight;
  ['assessment', 'personality', 'interests', 'potential'].forEach((key) => {
    if (!weights[key]) weights[key] = 0;
  });
  return weights;
}

function gameCapForCount(count) {
  if (count <= 0) return 0;
  if (count === 1) return 0.05;
  if (count === 2) return 0.08;
  return 0.1;
}

function profileFromPersonality(personality) {
  if (!personality) return {};
  return {
    creativity: clamp01(safeNum(personality.openness, 0) / 100),
    planning: clamp01(safeNum(personality.conscientiousness, 0) / 100),
    social: clamp01((safeNum(personality.extraversion, 0) + safeNum(personality.agreeableness, 0)) / 200),
    communication: clamp01((safeNum(personality.extraversion, 0) + safeNum(personality.agreeableness, 0)) / 200),
    patience: clamp01((safeNum(personality.conscientiousness, 0) + safeNum(personality.agreeableness, 0)) / 200),
    decision_making: clamp01((safeNum(personality.conscientiousness, 0) + (100 - safeNum(personality.neuroticism, 50))) / 200),
  };
}

function buildGameVectorFromSessions(sessions = [], careerSignals = []) {
  const weighted = {};
  const completed = sessions.filter((session) => session?.status === 'completed');
  completed.forEach((session) => {
    const gameKey = normalizeMajorKey(session.game_id);
    const mapping = GAME_TOPIC_MAPPINGS[gameKey];
    const strength = Math.max(
      safeNum(session.interest_signal, 0),
      safeNum(session.engagement_score, 0),
      safeNum(session.trust_score, 0),
      safeNum(session.score, 0),
      50
    );
    Object.values(mapping?.topics || {}).forEach((topic) => {
      (topic.skill_tags || []).forEach((tag) => addSignal(weighted, tag, strength, safeNum(topic.signal_weight, 1)));
      (topic.related_subjects || []).forEach((subject) => addSignal(weighted, subject, strength, 0.75));
    });
  });

  (careerSignals || []).forEach((signal) => {
    addSignal(weighted, signal.degree_code || signal.topic || signal.skill_tag, signal.career_signal || signal.score || 50, 0.35);
  });

  return finalizeVector(weighted);
}

async function maybeQuery(run, fallback = []) {
  try {
    const { data, error } = await run();
    if (error) return fallback;
    return data || fallback;
  } catch {
    return fallback;
  }
}

async function loadMajors() {
  const degrees = await maybeQuery(() =>
    supabase
      .from('degrees')
      .select('id, code, name_ar, name_he, name_en, category, is_active, degree_subject_weights(subject_id, weight)')
      .eq('is_active', true)
  );
  if (degrees.length) return degrees.map((row) => ({ ...row, source_table: 'degrees' }));

  const majors = await maybeQuery(() =>
    supabase
      .from('majors')
      .select('id, key, code, name_ar, name_he, name_en, category, is_active')
      .eq('is_active', true)
  );
  if (majors.length) return majors.map((row) => ({ ...row, source_table: 'majors' }));

  return majorProfiles.map((profile) => ({
    id: profile.key,
    key: profile.key,
    code: profile.key,
    name_ar: profile.name_ar,
    name_he: profile.name_he,
    name_en: profile.name_en,
    category: profile.key,
    is_active: true,
    source_table: 'majorProfiles',
  }));
}

export async function buildStudentRecommendationProfile(studentId) {
  if (!studentId) throw new Error('studentId is required');

  const [
    studentRows,
    abilityRows,
    interestRows,
    personalityRows,
    potentialRows,
    gameRows,
    careerRows,
  ] = await Promise.all([
    maybeQuery(() => supabase.from('students').select('*').eq('id', studentId).limit(1)),
    maybeQuery(() => supabase.from('student_abilities').select('*, subjects(*)').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_interests').select('*, subjects(*)').eq('student_id', studentId)),
    maybeQuery(() =>
      supabase
        .from('student_personality_profiles')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
    ),
    maybeQuery(() => supabase.from('student_learning_potential').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('game_sessions').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_career_signals').select('*').eq('student_id', studentId)),
  ]);

  const abilityWeighted = {};
  abilityRows.forEach((row) => {
    const subjectName = row.subjects?.name_en || row.subjects?.name_ar || row.subjects?.name_he || row.subject_id;
    addSignal(abilityWeighted, subjectName, row.ability_score ?? row.accuracy_rate ?? 50);
  });

  const interestWeighted = {};
  interestRows.forEach((row) => {
    const subjectName = row.subjects?.name_en || row.subjects?.name_ar || row.subjects?.name_he || row.subject_id;
    addSignal(interestWeighted, subjectName, row.interest_score ?? 50);
  });

  const potentialWeighted = {};
  potentialRows.forEach((row) => {
    addSignal(potentialWeighted, row.subject_code || row.subject_id || row.area || row.skill, row.potential_score || row.score || 50);
  });

  const personality = personalityRows[0] || null;
  const completedGames = gameRows.filter((row) => row.status === 'completed');
  const evidence = {
    hasAssessment: abilityRows.some((row) => safeNum(row.total_questions_answered, 0) > 0 || row.ability_score !== null),
    hasPersonality: !!personality,
    hasInterests: interestRows.length > 0,
    hasPotential: potentialRows.length > 0,
    hasGames: completedGames.length > 0 || careerRows.length > 0,
    completedGameCount: new Set(completedGames.map((row) => normalizeMajorKey(row.game_id))).size,
  };

  const available = {
    assessment: evidence.hasAssessment,
    personality: evidence.hasPersonality,
    interests: evidence.hasInterests,
    potential: evidence.hasPotential,
    games: evidence.hasGames,
  };

  return {
    studentId,
    student: studentRows[0] || null,
    abilityRows,
    interestRows,
    potentialRows,
    gameSessions: gameRows,
    careerSignals: careerRows,
    personality,
    vectors: {
      assessment: finalizeVector(abilityWeighted),
      interests: finalizeVector(interestWeighted),
      potential: finalizeVector(potentialWeighted),
      personality: profileFromPersonality(personality),
      games: buildGameVectorFromSessions(gameRows, careerRows),
    },
    evidence,
    weights: redistributeWeights(available, gameCapForCount(evidence.completedGameCount)),
  };
}

export function calculateConfidence(studentProfile) {
  const evidence = studentProfile?.evidence || {};
  let level = 'low';

  if (evidence.hasAssessment && (evidence.hasPersonality || evidence.hasInterests) && (evidence.hasPotential || evidence.hasGames || evidence.hasInterests)) {
    level = 'high';
  } else if (evidence.hasAssessment || (evidence.hasPersonality && evidence.hasInterests)) {
    level = 'medium';
  }

  return {
    confidence_level: level,
    confidence_reason: CONFIDENCE_MESSAGES[level],
    is_preliminary: level === 'low' || !evidence.hasAssessment,
  };
}

export function getMissingRecommendationSteps(studentProfile) {
  const evidence = studentProfile?.evidence || {};
  const missing = [];
  if (!evidence.hasAssessment) missing.push({ key: 'comprehensive_test', label: MISSING_STEP_COPY.comprehensive_test });
  if (!evidence.hasPersonality) missing.push({ key: 'personality_test', label: MISSING_STEP_COPY.personality_test });
  if (!evidence.hasInterests) missing.push({ key: 'interests', label: MISSING_STEP_COPY.interests });
  if (!evidence.hasGames) missing.push({ key: 'games', label: MISSING_STEP_COPY.games });
  return missing;
}

export function calculateMajorScores(studentProfile, majors = []) {
  const weights = studentProfile.weights || DEFAULT_WEIGHTS;
  const confidence = calculateConfidence(studentProfile);
  const missing_steps = getMissingRecommendationSteps(studentProfile);

  return majors.map((major) => {
    const profile = getMajorProfileForRow(major) || majorProfiles.find((item) => item.key === normalizeMajorKey(major.code)) || majorProfiles[0];
    const skillProfile = profile?.skillProfile || {};
    const parts = {
      assessment: dotProfile(studentProfile.vectors.assessment, skillProfile),
      personality: dotProfile(studentProfile.vectors.personality, skillProfile),
      interests: dotProfile(studentProfile.vectors.interests, skillProfile),
      potential: dotProfile(studentProfile.vectors.potential, skillProfile),
      games: dotProfile(studentProfile.vectors.games, skillProfile),
    };
    const rawScore = Object.entries(parts).reduce((sum, [key, score]) => sum + score * safeNum(weights[key], 0), 0);
    const gamePoints = Math.round(parts.games * safeNum(weights.games, 0) * 100);
    const matchPercentage = Math.round(clamp(rawScore * 100, confidence.confidence_level === 'low' ? 45 : 55, 95));

    return {
      degree_id: major.id || profile.key,
      major_id: major.id || profile.key,
      major_key: profile.key,
      code: major.code || major.key || profile.key,
      name_ar: major.name_ar || profile.name_ar,
      name_he: major.name_he || profile.name_he,
      name_en: major.name_en || profile.name_en,
      category: major.category || profile.key,
      score: Number((matchPercentage / 100).toFixed(4)),
      score_percent: matchPercentage,
      match_percentage: matchPercentage,
      confidence_level: confidence.confidence_level,
      confidence_reason: confidence.confidence_reason,
      is_preliminary: confidence.is_preliminary,
      missing_steps,
      usedWeights: weights,
      game_signal_bonus: Math.min(gamePoints, Math.round(gameCapForCount(studentProfile.evidence.completedGameCount) * 100)),
      breakdown: {
        sources: parts,
        weights,
        game: {
          bonus_percent: Math.min(gamePoints, Math.round(gameCapForCount(studentProfile.evidence.completedGameCount) * 100)),
          completed_game_count: studentProfile.evidence.completedGameCount,
        },
        evidence: studentProfile.evidence,
      },
      profile,
    };
  }).sort((left, right) => right.match_percentage - left.match_percentage);
}

export function explainMajorRecommendation(major, studentProfile, signals = {}, language = 'ar') {
  const lang = normalizeLang(language);
  const name = major[`name_${lang}`] || major.name_en || major.name_ar || major.name_he || major.code;
  const strongSources = Object.entries(major.breakdown?.sources || {})
    .filter(([, value]) => value >= 0.58)
    .map(([key]) => key);
  const gameSupported = safeNum(major.game_signal_bonus, 0) > 0;

  const text = {
    ar: `تم اقتراح ${name} لأن بياناتك تُظهر توافقًا في ${strongSources.join('، ') || 'عدة مؤشرات'}.${gameSupported ? ' إشارات الألعاب دعمت هذا الاتجاه بشكل خفيف.' : ''}`,
    he: `${name} הומלץ כי הנתונים שלך מצביעים על התאמה ב-${strongSources.join(', ') || 'כמה מדדים'}.${gameSupported ? ' תוצאות המשחקים שימשו כסימן תומך בלבד.' : ''}`,
    en: `${name} was suggested because your profile aligns across ${strongSources.join(', ') || 'several signals'}.${gameSupported ? ' Game results were used only as a light supporting signal.' : ''}`,
  };

  const topReasons = strongSources.slice(0, 3).map((source) => localized({
    ar: source === 'assessment' ? 'نتائج الاختبار الشامل تدعم هذا المسار' : source === 'games' ? 'إشارات الألعاب داعمة بشكل محدود' : `مصدر ${source} يدعم هذا المسار`,
    he: source === 'assessment' ? 'תוצאות המבחן המקיף תומכות במסלול' : source === 'games' ? 'אותות המשחקים תומכים באופן מוגבל' : `מקור ${source} תומך במסלול`,
    en: source === 'assessment' ? 'Comprehensive test results support this path' : source === 'games' ? 'Game signals lightly support this path' : `${source} supports this path`,
  }, lang));

  return {
    explanation: text[lang],
    top_reasons: topReasons,
    related_game_signals: signals.gameSignals || [],
  };
}

export async function getRecommendedMajors(studentId, options = {}) {
  const language = normalizeLang(options.language);
  const limit = Math.max(1, Math.min(20, safeNum(options.limit, 5)));
  const studentProfile = await buildStudentRecommendationProfile(studentId);
  const majors = await loadMajors();
  const scores = calculateMajorScores(studentProfile, majors).slice(0, limit);

  return scores.map((major) => {
    const explanation = explainMajorRecommendation(major, studentProfile, {}, language);
    const name = major[`name_${language}`] || major.name_en || major.name_ar || major.name_he || major.code;
    return {
      ...major,
      name,
      ...explanation,
    };
  });
}

export async function getRecommendedMajorsWithInstitutions(studentId, options = {}) {
  const language = normalizeLang(options.language);
  const recommendations = await getRecommendedMajors(studentId, options);
  const studentProfile = await buildStudentRecommendationProfile(studentId);
  const location = options.studentLocation || {
    city: studentProfile.student?.city || studentProfile.student?.city_ar || studentProfile.student?.city_he || studentProfile.student?.school_name,
    region: studentProfile.student?.region,
    latitude: studentProfile.student?.latitude,
    longitude: studentProfile.student?.longitude,
    languagePreference: language,
  };

  const enriched = await Promise.all(recommendations.map(async (major) => ({
    ...major,
    institutions: await getInstitutionsForMajor(major.degree_id || major.major_key || major.code, location, {
      language,
      majorKey: major.major_key || major.code,
    }),
  })));

  return enriched;
}

export default {
  buildStudentRecommendationProfile,
  calculateMajorScores,
  calculateConfidence,
  getMissingRecommendationSteps,
  explainMajorRecommendation,
  getRecommendedMajors,
  getRecommendedMajorsWithInstitutions,
};
