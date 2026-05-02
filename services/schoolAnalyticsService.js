import { supabase } from '../config/supabase';
import { getStudentGameSessions } from '../features/games/shared/services/gameSessionService';
import { CLASS_SECTION_DEFAULT, buildClassLabel, normalizeClassSection } from '../utils/classSections';
import { getStudentJourneySnapshot } from './studentJourneyService';
import { getStudentSkillsProfile } from './skillsProfileService';

function safeNum(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function average(list = []) {
  if (!list.length) return 0;
  return list.reduce((sum, value) => sum + safeNum(value, 0), 0) / list.length;
}

async function getSchoolStudents(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, grade, class_section, school_name, user_id')
    .eq('school_id', schoolId);

  if (error) throw error;
  return data || [];
}

async function getLatestSessionsByStudent(studentIds = []) {
  if (!studentIds.length) return new Map();

  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_id, status, started_at, completed_at, total_time_seconds')
    .in('student_id', studentIds)
    .order('started_at', { ascending: false });

  if (error) throw error;

  const map = new Map();
  (data || []).forEach((session) => {
    if (!map.has(session.student_id)) {
      map.set(session.student_id, session);
    }
  });

  return map;
}

export async function getPrincipalStudentRows(schoolId, options = {}) {
  const language = options.language || 'ar';
  const students = await getSchoolStudents(schoolId);
  const studentIds = students.map((student) => student.id);
  const latestSessions = await getLatestSessionsByStudent(studentIds);

  const rows = await Promise.all(
    students.map(async (student) => {
      const latestSession = latestSessions.get(student.id) || null;
      const snapshot = await getStudentJourneySnapshot(student.id, { language });

      const topRecommendation = snapshot?.success ? snapshot.data?.topRecommendation : null;
      const strongestAbilities = snapshot?.success ? snapshot.data?.strongestAbilities || [] : [];
      const gameHighlights = snapshot?.success ? snapshot.data?.gameHighlights || [] : [];

      const completionScore = Math.min(
        100,
        (latestSession?.status === 'completed' ? 50 : latestSession?.status === 'in_progress' ? 20 : 0) +
          Math.min(strongestAbilities.length * 10, 30) +
          Math.min(gameHighlights.length * 10, 20)
      );

      return {
        ...student,
        latestSession,
        topRecommendation,
        strongestAbilities,
        gameHighlights,
        completionScore,
      };
    })
  );

  return rows.sort((left, right) => {
    const leftName = `${left.first_name || ''} ${left.last_name || ''}`.trim();
    const rightName = `${right.first_name || ''} ${right.last_name || ''}`.trim();
    return leftName.localeCompare(rightName);
  });
}

export async function getStudentAdministrativeReport(studentId, options = {}) {
  const language = options.language || 'ar';

  const [
    { data: student, error: studentError },
    journeySnapshot,
    skillsProfile,
    gameSessions,
  ] = await Promise.all([
    supabase
      .from('students')
      .select('id, student_id, first_name, last_name, grade, class_section, school_name, gender')
      .eq('id', studentId)
      .maybeSingle(),
    getStudentJourneySnapshot(studentId, { language }),
    getStudentSkillsProfile(studentId, { language }),
    getStudentGameSessions(studentId),
  ]);

  if (studentError) throw studentError;

  const latestSessionRes = await supabase
    .from('test_sessions')
    .select('id, status, started_at, completed_at, total_time_seconds')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    student,
    latestSession: latestSessionRes.data || null,
    journey: journeySnapshot?.success ? journeySnapshot.data : null,
    skills: skillsProfile?.success ? skillsProfile.data : null,
    gameSessions: (gameSessions || []).filter((session) => session.status === 'completed'),
  };
}

function filterStudentsByClass(students, options = {}) {
  return students.filter((student) => {
    if (options.grade && String(student.grade) !== String(options.grade)) return false;
    if (
      options.classSection &&
      normalizeClassSection(student.class_section) !== normalizeClassSection(options.classSection)
    ) {
      return false;
    }
    return true;
  });
}

export async function getSchoolClassesAnalytics(schoolId, options = {}) {
  const language = options.language || 'ar';
  const students = filterStudentsByClass(await getSchoolStudents(schoolId), options);
  const studentIds = students.map((student) => student.id);
  const latestSessions = await getLatestSessionsByStudent(studentIds);

  const classGroups = new Map();

  students.forEach((student) => {
    const grade = String(student.grade || 'Unknown');
    const classSection = normalizeClassSection(student.class_section || CLASS_SECTION_DEFAULT);
    const key = `${grade}:${classSection}`;

    if (!classGroups.has(key)) {
      classGroups.set(key, {
        grade,
        classSection,
        classLabel: buildClassLabel(grade, classSection, language),
        students: [],
        completionCount: 0,
      });
    }

    const entry = classGroups.get(key);
    entry.students.push(student);

    if (latestSessions.get(student.id)?.status === 'completed') {
      entry.completionCount += 1;
    }
  });

  const rows = await Promise.all(
    Array.from(classGroups.values()).map(async (gradeEntry) => {
      const strengthScores = [];
      const recommendationNames = [];

      for (const student of gradeEntry.students) {
        const snapshot = await getStudentJourneySnapshot(student.id, { language: 'ar' });
        if (snapshot?.success) {
          const topAbility = snapshot.data?.strongestAbilities?.[0];
          const topRecommendation = snapshot.data?.topRecommendation?.name;
          if (topAbility) strengthScores.push(topAbility.score);
          if (topRecommendation) recommendationNames.push(topRecommendation);
        }
      }

      const recommendationCount = recommendationNames.reduce((acc, name) => {
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const topRecommendation = Object.entries(recommendationCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      return {
        grade: gradeEntry.grade,
        classSection: gradeEntry.classSection,
        classLabel: gradeEntry.classLabel,
        studentsCount: gradeEntry.students.length,
        completionRate: Math.round((gradeEntry.completionCount / Math.max(gradeEntry.students.length, 1)) * 100),
        averageStrength: Math.round(average(strengthScores)),
        topRecommendation,
      };
    })
  );

  return rows.sort((left, right) => {
    const gradeDiff = safeNum(left.grade) - safeNum(right.grade);
    if (gradeDiff) return gradeDiff;
    return String(left.classSection).localeCompare(String(right.classSection));
  });
}

export async function getSchoolMajorsAnalytics(schoolId, options = {}) {
  const students = filterStudentsByClass(await getSchoolStudents(schoolId), options);
  const rows = [];

  for (const student of students) {
    const snapshot = await getStudentJourneySnapshot(student.id, { language: options.language || 'ar' });
    const topRecommendation = snapshot?.success ? snapshot.data?.topRecommendation : null;

    if (topRecommendation?.name) {
      rows.push({
        studentId: student.id,
        grade: student.grade,
        gender: student.gender,
        majorName: topRecommendation.name,
        scorePercent: topRecommendation.scorePercent,
      });
    }
  }

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.majorName]) {
      acc[row.majorName] = { majorName: row.majorName, studentsCount: 0, scores: [], grades: {} };
    }

    acc[row.majorName].studentsCount += 1;
    acc[row.majorName].scores.push(row.scorePercent);
    acc[row.majorName].grades[row.grade] = (acc[row.majorName].grades[row.grade] || 0) + 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      majorName: item.majorName,
      studentsCount: item.studentsCount,
      averageMatch: Math.round(average(item.scores)),
      topGrade: Object.entries(item.grades).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
    }))
    .sort((left, right) => right.studentsCount - left.studentsCount);
}

export async function getSchoolStrengthsWeaknesses(schoolId) {
  const students = await getSchoolStudents(schoolId);
  const studentIds = students.map((student) => student.id);

  if (!studentIds.length) {
    return { strengths: [], weaknesses: [] };
  }

  const [abilitiesRes, interestsRes] = await Promise.all([
    supabase
      .from('student_abilities')
      .select('ability_score, subject_id, subjects(name_ar, name_en, name_he)')
      .in('student_id', studentIds),
    supabase
      .from('student_interests')
      .select('interest_score, subject_id, subjects(name_ar, name_en, name_he)')
      .in('student_id', studentIds),
  ]);

  if (abilitiesRes.error) throw abilitiesRes.error;
  if (interestsRes.error) throw interestsRes.error;

  const subjectScores = new Map();

  (abilitiesRes.data || []).forEach((row) => {
    const key = row.subject_id;
    if (!subjectScores.has(key)) {
      subjectScores.set(key, {
        label: row.subjects?.name_ar || row.subjects?.name_en || row.subjects?.name_he || '—',
        abilityScores: [],
        interestScores: [],
      });
    }
    subjectScores.get(key).abilityScores.push(safeNum(row.ability_score, 0));
  });

  (interestsRes.data || []).forEach((row) => {
    const key = row.subject_id;
    if (!subjectScores.has(key)) {
      subjectScores.set(key, {
        label: row.subjects?.name_ar || row.subjects?.name_en || row.subjects?.name_he || '—',
        abilityScores: [],
        interestScores: [],
      });
    }
    subjectScores.get(key).interestScores.push(safeNum(row.interest_score, 0));
  });

  const rows = Array.from(subjectScores.values()).map((item) => ({
    label: item.label,
    abilityAverage: Math.round(average(item.abilityScores)),
    interestAverage: Math.round(average(item.interestScores)),
  }));

  const sorted = rows.slice().sort((left, right) => right.abilityAverage - left.abilityAverage);

  return {
    strengths: sorted.slice(0, 4),
    weaknesses: sorted.slice(-4).reverse(),
  };
}

export async function getSchoolAssessmentsTracking(schoolId) {
  const students = await getSchoolStudents(schoolId);
  if (!students.length) return [];
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_id, status, started_at, completed_at, total_time_seconds')
    .in('student_id', students.map((student) => student.id))
    .order('started_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((session) => ({
    ...session,
    student: studentMap.get(session.student_id) || null,
  }));
}

export async function getSchoolGamesAnalytics(schoolId) {
  const students = await getSchoolStudents(schoolId);
  const stats = {};

  for (const student of students) {
    const sessions = await getStudentGameSessions(student.id);
    sessions
      .filter((session) => session.status === 'completed')
      .forEach((session) => {
        if (!stats[session.game_id]) {
          stats[session.game_id] = {
            gameId: session.game_id,
            plays: 0,
            scores: [],
            engagement: [],
          };
        }

        stats[session.game_id].plays += 1;
        stats[session.game_id].scores.push(
          average([
            session.interest_signal,
            session.engagement_score,
            session.trust_score,
            session.hebrew_score,
            session.medical_reasoning_score,
          ])
        );
        stats[session.game_id].engagement.push(session.engagement_score);
      });
  }

  return Object.values(stats).map((item) => ({
    gameId: item.gameId,
    plays: item.plays,
    averageScore: Math.round(average(item.scores)),
    averageEngagement: Math.round(average(item.engagement)),
  }));
}
