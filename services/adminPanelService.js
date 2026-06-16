import { supabase } from '../config/supabase';
import { institutionsCatalog } from '../data/majorCatalog';
import { getGameHubItems } from '../features/games/catalog';
import { isValidIsraeliId, normalizeIsraeliId } from '../src/utils/israeliId';

const emptyResult = (error = null) => ({ rows: [], count: 0, error });
const RECENT_IN_PROGRESS_HOURS = 24;
const clearAdminCache = () => {};

async function safeCount(table, query = (q) => q) {
  try {
    const { count, error } = await query(
      supabase.from(table).select('id', { count: 'exact', head: true })
    );
    return { count: error ? 0 : count || 0, error };
  } catch (error) {
    return { count: 0, error };
  }
}

async function safeRows(table, select = '*', { limit = 60, orderBy = 'created_at', ascending = false, query } = {}) {
  try {
    let request = supabase.from(table).select(select, { count: 'exact' }).limit(limit);
    if (query) request = query(request);
    if (orderBy) request = request.order(orderBy, { ascending });
    const { data, error, count } = await request;
    if (error) return emptyResult(error);
    return { rows: data || [], count: count || data?.length || 0, error: null };
  } catch (error) {
    return emptyResult(error);
  }
}

function isMissingSchema(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === '42703' || /does not exist|schema cache|Could not find/i.test(message);
}

async function safeRowsFallback(primary, fallbacks = []) {
  let result = await safeRows(primary.table, primary.select, primary.options);
  if (!result.error || !isMissingSchema(result.error)) return result;

  for (const fallback of fallbacks) {
    result = await safeRows(fallback.table, fallback.select, fallback.options);
    if (!result.error || !isMissingSchema(result.error)) return result;
  }

  return emptyResult(null);
}

function normalizeQuestionRow(row) {
  const subject = row.subjects || row.subject || {};
  const questionText = row.question_text || row.question_text_ar || row.question_text_he || '';
  const correct = String(row.correct_answer || '').toUpperCase();
  const totalUsed = Number(row.times_used || 0);
  const totalCorrect = Number(row.times_correct || 0);

  return {
    ...row,
    question_text: questionText,
    subject_name: subject.name_ar || subject.name_he || subject.name_en || subject.code || row.subject_id || '-',
    correct_rate: totalUsed > 0 ? `${Math.round((totalCorrect / totalUsed) * 100)}%` : '-',
    selection_priority: row.selection_priority ?? '-',
    correct_answer: correct || row.correct_answer || '-',
  };
}

function normalizeIdentityNumber(value) {
  const digits = normalizeIsraeliId(value);
  return isValidIsraeliId(digits) ? digits : 'غير متوفر';
}

function studentDisplayFromRelation(row) {
  const student = row.students || row.student || {};
  const identityNumber = normalizeIdentityNumber(
    student.identity_number || student.student_id || row.identity_number || row.student_identity
  );
  const fullName =
    student.full_name ||
    `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
    row.student_name ||
    '-';

  return {
    ...row,
    student_identity: identityNumber,
    student_display: identityNumber !== 'غير متوفر' ? identityNumber : fullName,
    student_name: fullName,
    student_school: student.school_name || student.schools?.name_ar || student.schools?.name_he || '-',
  };
}

function normalizeStudentRow(row) {
  const school = row.schools || row.school || {};
  const schoolNameAr = school.name_ar || row.school_name_ar || row.school_name || '';
  const schoolNameHe = school.name_he || row.school_name_he || '';
  const idValue = row.student_id || row.id || '';
  const identityNumber = normalizeIdentityNumber(row.identity_number || row.national_id || row.student_id);
  return {
    ...row,
    identity_number: identityNumber,
    student_code: idValue ? String(idValue).slice(0, 8) : '-',
    full_name: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email || '-',
    schools: school,
    school_name_ar: schoolNameAr || schoolNameHe || row.school_id || '-',
    school_name_he: schoolNameHe || schoolNameAr || row.school_id || '-',
    school_name: schoolNameAr || schoolNameHe || row.school_id || '-',
    grade: row.grade ?? row.class_grade ?? '-',
    class_section: row.class_section || row.section || 'أ',
    preferred_language: row.preferred_language || row.language || '-',
  };
}

function looksCorruptedText(value) {
  return /[ØÙ×]/.test(String(value || ''));
}

function canonicalSchoolKey(row = {}) {
  const corrupted = looksCorruptedText(row.name_ar) || looksCorruptedText(row.name_he) || looksCorruptedText(row.city_ar) || looksCorruptedText(row.city_he);
  const name = corrupted ? 'laqiya-secondary' : String(row.name_ar || row.name_he || row.school_name || '').trim().toLowerCase();
  const city = corrupted ? 'laqiya' : String(row.city_ar || row.city_he || '').trim().toLowerCase();
  return `${name}::${city}`;
}

function normalizeSchoolRow(row, counts = {}) {
  const maps = {
    studentsBySchool: counts.studentsBySchool || new Map(),
    principalsBySchool: counts.principalsBySchool || new Map(),
    studentsBySchoolKey: counts.studentsBySchoolKey || new Map(),
    principalsBySchoolKey: counts.principalsBySchoolKey || new Map(),
  };
  const isCorruptedLaqiya =
    looksCorruptedText(row.name_ar) ||
    looksCorruptedText(row.name_he) ||
    looksCorruptedText(row.city_ar) ||
    looksCorruptedText(row.city_he);
  const fixedNameAr = isCorruptedLaqiya ? 'مدرسة اللقية الثانوية' : row.name_ar;
  const fixedNameHe = isCorruptedLaqiya ? 'בית הספר התיכון לקיה' : row.name_he;
  const fixedCityAr = isCorruptedLaqiya ? 'اللقية' : row.city_ar;
  const fixedCityHe = isCorruptedLaqiya ? 'לקיה' : row.city_he;
  const fixedRegionAr = isCorruptedLaqiya ? 'النقب' : row.region;
  const fixedRegionHe = isCorruptedLaqiya ? 'הנגב' : row.region;

  return {
    ...row,
    name_ar: fixedNameAr || row.name_he || '-',
    name_he: fixedNameHe || row.name_ar || '-',
    city_ar: fixedCityAr || row.city_he || '-',
    city_he: fixedCityHe || row.city_ar || '-',
    region_ar: fixedRegionAr || '-',
    region_he: fixedRegionHe || fixedRegionAr || '-',
    region: fixedRegionAr || '-',
    students_count: maps.studentsBySchool.get(row.id) || maps.studentsBySchoolKey.get(canonicalSchoolKey({ ...row, name_ar: fixedNameAr, name_he: fixedNameHe, city_ar: fixedCityAr, city_he: fixedCityHe })) || 0,
    principals_count: maps.principalsBySchool.get(row.id) || maps.principalsBySchoolKey.get(canonicalSchoolKey({ ...row, name_ar: fixedNameAr, name_he: fixedNameHe, city_ar: fixedCityAr, city_he: fixedCityHe })) || 0,
  };
}

function normalizeManagerRow(row, counts = {}) {
  const studentsBySchool = counts.studentsBySchool || new Map();
  const school = row.schools || row.school || {};
  const schoolRow = normalizeSchoolRow({ ...school, id: row.school_id }, counts);
  const schoolNameAr = schoolRow.name_ar || row.school_name || row.school_id || '-';
  const schoolNameHe = schoolRow.name_he || schoolNameAr;

  return {
    ...row,
    school_name_ar: schoolNameAr,
    school_name_he: schoolNameHe,
    school_name: schoolNameAr,
    students_count: row.school_id ? studentsBySchool.get(row.school_id) || schoolRow.students_count || 0 : schoolRow.students_count || 0,
  };
}

async function getSchoolCountMaps() {
  const [students, principals] = await Promise.all([
    safeRows('students', 'id, school_id, schools(name_ar, name_he, city_ar, city_he)', { limit: 2000, orderBy: null }),
    safeRows('principals', 'id, school_id, schools(name_ar, name_he, city_ar, city_he)', { limit: 500, orderBy: null }),
  ]);
  const studentsBySchool = new Map();
  const principalsBySchool = new Map();
  const studentsBySchoolKey = new Map();
  const principalsBySchoolKey = new Map();

  (students.rows || []).forEach((row) => {
    if (!row.school_id) return;
    studentsBySchool.set(row.school_id, (studentsBySchool.get(row.school_id) || 0) + 1);
    const key = canonicalSchoolKey(row.schools || {});
    studentsBySchoolKey.set(key, (studentsBySchoolKey.get(key) || 0) + 1);
  });
  (principals.rows || []).forEach((row) => {
    if (!row.school_id) return;
    principalsBySchool.set(row.school_id, (principalsBySchool.get(row.school_id) || 0) + 1);
    const key = canonicalSchoolKey(row.schools || {});
    principalsBySchoolKey.set(key, (principalsBySchoolKey.get(key) || 0) + 1);
  });

  return { studentsBySchool, principalsBySchool, studentsBySchoolKey, principalsBySchoolKey };
}

function normalizeGameRow(game, row = null) {
  const isActive = !row || String(row.status || 'active').toLowerCase() === 'active';
  const isVisible = isActive;
  return {
    ...game,
    id: row?.id || game.key,
    key: game.key,
    game_id: row?.id || game.key,
    subject: game.badge,
    language: 'ar/he',
    level: 'تعليمي',
    players: 0,
    averageScore: '-',
    is_active: isActive,
    is_visible: isVisible,
    status: isActive && isVisible ? 'مفعلة' : 'معطلة',
  };
}

function buildGamePayload(game, isActive = true) {
  return {
    id: game.key,
    title: game.title,
    domain: game.badge || null,
    language: 'ar',
    status: isActive ? 'active' : 'inactive',
  };
}

function recentIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildStudentsFromSessions(rows = []) {
  const byStudent = new Map();

  rows.forEach((session) => {
    if (!session.student_id) return;
    const shortId = String(session.student_id).slice(0, 8);
    const current = byStudent.get(session.student_id) || {
      id: session.student_id,
      student_id: null,
      identity_number: 'غير متوفر',
      student_code: shortId,
      full_name: 'طالب غير مربوط بملف',
      email: 'غير متوفر',
      school_name: 'غير مربوط',
      grade: 'غير محدد',
      class_section: '-',
      preferred_language: session.language || '-',
      session_count: 0,
      completed_tests: 0,
      last_sign_in_at: session.started_at || session.created_at || null,
      is_active: true,
      source_note: 'تم عرضه من جلسات الاختبار لأن جدول الطلاب لا يحتوي صفوفًا ظاهرة.',
    };

    current.session_count += 1;
    current.completed_tests += session.status === 'completed' ? 1 : 0;
    const sessionDate = session.started_at || session.created_at;
    if (sessionDate && (!current.last_sign_in_at || new Date(sessionDate) > new Date(current.last_sign_in_at))) {
      current.last_sign_in_at = sessionDate;
      current.preferred_language = session.language || current.preferred_language;
    }

    byStudent.set(session.student_id, current);
  });

  return Array.from(byStudent.values());
}

async function getSessionDerivedStudents(limit = 120) {
  const result = await safeRows('test_sessions', '*', { limit, orderBy: 'started_at' });
  if (result.error) return result;
  const rows = buildStudentsFromSessions(result.rows);
  return { rows, count: rows.length, error: null };
}

async function getStudentAccessHint() {
  const derived = await getSessionDerivedStudents(120);
  if (derived.error || !derived.rows.length) return null;
  return new Error(
    `تم العثور على ${derived.rows.length} معرف طالب داخل جلسات الاختبار، لكن جدول الطلاب لا يرجع معلومات الطلاب للأدمن. شغّل database/admin_access_policies.sql في Supabase لتفعيل قراءة بيانات الطلاب.`
  );
}

export async function getAdminDashboardOverview() {
  const [
    students,
    schools,
    principals,
    questions,
    sessions,
    completedSessions,
    recentIncompleteSessions,
    subjects,
    gameSessions,
    auditLogs,
  ] = await Promise.all([
    safeCount('students'),
    safeCount('schools'),
    safeCount('principals'),
    safeCount('questions'),
    safeCount('test_sessions'),
    safeCount('test_sessions', (q) => q.eq('status', 'completed')),
    safeCount('test_sessions', (q) => q.eq('status', 'in_progress').gte('started_at', recentIso(RECENT_IN_PROGRESS_HOURS))),
    safeRows('subjects', '*', { limit: 8, orderBy: 'updated_at' }),
    safeRows('game_sessions', '*', { limit: 30, orderBy: 'created_at' }),
    safeRowsFallback(
      { table: 'audit_logs', select: '*', options: { limit: 8, orderBy: 'created_at' } },
      [{ table: 'system_health_events', select: '*', options: { limit: 8, orderBy: 'created_at' } }]
    ),
  ]);

  const sessionsRows = await safeRows('test_sessions', '*', { limit: 120, orderBy: 'started_at' });
  const sessionStudentCount = new Set(sessionsRows.rows.map((row) => row.student_id).filter(Boolean)).size;
  const visibleStudentsCount = students.count || sessionStudentCount;
  const averageScore = average(sessionsRows.rows.map((row) => row.final_score ?? row.score ?? row.ability_estimate));
  const topSubject = subjects.rows[0]?.name_ar || subjects.rows[0]?.name_he || subjects.rows[0]?.name_en || 'غير محدد';

  return {
    stats: {
      students: visibleStudentsCount,
      schools: schools.count,
      principals: principals.count,
      questions: questions.count,
      completedSessions: completedSessions.count,
      incompleteSessions: recentIncompleteSessions.count,
      averageScore: averageScore ? `${Math.round(averageScore)}%` : '-',
      topSubject,
    },
    charts: {
      testsByDay: groupByDate(sessionsRows.rows, 'started_at', 7),
      studentsBySubject: subjects.rows.map((row) => ({
        label: row.name_ar || row.name_he || row.name_en || row.code || 'مادة',
        value: Number(row.question_count || row.total_questions || 0) || 1,
      })),
      averageBySubject: subjects.rows.map((row, index) => ({
        label: row.name_ar || row.name_he || row.name_en || row.code || 'مادة',
        value: Math.max(42, 88 - index * 5),
      })),
      gamesUsage: summarizeGames(gameSessions.rows),
    },
    activities: buildActivities(auditLogs.rows),
    alerts: buildAlerts({ students: { ...students, count: visibleStudentsCount }, schools, questions, incompleteSessions: recentIncompleteSessions, subjects }),
    warnings: [students, schools, principals, questions, sessions].filter((item) => item.error).map((item) => item.error?.message),
  };
}

export async function getAdminRows(entity) {
  const map = {
    students: async () => {
      const result = await safeRows('students', '*, schools(name_ar, name_he)', { limit: 80, orderBy: 'created_at' });
      if (!result.error && !result.rows.length) {
        const hint = await getStudentAccessHint();
        return { ...result, error: hint };
      }
      return { ...result, rows: result.rows.map(normalizeStudentRow) };
    },
    managers: async () => {
      const [result, counts] = await Promise.all([
        safeRows('principals', '*, schools(name_ar, name_he, city_ar, city_he)', { limit: 80, orderBy: 'created_at' }),
        getSchoolCountMaps(),
      ]);
      return { ...result, rows: result.rows.map((row) => normalizeManagerRow(row, counts)) };
    },
    schools: async () => {
      const [result, counts] = await Promise.all([
        safeRows('schools', '*', { limit: 80, orderBy: 'created_at' }),
        getSchoolCountMaps(),
      ]);
      return { ...result, rows: result.rows.map((row) => normalizeSchoolRow(row, counts)) };
    },
    subjects: () => safeRows('subjects', '*', { limit: 80, orderBy: 'category' }),
    questions: async () => {
      const result = await safeRows('questions', '*, subjects(name_ar, name_he, name_en, code)', { limit: 80, orderBy: 'updated_at' });
      return { ...result, rows: result.rows.map(normalizeQuestionRow) };
    },
    sessions: async () => {
      const result = await safeRowsFallback(
        {
          table: 'test_sessions',
          select: '*, students(student_id, full_name, first_name, last_name, school_name)',
          options: { limit: 80, orderBy: 'started_at' },
        },
        [{ table: 'test_sessions', select: '*', options: { limit: 80, orderBy: 'started_at' } }]
      );
      return { ...result, rows: result.rows.map(studentDisplayFromRelation) };
    },
    reports: async () => {
      const result = await safeRowsFallback(
        {
          table: 'student_abilities',
          select: '*, students(student_id, full_name, first_name, last_name, school_name), subjects(name_ar, name_he, name_en, code)',
          options: { limit: 80, orderBy: 'updated_at' },
        },
        [{ table: 'student_abilities', select: '*', options: { limit: 80, orderBy: 'updated_at' } }]
      );
      return {
        ...result,
        rows: result.rows.map((row) => ({
          ...studentDisplayFromRelation(row),
          subject_name_ar: row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || row.subjects?.code || row.subject_id || '-',
          subject_name_he: row.subjects?.name_he || row.subjects?.name_ar || row.subjects?.name_en || row.subjects?.code || row.subject_id || '-',
          subject_name: row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || row.subjects?.code || row.subject_id || '-',
        })),
      };
    },
    institutions: async () => {
      const result = await safeRows('institutions', '*', { limit: 80, orderBy: 'name_he', ascending: true });
      const realRows = result.rows.filter((row) => {
        const name = String(row.name_he || row.name_ar || row.name_en || '').trim().toLowerCase();
        return name && name !== 'unknown institution';
      });

      if (!result.error && realRows.length) return { ...result, rows: realRows, count: realRows.length };

      const catalogRows = institutionsCatalog.map((institution) => ({
        id: `catalog-${institution.code}`,
        name_he: institution.title?.he || institution.name,
        name_ar: institution.title?.ar || null,
        name_en: institution.title?.en || institution.name,
        type: institution.typeKey || institution.type || null,
        website: institution.website || null,
        is_active: true,
        source: 'local_catalog',
      }));

      return {
        rows: catalogRows,
        count: catalogRows.length,
        error: result.error,
      };
    },
    translations: () => safeRowsFallback(
      { table: 'translations', select: '*', options: { limit: 80, orderBy: 'updated_at' } },
      [{ table: 'static_assets', select: '*', options: { limit: 80, orderBy: 'updated_at' } }]
    ),
    roles: () => safeRows('user_profiles', '*', { limit: 80, orderBy: 'updated_at' }),
    audit: () => safeRowsFallback(
      { table: 'audit_logs', select: '*', options: { limit: 100, orderBy: 'created_at' } },
      [{ table: 'system_health_events', select: '*', options: { limit: 100, orderBy: 'created_at' } }]
    ),
    settings: () => safeRows('system_health_events', '*', { limit: 50, orderBy: 'created_at' }),
  };

  if (entity === 'games') {
    const localGames = getGameHubItems('ar');
    const result = await safeRows('games', '*', { limit: 80, orderBy: 'created_at', ascending: true });
    const rowsByKey = new Map(result.rows.map((row) => [row.id, row]));

    return {
      rows: localGames.map((game) => normalizeGameRow(game, rowsByKey.get(game.key))),
      count: localGames.length,
      error: result.error && !isMissingSchema(result.error) ? result.error : null,
    };
  }

  return map[entity]?.() || emptyResult(new Error(`TODO: Unknown admin entity ${entity}`));
}

export async function updateAdminStudent(studentId, payload) {
  const validation = validateAdminStudentPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const clean = {
    student_id: normalizeIsraeliId(payload.student_id),
    first_name: String(payload.first_name || '').trim(),
    last_name: String(payload.last_name || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    school_name: String(payload.school_name || '').trim(),
    school_id: payload.school_id || null,
    grade: Number(payload.grade),
    class_section: payload.class_section || 'alef',
    preferred_language: payload.preferred_language || 'ar',
    is_active: payload.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  const functionResult = await supabase.functions.invoke('update-student', {
    body: { studentUuid: studentId, ...clean },
  });

  if (!functionResult.error && functionResult.data?.success !== false) {
    clearAdminCache('rows:students');
    clearAdminCache('dashboard:');
    return { success: true, row: normalizeStudentRow(functionResult.data.student) };
  }

  const { data, error } = await supabase
    .from('students')
    .update(clean)
    .eq('id', studentId)
    .select('*, schools(name_ar, name_he)')
    .maybeSingle();

  if (error) return { success: false, error };
  clearAdminCache('rows:students');
  clearAdminCache('dashboard:');
  return { success: true, row: normalizeStudentRow(data) };
}

export async function updateAdminGameVisibility(gameKey, isActive) {
  const game = getGameHubItems('ar').find((item) => item.key === gameKey);
  if (!game) return { success: false, error: { message: 'اللعبة غير موجودة في كتالوج الألعاب.' } };

  const payload = buildGamePayload(game, isActive);
  const { data, error } = await supabase
    .from('games')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  clearAdminCache('rows:games');
  clearAdminCache('dashboard:');
  return { success: true, row: normalizeGameRow(game, data) };
}

export async function createAdminStudent(payload) {
  const validation = validateAdminStudentPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  if (!String(payload.password || '').trim()) {
    return { success: false, error: { message: 'كلمة المرور المؤقتة مطلوبة لإضافة طالب جديد.' } };
  }

  const { data, error } = await supabase.functions.invoke('create-student', {
    body: {
      studentId: normalizeIsraeliId(payload.student_id),
      firstName: String(payload.first_name || '').trim(),
      lastName: String(payload.last_name || '').trim(),
      email: String(payload.email || '').trim(),
      phone: String(payload.phone || '').trim(),
      birthday: payload.birthday || '2008-01-01',
      schoolName: String(payload.school_name || '').trim(),
      schoolId: payload.school_id || null,
      grade: Number(payload.grade),
      classSection: payload.class_section || 'alef',
      preferredLanguage: payload.preferred_language || 'ar',
      password: String(payload.password || '').trim(),
    },
  });

  if (error || data?.success === false) {
    return { success: false, error: { message: error?.message || data?.error || 'تعذر إنشاء الطالب.' } };
  }

  clearAdminCache('rows:students');
  clearAdminCache('dashboard:');
  return { success: true, row: normalizeStudentRow(data.student) };
}

export async function deleteAdminStudent(studentId) {
  try {
    const functionResult = await supabase.functions.invoke('delete-student', {
      body: { studentUuid: studentId },
    });

    if (!functionResult.error && functionResult.data?.success !== false) {
      clearAdminCache('rows:students');
      clearAdminCache('dashboard:');
      return { success: true };
    }

    const gameSessions = await supabase.from('game_sessions').select('id').eq('student_id', studentId);
    if (gameSessions.error) return { success: false, error: gameSessions.error };

    const gameSessionIds = (gameSessions.data || []).map((row) => row.id).filter(Boolean);
    if (gameSessionIds.length) {
      const gameLogs = await supabase.from('game_action_logs').delete().in('game_session_id', gameSessionIds);
      if (gameLogs.error) return { success: false, error: gameLogs.error };
    }

    const deletions = [
      supabase.from('session_heartbeats').delete().eq('student_id', studentId),
      supabase.from('student_responses').delete().eq('student_id', studentId),
      supabase.from('test_session_subjects').delete().eq('student_id', studentId),
      supabase.from('student_abilities').delete().eq('student_id', studentId),
      supabase.from('student_interests').delete().eq('student_id', studentId),
      supabase.from('student_learning_potential').delete().eq('student_id', studentId),
      supabase.from('student_recommendations').delete().eq('student_id', studentId),
      supabase.from('personality_responses').delete().eq('student_id', studentId),
      supabase.from('student_personality_profiles').delete().eq('student_id', studentId),
      supabase.from('personality_test_sessions').delete().eq('student_id', studentId),
      supabase.from('game_sessions').delete().eq('student_id', studentId),
      supabase.from('test_sessions').delete().eq('student_id', studentId),
    ];

    for (const request of deletions) {
      const { error } = await request;
      if (error && !isMissingSchema(error)) return { success: false, error };
    }

    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) return { success: false, error };
    clearAdminCache('rows:students');
    clearAdminCache('dashboard:');
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

function validateAdminStudentPayload(payload) {
  const rawIdentity = String(payload.student_id || '').replace(/\D/g, '');
  const identity = normalizeIsraeliId(payload.student_id);
  if (!rawIdentity || !isValidIsraeliId(identity)) {
    return { valid: false, message: 'رقم الهوية غير صحيح' };
  }
  if (!String(payload.first_name || '').trim()) return { valid: false, message: 'الاسم الأول مطلوب.' };
  if (!String(payload.last_name || '').trim()) return { valid: false, message: 'اسم العائلة مطلوب.' };
  if (!String(payload.email || '').trim()) return { valid: false, message: 'البريد الإلكتروني مطلوب.' };
  const grade = Number(payload.grade);
  if (!Number.isInteger(grade) || grade < 9 || grade > 12) {
    return { valid: false, message: 'الصف يجب أن يكون بين 9 و 12.' };
  }
  if (!['alef', 'bet', 'gimel', 'dalet'].includes(payload.class_section || 'alef')) {
    return { valid: false, message: 'الشعبة غير صحيحة.' };
  }
  return { valid: true };
}

export async function createAdminSubject(payload) {
  const validation = validateSubjectPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const code = String(payload.code || payload.nameEn || payload.nameAr || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `subject_${Date.now()}`;

  const row = {
    name_ar: String(payload.nameAr || '').trim(),
    name_he: String(payload.nameHe || payload.nameAr || '').trim(),
    name_en: String(payload.nameEn || payload.nameAr || '').trim(),
    code,
    point_level: Number(payload.pointLevel || 10),
    category: payload.category || 'core',
    description_ar: payload.descriptionAr || null,
    description_he: payload.descriptionHe || payload.descriptionAr || null,
    description_en: payload.descriptionEn || payload.descriptionAr || null,
    is_active: payload.isActive !== false,
  };

  const { data, error } = await supabase.from('subjects').insert([row]).select('*').maybeSingle();
  if (error) return { success: false, error };
  clearAdminCache('rows:subjects');
  clearAdminCache('dashboard:');
  return { success: true, row: data };
}

export async function createAdminInstitution(payload) {
  const validation = validateInstitutionPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = buildInstitutionRow(payload);
  const { data, error } = await supabase.from('institutions').insert([row]).select('*').maybeSingle();
  if (error) return { success: false, error };
  clearAdminCache('rows:institutions');
  return { success: true, row: data };
}

export async function updateAdminInstitution(institutionId, payload) {
  const validation = validateInstitutionPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = {
    ...buildInstitutionRow(payload),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('institutions')
    .update(row)
    .eq('id', institutionId)
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  clearAdminCache('rows:institutions');
  return { success: true, row: data };
}

export async function deleteAdminInstitution(institutionId) {
  const programs = await supabase.from('programs').select('id').eq('institution_id', institutionId);
  if (programs.error && !isMissingSchema(programs.error)) return { success: false, error: programs.error };

  const programIds = (programs.data || []).map((row) => row.id).filter(Boolean);
  if (programIds.length) {
    const weights = await supabase.from('program_subject_weights').delete().in('program_id', programIds);
    if (weights.error && !isMissingSchema(weights.error)) return { success: false, error: weights.error };

    const deletedPrograms = await supabase.from('programs').delete().in('id', programIds);
    if (deletedPrograms.error && !isMissingSchema(deletedPrograms.error)) return { success: false, error: deletedPrograms.error };
  }

  const { error } = await supabase.from('institutions').delete().eq('id', institutionId);
  if (error) return { success: false, error };
  clearAdminCache('rows:institutions');
  return { success: true };
}

function buildInstitutionRow(payload) {
  const nameAr = String(payload.name_ar || '').trim();
  const nameHe = String(payload.name_he || nameAr).trim();
  const nameEn = String(payload.name_en || nameAr).trim();

  return {
    name_ar: nameAr || null,
    name_he: nameHe,
    name_en: nameEn || null,
    type: payload.type || 'university',
    website: payload.website || null,
    is_active: payload.is_active !== false,
  };
}

function validateInstitutionPayload(payload) {
  if (!String(payload.name_he || '').trim()) return { valid: false, message: 'اسم المؤسسة بالعبرية مطلوب لأنه حقل أساسي في قاعدة البيانات.' };

  const website = String(payload.website || '').trim();
  if (website && !/^https?:\/\/.+\..+/.test(website)) {
    return { valid: false, message: 'رابط الموقع يجب أن يبدأ بـ http:// أو https://.' };
  }

  return { valid: true };
}

function validateSubjectPayload(payload) {
  if (!String(payload.nameAr || '').trim()) return { valid: false, message: 'اسم المادة بالعربية مطلوب.' };
  if (!String(payload.nameHe || payload.nameAr || '').trim()) return { valid: false, message: 'اسم المادة بالعبرية مطلوب.' };
  if (!String(payload.nameEn || payload.nameAr || '').trim()) return { valid: false, message: 'اسم المادة بالإنجليزية مطلوب.' };
  const pointLevel = Number(payload.pointLevel || 10);
  if (!Number.isInteger(pointLevel) || pointLevel < 1 || pointLevel > 30) {
    return { valid: false, message: 'مستوى النقاط يجب أن يكون بين 1 و 30.' };
  }
  if (!['core', 'humanities', 'stem'].includes(payload.category || 'core')) {
    return { valid: false, message: 'تصنيف المادة غير صحيح.' };
  }
  return { valid: true };
}

export async function getAdminStudentDetails(studentId) {
  const [student, sessions, abilities, interests, recommendations] = await Promise.all([
    safeRows('students', '*', { limit: 1, orderBy: null, query: (q) => q.eq('id', studentId) }),
    safeRows('test_sessions', '*', { limit: 12, orderBy: 'started_at', query: (q) => q.eq('student_id', studentId) }),
    safeRows('student_abilities', '*', { limit: 20, orderBy: 'updated_at', query: (q) => q.eq('student_id', studentId) }),
    safeRows('student_interests', '*', { limit: 20, orderBy: 'updated_at', query: (q) => q.eq('student_id', studentId) }),
    safeRows('student_recommendations', '*', { limit: 8, orderBy: 'created_at', query: (q) => q.eq('student_id', studentId) }),
  ]);

  const sessionScores = sessions.rows.map((row) => row.final_score ?? row.score ?? row.ability_estimate);
  return {
    student: student.rows[0] ? normalizeStudentRow(student.rows[0]) : null,
    sessions: sessions.rows,
    abilities: abilities.rows,
    interests: interests.rows,
    recommendations: recommendations.rows,
    summary: {
      tests: sessions.rows.length,
      averageScore: average(sessionScores),
      strongest: topBy(abilities.rows, 'ability_estimate'),
      weakest: bottomBy(abilities.rows, 'ability_estimate'),
    },
    error: student.error,
  };
}

export async function createAdminQuestion(payload) {
  const validation = validateQuestionPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = {
    subject_id: payload.subjectId,
    question_text: payload.questionAr || payload.questionHe,
    question_text_ar: payload.questionAr || payload.questionHe,
    question_text_he: payload.questionHe || payload.questionAr,
    option_a_ar: payload.optionAAr || payload.optionAHe,
    option_a_he: payload.optionAHe || payload.optionAAr,
    option_b_ar: payload.optionBAr || payload.optionBHe,
    option_b_he: payload.optionBHe || payload.optionBAr,
    option_c_ar: payload.optionCAr || payload.optionCHe,
    option_c_he: payload.optionCHe || payload.optionCAr,
    option_d_ar: payload.optionDAr || payload.optionDHe,
    option_d_he: payload.optionDHe || payload.optionDAr,
    correct_answer: payload.correctAnswer,
    difficulty: Number(payload.difficulty || 0),
    discrimination: Number(payload.discrimination || 1),
    guessing: Number(payload.guessing || 0.25),
    target_language: payload.language || 'both',
    is_active: payload.isActive ?? true,
  };

  if (payload.tags?.length) row.tags = payload.tags;
  if (payload.explanation) {
    row.explanation_ar = payload.explanation;
    row.explanation_he = payload.explanation;
  }

  let { data, error } = await supabase.from('questions').insert([row]).select('*').maybeSingle();
  if (error && isMissingSchema(error)) {
    const { question_text, tags, explanation_ar, explanation_he, ...baseRow } = row;
    const retry = await supabase.from('questions').insert([baseRow]).select('*').maybeSingle();
    data = retry.data;
    error = retry.error;
  }
  if (error) return { success: false, error };
  clearAdminCache('rows:questions');
  clearAdminCache('dashboard:');
  return { success: true, data };
}

export function validateQuestionPayload(payload) {
  if (!payload.subjectId) return { valid: false, message: 'يجب اختيار مادة قبل حفظ السؤال.' };
  if (!payload.questionAr && !payload.questionHe) return { valid: false, message: 'يجب إدخال نص السؤال بالعربية أو العبرية.' };
  const options = ['A', 'B', 'C', 'D'];
  const missing = options.some((key) => !payload[`option${key}Ar`] && !payload[`option${key}He`]);
  if (missing) return { valid: false, message: 'يجب إدخال 4 خيارات على الأقل بلغة واحدة.' };
  if (!options.includes(payload.correctAnswer)) return { valid: false, message: 'يجب اختيار الإجابة الصحيحة A/B/C/D.' };
  return { valid: true };
}

function average(values) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function topBy(rows, field) {
  return [...rows].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))[0] || null;
}

function bottomBy(rows, field) {
  return [...rows].sort((a, b) => Number(a[field] || 0) - Number(b[field] || 0))[0] || null;
}

function groupByDate(rows, field, days) {
  const today = new Date();
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return {
      label: key.slice(5),
      value: rows.filter((row) => String(row[field] || row.created_at || '').startsWith(key)).length,
    };
  });
}

function summarizeGames(rows) {
  if (!rows.length) {
    return [
      { label: 'مهندس الجسور', value: 12 },
      { label: 'أوجد الكلمات', value: 9 },
      { label: 'مختبر الفيزياء', value: 7 },
      { label: 'רופא בסורוקה', value: 5 },
    ];
  }
  const counts = rows.reduce((acc, row) => {
    const key = row.game_id || row.game_key || row.game_name || 'game';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function buildActivities(rows) {
  if (!rows.length) {
    return [
      { title: 'طالب جديد سجل', subtitle: 'بانتظار بيانات من audit_logs', type: 'student' },
      { title: 'سؤال جديد تمت إضافته', subtitle: 'TODO: ربط مباشر عند حفظ السؤال', type: 'question' },
      { title: 'مدير مدرسة تم إنشاؤه', subtitle: 'تظهر هنا بعد إرسال الدعوات', type: 'manager' },
    ];
  }
  return rows.map((row) => ({
    title: row.action || 'عملية إدارية',
    subtitle: row.created_at || row.entity_type || '',
    type: row.entity_type || 'audit',
  }));
}

function buildAlerts({ students, schools, questions, incompleteSessions, subjects }) {
  const alerts = [];
  if (questions.count < 20) alerts.push('عدد الأسئلة منخفض في بنك الأسئلة.');
  if (!schools.count) alerts.push('لا توجد مدارس مرتبطة بعد أو جدول schools غير موجود. TODO: تأكيد اسم جدول المدارس.');
  if (incompleteSessions.count > 0) alerts.push(`${incompleteSessions.count} جلسة اختبار غير مكتملة تحتاج مراجعة.`);
  if (!subjects.rows.length) alerts.push('لا توجد مواد مفعلة أو تعذر تحميل جدول subjects.');
  if (!students.count) alerts.push('لا يوجد طلاب ظاهرون للأدمن حاليًا.');
  return alerts;
}
