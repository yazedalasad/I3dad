import { supabase } from '../config/supabase';
import { recommendTopDegrees, getRecommendedMajorsWithInstitutions } from './recommendationService';
import { getStudentGameCareerSignalSummary, refreshStudentGameCareerSignals } from './gameCareerSignalService';

function safeNum(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, safeNum(value)));
}

function pickName(row, language = 'ar') {
  if (!row) return '';
  if (language === 'he') return row.name_he || row.name_ar || row.name_en || row.name || row.code || '';
  if (language === 'en') return row.name_en || row.name_ar || row.name_he || row.name || row.code || '';
  return row.name_ar || row.name_he || row.name_en || row.name || row.code || '';
}

function studentName(student) {
  return (
    student?.full_name ||
    `${student?.first_name || ''} ${student?.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
    student?.email ||
    'الطالب'
  );
}

function subjectName(row, language = 'ar') {
  return pickName(row?.subjects, language) || row?.subject_name || 'مجال';
}

function confidenceLevel({ hasAssessment, abilitiesCount, hasPersonality, gameSignalCount }) {
  if (hasAssessment && abilitiesCount >= 3 && hasPersonality && gameSignalCount >= 1) {
    return {
      level: 'high',
      label: 'ثقة عالية',
      message: 'الاختبار والشخصية وإشارات الألعاب أعطت صورة متقاربة.',
    };
  }
  if (hasAssessment && abilitiesCount > 0) {
    return {
      level: 'medium',
      label: 'ثقة متوسطة',
      message: 'الاختبار أعطى صورة جيدة، وإكمال الشخصية أو الألعاب سيزيد الدقة.',
    };
  }
  return {
    level: 'low',
    label: 'ثقة منخفضة',
    message: 'نحتاج بيانات أكثر قبل بناء توصية قوية.',
  };
}

function buildProfileCompletion({ abilities, interests, personality, gameSignals, recommendations }) {
  const checks = [
    abilities.length >= 3,
    interests.length >= 2,
    Boolean(personality),
    (gameSignals.skills || []).length > 0 || (gameSignals.topics || []).length > 0,
    recommendations.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildStrengths(abilities, gameSignals, language) {
  const examStrengths = abilities
    .slice()
    .sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
    .slice(0, 3)
    .map((row) => ({
      label: subjectName(row, language),
      score: Math.round(clamp(row.ability_score)),
      source: 'من الامتحان',
      sourceType: 'exam',
    }));

  const gameStrengths = (gameSignals.skills || []).slice(0, 3).map((skill) => ({
    label: skill.label || skill.skill_tag,
    score: Math.round(clamp(skill.score)),
    source: 'من الألعاب',
    sourceType: 'game',
  }));

  const merged = [...examStrengths];
  gameStrengths.forEach((item) => {
    const existing = merged.find((row) => row.label === item.label);
    if (existing) {
      existing.source = 'من الامتحان والألعاب';
      existing.sourceType = 'both';
      existing.score = Math.max(existing.score, item.score);
    } else {
      merged.push(item);
    }
  });
  return merged.slice(0, 6);
}

function buildImprovements({ abilities, interests, personality, gameSignals }) {
  const items = [];
  abilities
    .slice()
    .sort((a, b) => safeNum(a.ability_score) - safeNum(b.ability_score))
    .slice(0, 2)
    .forEach((row) => {
      if (safeNum(row.ability_score) < 70) {
        items.push({
          title: `${subjectName(row)} يحتاج تقوية`,
          hint: 'فرصة للتطوير من خلال أسئلة أعمق وتدريب قصير.',
          icon: 'trending-up',
        });
      }
    });

  const lowInterest = interests
    .slice()
    .sort((a, b) => safeNum(a.interest_score) - safeNum(b.interest_score))[0];
  if (lowInterest && safeNum(lowInterest.interest_score) < 55) {
    items.push({
      title: `التفاعل مع ${subjectName(lowInterest)} يمكن تحسينه`,
      hint: 'جرّب نشاطًا قصيرًا في هذا المجال قبل الحكم عليه.',
      icon: 'sparkles',
    });
  }
  if (!personality) {
    items.push({
      title: 'اختبار الشخصية غير مكتمل',
      hint: 'إكماله يساعد في تفسير طريقة تفكيرك، وليس فقط درجاتك.',
      icon: 'person',
    });
  }
  if (!(gameSignals.skills || []).length) {
    items.push({
      title: 'جرّب لعبة أو لعبتين',
      hint: 'الألعاب تضيف إشارات عملية داعمة ولا تستبدل الامتحان.',
      icon: 'game-controller',
    });
  }
  return items.slice(0, 5);
}

function buildLearningPotential(potentialRows, gameSessions) {
  const avgPotential = potentialRows.length
    ? potentialRows.reduce((sum, row) => sum + safeNum(row.potential_score), 0) / potentialRows.length
    : 0;
  const completedGames = gameSessions.filter((session) => session.status === 'completed').length;
  const avgEngagement = gameSessions.length
    ? gameSessions.reduce((sum, row) => sum + safeNum(row.engagement_score), 0) / gameSessions.length
    : 0;

  return {
    persistence: Math.round(clamp(Math.max(avgEngagement, completedGames * 18))),
    improvement: Math.round(clamp(avgPotential || avgEngagement)),
    focus: Math.round(clamp(avgEngagement)),
    speedStability: Math.round(clamp(65 + completedGames * 5, 0, 95)),
    message:
      completedGames > 1
        ? 'محاولاتك المتكررة وتحسنك في الأنشطة تعني أن عندك قابلية تعلم جيدة.'
        : 'كلما جرّبت أكثر، تظهر إمكانات التعلم بشكل أوضح.',
  };
}

function buildExplanation(bestRecommendation, strengths, gameSignals) {
  if (!bestRecommendation) {
    return 'لا توجد توصية جاهزة بعد. أكمل الاختبار الشامل أولاً.';
  }
  if (bestRecommendation.explanation) {
    return bestRecommendation.explanation;
  }

  const examPart = strengths.filter((item) => item.sourceType === 'exam' || item.sourceType === 'both').slice(0, 2);
  const gameExplanation = gameSignals.explanations?.[0]?.reason_ar;
  const parts = [];

  if (examPart.length) {
    parts.push(`الامتحان أظهر قوة في ${examPart.map((item) => item.label).join(' و ')}.`);
  } else {
    parts.push('الامتحان هو المصدر الأساسي للتوصية، ونحتاج إكماله لزيادة الدقة.');
  }

  const personalityScore = bestRecommendation.breakdown?.personality?.score;
  if (personalityScore !== undefined) {
    parts.push('نتيجة الشخصية ساعدتنا نفهم طريقة تفكيرك ومدى ملاءمتها للمجال.');
  }

  const interestScore = bestRecommendation.breakdown?.interest?.score;
  if (interestScore !== undefined) {
    parts.push('سلوكك في الاختبار أظهر المجالات التي تفاعلت معها أكثر.');
  }

  if (safeNum(bestRecommendation.game_signal_bonus) > 0 && gameExplanation) {
    parts.push('الألعاب أعطت إشارة داعمة، لكنها ليست المصدر الأساسي للتوصية.');
  }

  return parts.join(' ');
}

function buildNextSteps({ bestRecommendation, hasPersonality, hasGames }) {
  const degreeName = bestRecommendation?.name || 'التخصص المقترح';
  const steps = [
    { key: 'report', title: 'افتح التقرير الكامل', route: 'studentInsightReport', icon: 'document-text' },
    { key: 'recommendations', title: 'شاهد كل التوصيات', route: 'recommendations', icon: 'compass' },
    { key: 'miniTasks', title: `جرّب مهمة قصيرة في ${degreeName}`, route: 'miniTasks', icon: 'bulb' },
    { key: 'games', title: 'العب لعبة جديدة', route: 'games', icon: 'game-controller' },
    { key: 'universities', title: 'شاهد الجامعات القريبة', route: 'universitiesAndColleges', icon: 'location' },
  ];
  if (!hasPersonality) steps.push({ key: 'personality', title: 'أنهِ اختبار الشخصية', route: 'personalityTest', icon: 'person' });
  if (!hasGames) steps.push({ key: 'moreGames', title: 'العب لعبتين إضافيتين', route: 'games', icon: 'sparkles' });
  return steps.slice(0, 6);
}

function institutionKey(program) {
  const institution = program?.institution || {};
  return String(program?.institution_id || institution.id || program?.institution_name || institution.name || '').trim();
}

function buildRecommendedInstitutions(recommendations = [], language = 'ar') {
  const institutions = new Map();

  recommendations.forEach((recommendation) => {
    const majorName = pickName(recommendation, language) || recommendation.name;
    const scorePercent = Math.round(clamp(recommendation.score_percent ?? recommendation.match_percentage ?? safeNum(recommendation.score, 0) * 100));

    (recommendation.institutions || []).forEach((program) => {
      const key = institutionKey(program);
      if (!key) return;

      const institution = program.institution || {};
      const existing = institutions.get(key) || {
        id: program.institution_id || institution.id || key,
        institution,
        programs: [],
        majors: [],
        bestScore: 0,
        distance_km: program.distance_km ?? null,
        same_region: !!program.same_region,
        active_match: program.active_match !== false,
        type: institution.type || institution.institution_type || program.institution_type || '',
        city_ar: institution.city_ar || program.city || '',
        city_he: institution.city_he || program.city || '',
        city_en: institution.city_en || program.city || '',
        region: institution.region || program.region || '',
      };

      existing.programs.push(program);
      existing.bestScore = Math.max(existing.bestScore, scorePercent);
      if (program.distance_km !== null && program.distance_km !== undefined) {
        existing.distance_km = existing.distance_km === null ? program.distance_km : Math.min(existing.distance_km, program.distance_km);
      }
      existing.same_region = existing.same_region || !!program.same_region;
      existing.active_match = existing.active_match || program.active_match !== false;

      if (majorName && !existing.majors.some((major) => major.name === majorName)) {
        existing.majors.push({
          id: recommendation.major_id || recommendation.degree_id || recommendation.major_key || recommendation.code,
          name: majorName,
          score_percent: scorePercent,
        });
      }

      institutions.set(key, existing);
    });
  });

  const typeRank = { university: 0, academic_college: 1, college: 1, engineering_college: 1, practical_engineering: 2, open_university: 3, other: 4 };

  return [...institutions.values()]
    .sort((left, right) => {
      if (left.same_region !== right.same_region) return left.same_region ? -1 : 1;
      if (left.distance_km !== null || right.distance_km !== null) return (left.distance_km ?? Infinity) - (right.distance_km ?? Infinity);
      if (right.bestScore !== left.bestScore) return right.bestScore - left.bestScore;
      return (typeRank[left.type] ?? 5) - (typeRank[right.type] ?? 5);
    })
    .slice(0, 5);
}

export async function buildStudentProfileSummary(studentId, options = {}) {
  if (!studentId) throw new Error('studentId is required');
  const language = options.language || 'ar';

  await refreshStudentGameCareerSignals(studentId).catch(() => null);

  const [
    studentRes,
    abilitiesRes,
    interestsRes,
    potentialRes,
    recommendationsRes,
    personalityRes,
    gameSessionsRes,
    gameSkillsRes,
    gameInterestsRes,
    careerSignalsRes,
    gameSignalSummary,
    topDegreesRes,
    institutionsRes,
  ] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).maybeSingle(),
    supabase.from('student_abilities').select('*, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_interests').select('*, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_learning_potential').select('*, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_recommendations').select('*').eq('student_id', studentId).order('rank', { ascending: true }),
    supabase.from('student_personality_profiles').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('game_sessions').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
    supabase.from('student_game_skills').select('*').eq('student_id', studentId).order('signal_strength', { ascending: false }).limit(50),
    supabase.from('student_game_interests').select('*').eq('student_id', studentId).order('interest_signal', { ascending: false }).limit(50),
    supabase.from('student_career_signals').select('*').eq('student_id', studentId).order('career_signal', { ascending: false }).limit(50),
    getStudentGameCareerSignalSummary(studentId),
    recommendTopDegrees(studentId, { language, limit: 5 }),
    getRecommendedMajorsWithInstitutions(studentId, { language, limit: 5 }),
  ]);

  if (studentRes.error) throw studentRes.error;

  const student = studentRes.data || {};
  const abilities = abilitiesRes.error ? [] : abilitiesRes.data || [];
  const interests = interestsRes.error ? [] : interestsRes.data || [];
  const learningPotentialRows = potentialRes.error ? [] : potentialRes.data || [];
  const storedRecommendations = recommendationsRes.error ? [] : recommendationsRes.data || [];
  const personality = personalityRes.error ? null : personalityRes.data || null;
  const gameSessions = gameSessionsRes.error ? [] : gameSessionsRes.data || [];
  const gameSkills = gameSkillsRes.error ? [] : gameSkillsRes.data || [];
  const gameInterests = gameInterestsRes.error ? [] : gameInterestsRes.data || [];
  const careerSignals = careerSignalsRes.error ? [] : careerSignalsRes.data || [];
  const topFields = topDegreesRes?.success ? topDegreesRes.data || [] : [];
  const institutionRecommendations = institutionsRes?.success ? institutionsRes.data || [] : [];
  const bestRecommendation = topFields[0] || null;
  const gameSignals = gameSignalSummary || { skills: [], topics: [], degrees: [], explanations: [] };
  const strengths = buildStrengths(abilities, gameSignals, language);
  const improvements = buildImprovements({ abilities, interests, personality, gameSignals });
  const hasAssessment = abilities.length > 0 || !!topFields[0]?.breakdown?.evidence?.hasAssessment;
  const hasGames = gameSkills.length > 0 || gameInterests.length > 0 || careerSignals.length > 0 || gameSessions.some((s) => s.status === 'completed');
  const confidence = confidenceLevel({
    hasAssessment,
    abilitiesCount: abilities.length,
    hasPersonality: Boolean(personality),
    gameSignalCount: gameSignals.skills?.length || careerSignals.length,
  });
  const profileCompletion = buildProfileCompletion({
    abilities,
    interests,
    personality,
    gameSignals,
    recommendations: topFields.length ? topFields : storedRecommendations,
  });

  const abilityHighlights = abilities
    .slice()
    .sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
    .slice(0, 4)
    .map((row) => ({ label: subjectName(row, language), score: Math.round(clamp(row.ability_score)) }));

  const interestHighlights = interests
    .slice()
    .sort((a, b) => safeNum(b.interest_score) - safeNum(a.interest_score))
    .slice(0, 4)
    .map((row) => ({ label: subjectName(row, language), score: Math.round(clamp(row.interest_score)) }));

  const personalityHighlights = personality
    ? [
        { label: 'تفكير منفتح', score: Math.round(clamp(personality.openness)) },
        { label: 'انضباط ومثابرة', score: Math.round(clamp(personality.conscientiousness)) },
        { label: 'إدارة الضغط', score: Math.round(clamp(100 - safeNum(personality.neuroticism))) },
      ].filter((item) => item.score > 0)
    : [];

  const learningPotential = buildLearningPotential(learningPotentialRows, gameSessions);
  const explanation = buildExplanation(bestRecommendation, strengths, gameSignals);

  return {
    student: { ...student, display_name: studentName(student) },
    profileCompletion,
    bestRecommendation,
    confidenceLevel: {
      ...confidence,
      score: bestRecommendation?.confidence_score ?? 0,
    },
    abilityHighlights,
    interestHighlights,
    personalityHighlights,
    gameHighlights: gameSignals,
    strengths,
    improvements,
    topFields,
    recommendedInstitutions: buildRecommendedInstitutions(institutionRecommendations, language),
    learningPotential,
    nextSteps: buildNextSteps({ bestRecommendation, hasPersonality: Boolean(personality), hasGames }),
    explanation,
    dataQuality: {
      fullAssessmentCompleted: hasAssessment,
      personalityCompleted: Boolean(personality),
      gamesPlayed: hasGames,
      miniTasksCompleted: false,
      missing: [
        !hasAssessment && 'أكمل الاختبار الشامل أولاً',
        !personality && 'أنهِ اختبار الشخصية',
        !hasGames && 'العب لعبة أو لعبتين لتحسين دقة البروفايل',
      ].filter(Boolean),
    },
  };
}

export default {
  buildStudentProfileSummary,
};
