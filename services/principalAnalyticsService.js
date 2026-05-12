import { supabase } from '../config/supabase';
import { buildClassLabel, normalizeClassSection } from '../utils/classSections';
import { getCurrentPrincipal, getPrincipalStudents } from './principalExperienceService';
import { recommendTopDegrees } from './recommendationService';

const EMPTY_LABEL = 'لا توجد بيانات كافية';

const DEGREE_LABELS_AR = {
  EE_BSC: 'الهندسة الكهربائية (بكالوريوس)',
  electrical_engineering: 'الهندسة الكهربائية',
  CS_BSC: 'علوم الحاسوب (بكالوريوس)',
  computer_science: 'علوم الحاسوب',
  CE_BSC: 'الهندسة المدنية (بكالوريوس)',
  civil_engineering: 'الهندسة المدنية',
  NURS_BN: 'تمريض (بكالوريوس)',
  nursing: 'تمريض',
  ARCH_BARCH: 'هندسة معمارية (بكالوريوس)',
  architecture: 'هندسة معمارية',
  ME_BSC: 'الهندسة الميكانيكية (بكالوريوس)',
  mechanical_engineering: 'الهندسة الميكانيكية',
  DATA_BSC: 'علوم البيانات (بكالوريوس)',
  data_science: 'علوم البيانات',
  EDU_BED: 'تربية (بكالوريوس)',
  education: 'تربية وتعليم',
  PHYS_BSC: 'فيزياء (بكالوريوس)',
  physics: 'فيزياء',
  BIOTECH_BSC: 'تكنولوجيا حيوية (بكالوريوس)',
  biotechnology: 'بيوتكنولوجيا',
  LAW_LLB: 'قانون (بكالوريوس)',
  law: 'قانون',
  COM_BA: 'اتصال (بكالوريوس)',
  media: 'إعلام',
  medicine: 'طب',
  medical_laboratory_science: 'مختبرات طبية',
  arabic_language: 'لغة عربية',
  translation: 'ترجمة',
  SE_BSC: 'هندسة البرمجيات (بكالوريوس)',
  AI_BSC: 'ذكاء اصطناعي (بكالوريوس)',
  CYBER_BSC: 'أمن سيبراني (بكالوريوس)',
  BIO_BSC: 'أحياء (بكالوريوس)',
  CHEM_BSC: 'كيمياء (بكالوريوس)',
  PSY_BA: 'علم النفس (بكالوريوس)',
  SOC_BA: 'علم الاجتماع (بكالوريوس)',
};

const DEGREE_ALIAS_CODES = {
  electrical_engineering: 'EE_BSC',
  computer_science: 'CS_BSC',
  civil_engineering: 'CE_BSC',
  nursing: 'NURS_BN',
  architecture: 'ARCH_BARCH',
  mechanical_engineering: 'ME_BSC',
  data_science: 'DATA_BSC',
  education: 'EDU_BED',
  physics: 'PHYS_BSC',
  biotechnology: 'BIOTECH_BSC',
  law: 'LAW_LLB',
  media: 'COM_BA',
};

const SUBJECT_LABELS_AR = {
  physics: 'فيزياء',
  math: 'رياضيات',
  biology: 'أحياء',
  chemistry: 'كيمياء',
  arabic: 'لغة عربية',
  hebrew: 'لغة عبرية',
  computer_science: 'علوم الحاسوب',
  literature: 'أدب',
  VR: 'الاستدلال اللفظي',
  QR: 'الاستدلال الكمي',
  DI: 'تفسير المعطيات',
  LR: 'التفكير المنطقي والمجرد',
};

function hasBrokenEncoding(value) {
  const text = String(value || '');
  return /[ÙØÃÂ]/.test(text) || text.includes('�');
}

function readableText(value, fallback = '') {
  if (!value || hasBrokenEncoding(value)) return fallback;
  return value;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value) {
  return Math.max(0, Math.min(100, Math.round(num(value))));
}

function avg(values = []) {
  const clean = values.map((value) => num(value, NaN)).filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function fullName(student) {
  return (
    readableText(student?.full_name) ||
    `${readableText(student?.first_name) || ''} ${readableText(student?.last_name) || ''}`.replace(/\s+/g, ' ').trim() ||
    student?.email ||
    'طالب'
  );
}

function subjectName(row) {
  const code = row?.subjects?.code || row?.subject_code || row?.code;
  return SUBJECT_LABELS_AR[code] || readableText(row?.subjects?.name_ar) || readableText(row?.subject_name) || row?.subjects?.name_en || 'مجال';
}

function degreeName(row) {
  const code = row?.degrees?.code || row?.degree_code || row?.code;
  return DEGREE_LABELS_AR[code] || readableText(row?.degrees?.name_ar) || readableText(row?.name_ar) || row?.degrees?.name_en || code || 'تخصص';
}

function recommendationDegreeName(row) {
  const code = row?.code || row?.degree_code;
  return DEGREE_LABELS_AR[code] || readableText(row?.name) || readableText(row?.name_ar) || row?.name_en || code || 'تخصص';
}

function normalizeMajorKey(value) {
  const aliasCode = DEGREE_ALIAS_CODES[value] || value;
  const raw = String(aliasCode || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/بكالوريوس|bachelor|תואר ראשון/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function groupBy(rows, keyFn) {
  return rows.reduce((map, row) => {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
}

function topCount(rows, keyFn, labelFn = (value) => value, limit = 5) {
  const counts = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    const current = counts.get(key) || { key, label: labelFn(row, key), count: 0, scores: [] };
    current.count += 1;
    if (row.score != null) current.scores.push(num(row.score));
    counts.set(key, current);
  });
  return Array.from(counts.values())
    .map((item) => ({ ...item, avgScore: pct(avg(item.scores)) }))
    .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
    .slice(0, limit);
}

function personalityType(profile) {
  if (!profile) return 'غير مكتمل';
  const analytical = avg([profile.openness, profile.conscientiousness, 100 - num(profile.neuroticism)]);
  const social = avg([profile.agreeableness, profile.extraversion]);
  const creative = num(profile.openness);
  const disciplined = num(profile.conscientiousness);
  const options = [
    { key: 'analytical', label: 'تحليلي', score: analytical },
    { key: 'social', label: 'اجتماعي', score: social },
    { key: 'creative', label: 'إبداعي', score: creative },
    { key: 'disciplined', label: 'منضبط', score: disciplined },
  ];
  return options.sort((a, b) => b.score - a.score)[0]?.label || 'غير مكتمل';
}

function potentialLevel(score) {
  const value = pct(score);
  if (value >= 80) return { key: 'high', label: 'إمكانات عالية', color: '#16A34A' };
  if (value >= 60) return { key: 'medium', label: 'إمكانات متوسطة', color: '#2563EB' };
  return { key: 'support', label: 'يحتاج متابعة', color: '#D97706' };
}

function gameSupportLevel({ careerSignal = 0, hasCompletedGame = false }) {
  const value = pct(careerSignal);
  if (value >= 80) return { key: 'strong', label: 'دعم قوي من الألعاب', color: '#16A34A' };
  if (value >= 55 || hasCompletedGame) return { key: 'medium', label: 'دعم متوسط من الألعاب', color: '#2563EB' };
  return { key: 'weak', label: 'دعم بسيط من الألعاب', color: '#64748B' };
}

function careerMatchScore(row) {
  if (!row) return 0;
  const ability = num(row.ability_signal, NaN);
  const interest = num(row.interest_signal, NaN);
  const hasSignals = Number.isFinite(ability) || Number.isFinite(interest);
  if (hasSignals) {
    const abilityPart = Number.isFinite(ability) ? ability : interest;
    const interestPart = Number.isFinite(interest) ? interest : ability;
    const weighted = abilityPart * 0.55 + interestPart * 0.45;
    const weight = Math.max(0.4, Math.min(1.15, num(row.signal_weight, 1)));
    return pct(weighted * weight);
  }

  const raw = num(row.career_signal, 0);
  if (raw <= 100) return pct(raw);
  if (raw <= 220) return pct(raw / 2);
  return pct(raw / 3);
}

async function safeQuery(builder, fallback = []) {
  const { data, error } = await builder;
  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('does not exist') || message.includes('column') || message.includes('relationship')) {
      return fallback;
    }
    throw error;
  }
  return data || fallback;
}

async function loadSchoolAnalyticsDataset() {
  const principal = await getCurrentPrincipal();
  const students = await getPrincipalStudents(principal.school_id);
  const studentIds = students.map((student) => student.id);

  if (!studentIds.length) {
    return {
      principal,
      students,
      sessions: [],
      abilities: [],
      interests: [],
      potentials: [],
      personalityProfiles: [],
      personalitySessions: [],
      gameSessions: [],
      gameSkills: [],
      gameInterests: [],
      careerSignals: [],
      recommendations: [],
    };
  }

  const [
    sessions,
    abilities,
    interests,
    potentials,
    personalityProfiles,
    personalitySessions,
    gameSessions,
    gameSkills,
    gameInterests,
    careerSignals,
    recommendations,
  ] = await Promise.all([
    safeQuery(
      supabase
        .from('test_sessions')
        .select('id, student_id, school_id, session_type, status, started_at, completed_at, final_score, correct_answers, wrong_answers, skipped_questions, engagement_score')
        .in('student_id', studentIds)
        .order('started_at', { ascending: false })
    ),
    safeQuery(
      supabase
        .from('student_abilities')
        .select('student_id, subject_id, ability_score, theta_estimate, confidence_level, total_questions_answered, correct_answers, accuracy_rate, subjects(name_ar, name_he, name_en, code)')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_interests')
        .select('student_id, subject_id, interest_score, subjects(name_ar, name_he, name_en, code)')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_learning_potential')
        .select('student_id, subject_id, potential_score, ability_component, interest_component, growth_component, subjects(name_ar, name_he, name_en, code)')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_personality_profiles')
        .select('student_id, openness, conscientiousness, extraversion, agreeableness, neuroticism, confidence_level, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
    ),
    safeQuery(
      supabase
        .from('personality_test_sessions')
        .select('id, student_id, status, questions_answered, completed_at, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
    ),
    safeQuery(
      supabase
        .from('game_sessions')
        .select('id, student_id, game_id, status, engagement_score, interest_signal, trust_score, started_at, ended_at, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
    ),
    safeQuery(
      supabase
        .from('student_game_skills')
        .select('student_id, game_session_id, game_key, topic_key, skill_tag, ability_signal, interest_signal, signal_strength')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_game_interests')
        .select('student_id, game_session_id, game_key, topic_key, related_subject, ability_signal, interest_signal, signal_weight')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_career_signals')
        .select('student_id, game_session_id, game_key, topic_key, degree_code, degree_id, ability_signal, interest_signal, career_signal, degrees(name_ar, name_he, name_en, code)')
        .in('student_id', studentIds)
    ),
    safeQuery(
      supabase
        .from('student_recommendations')
        .select('id, student_id, subject_id, rank, recommendation_score, reason_ar, reason_he, reason_en, status, subjects(name_ar, name_he, name_en, code)')
        .in('student_id', studentIds)
        .order('rank', { ascending: true })
    ),
  ]);

  const degreeRecommendations = new Map();
  await Promise.all(
    studentIds.map(async (studentId) => {
      try {
        const result = await recommendTopDegrees(studentId, { language: 'ar', limit: 5 });
        degreeRecommendations.set(studentId, result?.success ? result.data || [] : []);
      } catch {
        degreeRecommendations.set(studentId, []);
      }
    })
  );

  return {
    principal,
    students,
    sessions,
    abilities,
    interests,
    potentials,
    personalityProfiles,
    personalitySessions,
    gameSessions,
    gameSkills,
    gameInterests,
    careerSignals,
    recommendations,
    degreeRecommendations,
  };
}

function buildStudentCareerRows(dataset) {
  const sessionsByStudent = groupBy(dataset.sessions, (row) => row.student_id);
  const abilitiesByStudent = groupBy(dataset.abilities, (row) => row.student_id);
  const interestsByStudent = groupBy(dataset.interests, (row) => row.student_id);
  const potentialsByStudent = groupBy(dataset.potentials, (row) => row.student_id);
  const personalityByStudent = new Map();
  dataset.personalityProfiles.forEach((profile) => {
    if (!personalityByStudent.has(profile.student_id)) personalityByStudent.set(profile.student_id, profile);
  });
  const personalitySessionByStudent = new Map();
  dataset.personalitySessions.forEach((session) => {
    if (session.status === 'completed' && !personalitySessionByStudent.has(session.student_id)) {
      personalitySessionByStudent.set(session.student_id, session);
    }
  });
  const gamesByStudent = groupBy(dataset.gameSessions, (row) => row.student_id);
  const careerByStudent = groupBy(dataset.careerSignals, (row) => row.student_id);
  const recommendationsByStudent = groupBy(dataset.recommendations, (row) => row.student_id);

  return dataset.students.map((student) => {
    const studentSessions = sessionsByStudent.get(student.id) || [];
    const completedSessions = studentSessions.filter((session) => session.status === 'completed');
    const fullAssessment = completedSessions.find((session) => session.session_type === 'full_assessment') || completedSessions[0] || null;
    const studentAbilities = abilitiesByStudent.get(student.id) || [];
    const studentInterests = interestsByStudent.get(student.id) || [];
    const studentPotentials = potentialsByStudent.get(student.id) || [];
    const profile = personalityByStudent.get(student.id) || null;
    const personalitySession = personalitySessionByStudent.get(student.id) || null;
    const studentGames = gamesByStudent.get(student.id) || [];
    const completedGames = studentGames.filter((game) => game.status === 'completed');
    const studentCareerSignals = careerByStudent.get(student.id) || [];
    const studentRecommendations = recommendationsByStudent.get(student.id) || [];
    const degreeRecommendations = dataset.degreeRecommendations?.get(student.id) || [];

    const topCareerSignal = studentCareerSignals.slice().sort((a, b) => careerMatchScore(b) - careerMatchScore(a))[0] || null;
    const topDegreeRecommendation = degreeRecommendations[0] || null;
    const topRecommendation = studentRecommendations.slice().sort((a, b) => num(a.rank, 99) - num(b.rank, 99))[0] || null;
    const topAbility = studentAbilities.slice().sort((a, b) => num(b.ability_score) - num(a.ability_score))[0] || null;
    const topInterest = studentInterests.slice().sort((a, b) => num(b.interest_score) - num(a.interest_score))[0] || null;
    const averageScore = pct(avg([
      ...studentAbilities.map((row) => row.ability_score),
      ...completedSessions.map((row) => row.final_score).filter((value) => value != null),
    ]));
    const learningPotentialScore = pct(avg(studentPotentials.map((row) => row.potential_score)));
    const gameSupport = gameSupportLevel({
      careerSignal: careerMatchScore(topCareerSignal),
      hasCompletedGame: completedGames.length > 0,
    });
    const potential = potentialLevel(learningPotentialScore);
    const topMajor = topDegreeRecommendation
      ? recommendationDegreeName(topDegreeRecommendation)
      : topCareerSignal
        ? degreeName(topCareerSignal)
        : topRecommendation
        ? subjectName(topRecommendation)
        : topAbility
          ? subjectName(topAbility)
          : EMPTY_LABEL;
    const topMajorScore = topDegreeRecommendation
      ? pct(topDegreeRecommendation.score_percent)
      : topCareerSignal
        ? careerMatchScore(topCareerSignal)
        : topRecommendation
        ? pct(topRecommendation.recommendation_score)
        : averageScore;

    return {
      ...student,
      full_name: fullName(student),
      class_label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
      latestSession: studentSessions[0] || null,
      last_test_date: fullAssessment?.completed_at || fullAssessment?.started_at || null,
      completed_tests: completedSessions.length,
      completion_status: fullAssessment ? 'completed' : 'not_completed',
      average_score: averageScore,
      engagement_score: pct(avg(studentSessions.map((row) => row.engagement_score))),
      top_major: topMajor,
      top_major_key: topDegreeRecommendation?.code || topCareerSignal?.degree_code || normalizeMajorKey(topMajor),
      top_major_score: topMajorScore,
      top_interest: topInterest ? subjectName(topInterest) : EMPTY_LABEL,
      top_ability: topAbility ? subjectName(topAbility) : EMPTY_LABEL,
      personality_type: personalityType(profile),
      learning_potential_score: learningPotentialScore,
      learning_potential_level: potential.label,
      learning_potential_key: potential.key,
      game_support_level: gameSupport.label,
      game_support_key: gameSupport.key,
      completed_games: completedGames.length,
      has_personality: Boolean(profile || personalitySession),
      has_personality_profile: Boolean(profile),
      raw: {
        abilities: studentAbilities,
        interests: studentInterests,
        potentials: studentPotentials,
        personality: profile,
        personalitySession,
        games: studentGames,
        careerSignals: studentCareerSignals,
        recommendations: studentRecommendations,
        degreeRecommendations,
      },
    };
  });
}

function buildOverview(dataset, studentRows) {
  const completedFullAssessments = studentRows.filter((row) => row.completion_status === 'completed').length;
  const completedPersonality = studentRows.filter((row) => row.has_personality).length;
  const completedGames = dataset.gameSessions.filter((row) => row.status === 'completed').length;
  const topMajors = topCount(
    studentRows.filter((row) => row.top_major && row.top_major !== EMPTY_LABEL).map((row) => ({ ...row, score: row.top_major_score })),
    (row) => row.top_major_key || normalizeMajorKey(row.top_major),
    (row) => row.top_major,
    10
  );
  const topInterests = topCount(
    studentRows.filter((row) => row.top_interest && row.top_interest !== EMPTY_LABEL),
    (row) => row.top_interest,
    (row) => row.top_interest,
    8
  );

  return {
    totalStudents: dataset.students.length,
    activeStudents: dataset.students.filter((student) => student.is_active !== false).length,
    completedFullAssessments,
    completedPersonality,
    completedGames,
    averagePerformance: pct(avg(studentRows.map((row) => row.average_score))),
    averageEngagement: pct(avg(studentRows.map((row) => row.engagement_score))),
    completionRate: pct((completedFullAssessments / Math.max(dataset.students.length, 1)) * 100),
    topMajor: topMajors[0]?.label || EMPTY_LABEL,
    topInterest: topInterests[0]?.label || EMPTY_LABEL,
    topMajors,
    topInterests,
  };
}

function distributionBy(rows, keyFn, labelFn) {
  return Array.from(groupBy(rows, keyFn).entries())
    .map(([key, items]) => ({
      key,
      label: labelFn ? labelFn(key, items) : String(key),
      studentsCount: items.length,
      averagePerformance: pct(avg(items.map((row) => row.average_score))),
      averageEngagement: pct(avg(items.map((row) => row.engagement_score))),
      completionRate: pct((items.filter((row) => row.completion_status === 'completed').length / Math.max(items.length, 1)) * 100),
      topMajor: topCount(items, (row) => row.top_major_key || normalizeMajorKey(row.top_major), (row) => row.top_major, 1)[0]?.label || EMPTY_LABEL,
      topInterest: topCount(items, (row) => row.top_interest, (row) => row.top_interest, 1)[0]?.label || EMPTY_LABEL,
      topPersonality: topCount(items, (row) => row.personality_type, (row) => row.personality_type, 1)[0]?.label || EMPTY_LABEL,
      completedGames: items.reduce((sum, row) => sum + num(row.completed_games), 0),
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function buildAbilitiesAnalytics(dataset, studentRows) {
  const bySubject = Array.from(groupBy(dataset.abilities, (row) => row.subject_id || subjectName(row)).values())
    .map((rows) => ({
      label: subjectName(rows[0]),
      score: pct(avg(rows.map((row) => row.ability_score ?? row.theta_estimate ?? row.confidence_level))),
      studentsCount: new Set(rows.map((row) => row.student_id)).size,
    }))
    .sort((a, b) => b.score - a.score);

  const byGrade = distributionBy(studentRows, (row) => row.grade || '-', (key) => `صف ${key}`);
  const bySection = distributionBy(studentRows, (row) => normalizeClassSection(row.class_section), (key) => key);

  return {
    averageByAbility: bySubject,
    strongest: bySubject.slice(0, 5),
    weakest: bySubject.slice().sort((a, b) => a.score - b.score).slice(0, 5),
    byGrade,
    bySection,
    radar: bySubject.slice(0, 8),
  };
}

function buildInterestsAnalytics(dataset, studentRows) {
  const bySubject = Array.from(groupBy(dataset.interests, (row) => row.subject_id || subjectName(row)).values())
    .map((rows) => ({
      label: subjectName(rows[0]),
      score: pct(avg(rows.map((row) => row.interest_score))),
      studentsCount: new Set(rows.map((row) => row.student_id)).size,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    topInterests: bySubject.slice(0, 8),
    categories: buildInterestCategories(studentRows),
    byGrade: distributionBy(studentRows, (row) => row.grade || '-', (key) => `صف ${key}`),
    bySection: distributionBy(studentRows, (row) => normalizeClassSection(row.class_section), (key) => key),
  };
}

function buildInterestCategories(studentRows) {
  const categories = [
    { key: 'medical', label: 'طبي', match: ['طب', 'تمريض', 'مختبر', 'أحياء', 'كيمياء'] },
    { key: 'engineering', label: 'هندسي', match: ['هندسة', 'فيزياء', 'رياضيات'] },
    { key: 'technology', label: 'تقني', match: ['حاسوب', 'بيانات', 'Computer'] },
    { key: 'education', label: 'تربوي', match: ['تعليم', 'تربية', 'لغة'] },
    { key: 'arts', label: 'إبداعي', match: ['إعلام', 'أدب', 'ترجمة'] },
    { key: 'science', label: 'علمي', match: ['فيزياء', 'أحياء', 'كيمياء'] },
  ];
  return categories
    .map((category) => {
      const rows = studentRows.filter((row) => {
        const haystack = `${row.top_major} ${row.top_interest} ${row.top_ability}`;
        return category.match.some((word) => haystack.includes(word));
      });
      return { ...category, count: rows.length, score: pct((rows.length / Math.max(studentRows.length, 1)) * 100) };
    })
    .sort((a, b) => b.count - a.count);
}

function buildPersonalityAnalytics(dataset, studentRows) {
  const profiles = dataset.personalityProfiles;
  const distribution = topCount(
    studentRows.filter((row) => row.personality_type !== 'غير مكتمل'),
    (row) => row.personality_type,
    (row) => row.personality_type,
    6
  );
  const traits = [
    { key: 'analytical', label: 'Analytical', score: pct(avg(profiles.map((p) => avg([p.openness, p.conscientiousness, 100 - num(p.neuroticism)])))) },
    { key: 'social', label: 'Social', score: pct(avg(profiles.map((p) => avg([p.agreeableness, p.extraversion])))) },
    { key: 'leadership', label: 'Leadership', score: pct(avg(profiles.map((p) => avg([p.extraversion, p.conscientiousness])))) },
    { key: 'creativity', label: 'Creativity', score: pct(avg(profiles.map((p) => p.openness))) },
    { key: 'discipline', label: 'Discipline', score: pct(avg(profiles.map((p) => p.conscientiousness))) },
    { key: 'communication', label: 'Communication', score: pct(avg(profiles.map((p) => avg([p.extraversion, p.agreeableness])))) },
  ];

  const links = distribution.map((item) => {
    const rows = studentRows.filter((row) => row.personality_type === item.label);
    return {
      personality: item.label,
      topMajor: topCount(rows, (row) => row.top_major_key || normalizeMajorKey(row.top_major), (row) => row.top_major, 1)[0]?.label || EMPTY_LABEL,
      studentsCount: rows.length,
    };
  });

  return { distribution, traits, links };
}

function buildLearningPotentialAnalytics(dataset, studentRows) {
  const high = studentRows.filter((row) => row.learning_potential_key === 'high');
  const medium = studentRows.filter((row) => row.learning_potential_key === 'medium');
  const support = studentRows.filter((row) => row.learning_potential_key === 'support');
  return {
    average: pct(avg(studentRows.map((row) => row.learning_potential_score))),
    distribution: [
      { key: 'high', label: 'إمكانات عالية', count: high.length, color: '#16A34A' },
      { key: 'medium', label: 'إمكانات متوسطة', count: medium.length, color: '#2563EB' },
      { key: 'support', label: 'يحتاج متابعة', count: support.length, color: '#D97706' },
    ],
    highPotentialStudents: high.slice().sort((a, b) => b.learning_potential_score - a.learning_potential_score).slice(0, 8),
    followUpStudents: support.slice().sort((a, b) => a.average_score - b.average_score).slice(0, 8),
    table: studentRows
      .slice()
      .sort((a, b) => b.learning_potential_score - a.learning_potential_score)
      .map((row) => ({
        id: row.id,
        name: row.full_name,
        grade: row.grade,
        classSection: row.class_section,
        averageScore: row.average_score,
        learningPotential: row.learning_potential_score,
        level: row.learning_potential_level,
        recommendation: row.top_major,
      })),
  };
}

function buildGameAnalytics(dataset, studentRows) {
  const completedGameSessions = dataset.gameSessions.filter((row) => row.status === 'completed');
  const skills = topCount(
    dataset.gameSkills.map((row) => ({ ...row, score: row.signal_strength })),
    (row) => row.skill_tag,
    (row) => row.skill_tag,
    10
  );
  const interests = topCount(
    dataset.gameInterests.map((row) => ({ ...row, score: row.interest_signal })),
    (row) => row.related_subject,
    (row) => row.related_subject,
    10
  );
  const careers = topCount(
    dataset.careerSignals.map((row) => ({ ...row, score: careerMatchScore(row) })),
    (row) => row.degree_code,
    (row) => degreeName(row),
    10
  );

  const supportDistribution = topCount(
    studentRows,
    (row) => row.game_support_level,
    (row) => row.game_support_level,
    3
  );

  return {
    completedGameSessions: completedGameSessions.length,
    strongestSkills: skills,
    strongestInterests: interests,
    careerSignals: careers,
    supportDistribution,
    comparisonRows: studentRows.map((row) => ({
      id: row.id,
      name: row.full_name,
      testRecommendation: row.top_major,
      gameSupport: row.game_support_level,
      averageScore: row.average_score,
      completedGames: row.completed_games,
    })),
  };
}

function buildCareerAnalytics(studentRows) {
  const rowsForCareer = studentRows
    .filter((row) => row.top_major && row.top_major !== EMPTY_LABEL)
    .map((row) => ({ ...row, score: row.top_major_score }));
  const topCareers = topCount(rowsForCareer, (row) => row.top_major_key || normalizeMajorKey(row.top_major), (row) => row.top_major, 10);

  return {
    topCareers,
    byGrade: distributionBy(studentRows, (row) => row.grade || '-', (key) => `صف ${key}`),
    bySection: distributionBy(studentRows, (row) => normalizeClassSection(row.class_section), (key) => key),
    studentTopCareers: studentRows.map((row) => ({
      id: row.id,
      name: row.full_name,
      grade: row.grade,
      classSection: row.class_section,
      topMajor: row.top_major,
      score: row.top_major_score,
      personality: row.personality_type,
      gameSupport: row.game_support_level,
    })),
  };
}

function buildReports(analytics) {
  return [
    { key: 'school', title: 'تقرير ملخص المدرسة', description: `ملخص ${analytics.overview.totalStudents} طالب ومتوسط أداء ${analytics.overview.averagePerformance}%` },
    { key: 'class', title: 'تقرير الصفوف', description: 'مقارنة الصفوف والشعب حسب الأداء والإكمال والألعاب' },
    { key: 'student', title: 'تقرير طالب', description: 'تقرير طالب مفصل مع التوصيات والأسباب' },
    { key: 'career', title: 'تقرير اتجاهات التخصصات', description: `أكثر تخصص ظاهر: ${analytics.overview.topMajor}` },
    { key: 'personality', title: 'تقرير الشخصيات والاهتمامات', description: 'تحليل الشخصيات والاهتمامات وربطها بالتخصصات' },
    { key: 'games', title: 'تقرير إشارات الألعاب', description: 'كيف دعمت الألعاب التوصيات بدون أن تستبدل الاختبار' },
  ];
}

export async function getPrincipalAnalyticsSummary() {
  const dataset = await loadSchoolAnalyticsDataset();
  const studentRows = buildStudentCareerRows(dataset);
  const overview = buildOverview(dataset, studentRows);
  const analytics = {
    principal: dataset.principal,
    overview,
    students: studentRows,
    career: buildCareerAnalytics(studentRows),
    personality: buildPersonalityAnalytics(dataset, studentRows),
    abilities: buildAbilitiesAnalytics(dataset, studentRows),
    interests: buildInterestsAnalytics(dataset, studentRows),
    learningPotential: buildLearningPotentialAnalytics(dataset, studentRows),
    games: buildGameAnalytics(dataset, studentRows),
    classes: distributionBy(studentRows, (row) => `${row.grade || '-'}:${normalizeClassSection(row.class_section)}`, (key, items) => items[0]?.class_label || key),
    reports: [],
    schoolComparisonReady: {
      schoolId: dataset.principal.school_id,
      schoolName: dataset.principal.school_name,
      averagePerformance: overview.averagePerformance,
      completionRate: overview.completionRate,
      topMajor: overview.topMajor,
      completedGames: overview.completedGames,
    },
  };
  analytics.reports = buildReports(analytics);
  return analytics;
}

export async function getPrincipalEnhancedStudentRows() {
  const analytics = await getPrincipalAnalyticsSummary();
  return { principal: analytics.principal, rows: analytics.students, analytics };
}

export async function getPrincipalStudentAnalytics(studentId) {
  const analytics = await getPrincipalAnalyticsSummary();
  const student = analytics.students.find((row) => row.id === studentId);
  if (!student) throw new Error('لا يمكن عرض هذا الطالب أو أنه لا يتبع مدرسة المدير.');

  const raw = student.raw || {};
  const topDegreeRecommendations = raw.degreeRecommendations || [];
  const topSignals = (raw.careerSignals || []).slice().sort((a, b) => careerMatchScore(b) - careerMatchScore(a)).slice(0, 3);
  const topRecommendations = topDegreeRecommendations.length
    ? topDegreeRecommendations.slice(0, 3).map((degree) => ({
        id: degree.degree_id || degree.code,
        title: recommendationDegreeName(degree),
        overall: pct(degree.score_percent),
        reason: degree.game_signal_bonus
          ? 'هذه التوصية مبنية على الامتحان والشخصية والاهتمامات، والألعاب أضافت دعمًا بسيطًا فقط.'
          : 'هذه التوصية مبنية أساسًا على الامتحان والشخصية والاهتمامات.',
        breakdown: {
          abilities: pct((degree.breakdown?.ability?.score || 0) * 35),
          interests: pct((degree.breakdown?.interest?.score || 0) * 25),
          personality: pct((degree.breakdown?.personality?.score || 0) * 20),
          learningPotential: pct(student.learning_potential_score * 0.1),
          games: pct(Math.min(10, Math.abs(num(degree.game_signal_bonus, 0)))),
        },
      }))
    : topSignals.length
      ? topSignals.map((signal) => ({
          id: `${signal.student_id}-${signal.degree_code}`,
          title: degreeName(signal),
          overall: careerMatchScore(signal),
          reason: signal.topic_key
            ? `إشارة الألعاب من ${signal.topic_key} دعمت هذا المسار، مع بقاء الاختبار والقدرات المصدر الأساسي.`
            : 'هذا المسار مدعوم من بيانات الطالب الحالية.',
          breakdown: {
            abilities: pct(avg((raw.abilities || []).map((row) => row.ability_score)) * 0.35),
            interests: pct(avg((raw.interests || []).map((row) => row.interest_score)) * 0.25),
            personality: student.has_personality ? 20 : 0,
            learningPotential: pct(student.learning_potential_score * 0.1),
            games: pct(Math.min(10, careerMatchScore(signal) * 0.1)),
          },
        }))
    : [
        {
          id: 'fallback',
          title: student.top_major,
          overall: student.top_major_score,
          reason: 'التوصية مبنية على القدرات والاهتمامات المتاحة حاليًا، ولا توجد إشارات ألعاب كافية بعد.',
          breakdown: {
            abilities: pct(avg((raw.abilities || []).map((row) => row.ability_score)) * 0.35),
            interests: pct(avg((raw.interests || []).map((row) => row.interest_score)) * 0.25),
            personality: student.has_personality ? 20 : 0,
            learningPotential: pct(student.learning_potential_score * 0.1),
            games: 0,
          },
        },
      ];

  return { analytics, student, topRecommendations };
}

export default {
  getPrincipalAnalyticsSummary,
  getPrincipalEnhancedStudentRows,
  getPrincipalStudentAnalytics,
};
