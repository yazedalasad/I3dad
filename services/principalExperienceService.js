import { supabase } from '../config/supabase';
import { buildClassLabel, normalizeClassSection } from '../utils/classSections';

const emptyDashboard = {
  totalStudents: 0,
  completedTests: 0,
  averageScore: 0,
  atRiskStudents: 0,
  classesCount: 0,
  lastUpdated: new Date().toISOString(),
  completionRate: 0,
  topInterest: 'غير متوفر',
  weakestArea: 'غير متوفر',
  mostActiveClass: 'غير متوفر',
  recentActivity: [],
};

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function abilityValue(row) {
  return number(row?.ability_score ?? row?.theta_estimate ?? row?.ability_estimate ?? row?.confidence_level ?? row?.confidence_score, 0);
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(number(value))));
}

const DEMO_STUDENT_NAMES = {
  '40000000-0000-0000-0000-000000000001': 'ياسر الصانع',
  '40000000-0000-0000-0000-000000000002': 'سارة الأسد',
  '40000000-0000-0000-0000-000000000003': 'محمد أبو بدر',
  '40000000-0000-0000-0000-000000000004': 'ريم الصانع',
  '40000000-0000-0000-0000-000000000005': 'أحمد الأسد',
  '40000000-0000-0000-0000-000000000006': 'نور أبو بدر',
  'yaser.alsane.demo@i3dad.test': 'ياسر الصانع',
  'sara.alasad.demo@i3dad.test': 'سارة الأسد',
  'mohammad.abubader.demo@i3dad.test': 'محمد أبو بدر',
  'reem.alsane.demo@i3dad.test': 'ريم الصانع',
  'ahmad.alasad.demo@i3dad.test': 'أحمد الأسد',
  'noor.abubader.demo@i3dad.test': 'نور أبو بدر',
};

function hasBrokenEncoding(value) {
  const text = String(value || '');
  return /[ÙØÃÂ]/.test(text) || text.includes('�');
}

function cleanText(value) {
  return value && !hasBrokenEncoding(value) ? String(value).trim() : '';
}

function fullName(row) {
  const demoName = DEMO_STUDENT_NAMES[row?.id] || DEMO_STUDENT_NAMES[String(row?.email || '').toLowerCase()];
  const name = cleanText(row?.full_name) || `${cleanText(row?.first_name)} ${cleanText(row?.last_name)}`.replace(/\s+/g, ' ').trim();
  return name || demoName || row?.email || 'طالب';
}

function csvText(value) {
  const text = String(value ?? '');
  return text ? `="${text.replace(/"/g, '""')}"` : '';
}

function statusLabel(status) {
  if (status === 'completed') return 'مكتمل';
  if (status === 'in_progress') return 'قيد التنفيذ';
  if (status === 'abandoned') return 'غير مكتمل';
  return 'لم يبدأ';
}

export async function getCurrentPrincipal() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('يجب تسجيل الدخول أولا.');

  const { data, error } = await supabase
    .from('principals')
    .select('id, user_id, full_name, email, gmail, phone, school_id, school_name, role, preferred_language, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('هذا الحساب غير مرتبط بمدير مدرسة.');
  if (!data.school_id) throw new Error('لا توجد مدرسة مرتبطة بحساب المدير.');

  const { data: school } = await supabase
    .from('schools')
    .select('id, name_ar, name_he, city_ar, city_he')
    .eq('id', data.school_id)
    .maybeSingle();

  return {
    ...data,
    school: school || null,
    school_name_ar: school?.name_ar || data.school_name || null,
    school_name_he: school?.name_he || null,
  };
}

export function localizedPrincipalSchoolName(principal, language = 'ar', fallback = '') {
  const isHebrew = String(language || '').toLowerCase().startsWith('he');
  if (isHebrew) {
    return principal?.school?.name_he || principal?.school_name_he || principal?.school?.name_ar || principal?.school_name || fallback;
  }
  return principal?.school?.name_ar || principal?.school_name_ar || principal?.school_name || principal?.school?.name_he || fallback;
}

export async function getPrincipalStudents(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, user_id, student_id, first_name, last_name, email, phone, grade, class_section, preferred_language, school_name, school_id, is_active, last_sign_in_at, created_at')
    .eq('school_id', schoolId)
    .order('grade', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getLatestSessions(studentIds = []) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_id, school_id, subject_id, status, started_at, completed_at, final_score, correct_answers, wrong_answers, skipped_questions, total_time_seconds, engagement_score')
    .in('student_id', studentIds)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAbilityRows(studentIds = []) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('student_abilities')
    .select('student_id, ability_score, theta_estimate, confidence_level, total_questions_answered, correct_answers, accuracy_rate, subject_id, subjects(name_ar, name_he, name_en)')
    .in('student_id', studentIds);

  if (error) throw error;
  return data || [];
}

async function getInterestRows(studentIds = []) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('student_interests')
    .select('student_id, interest_score, subject_id, subjects(name_ar, name_he, name_en)')
    .in('student_id', studentIds);

  if (error) throw error;
  return data || [];
}

export async function getPrincipalDashboardData() {
  const principal = await getCurrentPrincipal();
  const students = await getPrincipalStudents(principal.school_id);
  const studentIds = students.map((student) => student.id);
  const [sessions, abilities, interests] = await Promise.all([
    getLatestSessions(studentIds),
    getAbilityRows(studentIds),
    getInterestRows(studentIds),
  ]);

  const latestByStudent = new Map();
  sessions.forEach((session) => {
    if (!latestByStudent.has(session.student_id)) latestByStudent.set(session.student_id, session);
  });

  const completedTests = sessions.filter((session) => session.status === 'completed').length;
  const averageScore = percent(
    abilities.length
      ? abilities.reduce((sum, row) => sum + number(row.ability_score), 0) / abilities.length
      : 0
  );

  const atRiskStudents = students.filter((student) => {
    const latest = latestByStudent.get(student.id);
    const studentAbilities = abilities.filter((row) => row.student_id === student.id);
    const avg = studentAbilities.length
      ? studentAbilities.reduce((sum, row) => sum + number(row.ability_score), 0) / studentAbilities.length
      : 0;
    return latest?.status !== 'completed' || avg < 45;
  }).length;

  const classes = new Map();
  students.forEach((student) => {
    const key = `${student.grade || '-'}:${normalizeClassSection(student.class_section)}`;
    if (!classes.has(key)) {
      classes.set(key, {
        label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
        students: 0,
        completed: 0,
      });
    }
    const item = classes.get(key);
    item.students += 1;
    if (latestByStudent.get(student.id)?.status === 'completed') item.completed += 1;
  });

  const mostActiveClass =
    Array.from(classes.values()).sort((a, b) => b.completed - a.completed)[0]?.label || 'غير متوفر';

  const subjectMap = new Map();
  const pushSubject = (row, key, value) => {
    const label = row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || 'غير متوفر';
    if (!subjectMap.has(row.subject_id)) subjectMap.set(row.subject_id, { label, abilities: [], interests: [] });
    subjectMap.get(row.subject_id)[key].push(number(value));
  };
  abilities.forEach((row) => pushSubject(row, 'abilities', row.ability_score));
  interests.forEach((row) => pushSubject(row, 'interests', row.interest_score));

  const subjects = Array.from(subjectMap.values()).map((item) => ({
    label: item.label,
    ability: item.abilities.length ? item.abilities.reduce((a, b) => a + b, 0) / item.abilities.length : 0,
    interest: item.interests.length ? item.interests.reduce((a, b) => a + b, 0) / item.interests.length : 0,
  }));

  const topInterest = subjects.slice().sort((a, b) => b.interest - a.interest)[0]?.label || 'غير متوفر';
  const weakestArea = subjects.slice().sort((a, b) => a.ability - b.ability)[0]?.label || 'غير متوفر';

  const recentActivity = sessions.slice(0, 4).map((session) => {
    const student = students.find((item) => item.id === session.student_id);
    return {
      id: session.id,
      title: `${fullName(student)} - ${statusLabel(session.status)}`,
      meta: session.completed_at || session.started_at || '',
      tone: session.status === 'completed' ? 'success' : session.status === 'in_progress' ? 'primary' : 'warning',
    };
  });

  return {
    principal,
    students,
    sessions,
    dashboard: {
      ...emptyDashboard,
      totalStudents: students.length,
      completedTests,
      averageScore,
      atRiskStudents,
      classesCount: classes.size,
      completionRate: percent((completedTests / Math.max(students.length, 1)) * 100),
      topInterest,
      weakestArea,
      mostActiveClass,
      recentActivity,
    },
  };
}

export async function getPrincipalStudentRows() {
  const { principal, students } = await getPrincipalDashboardData();
  const studentIds = students.map((student) => student.id);
  const [sessions, abilities] = await Promise.all([getLatestSessions(studentIds), getAbilityRows(studentIds)]);
  const latestByStudent = new Map();
  sessions.forEach((session) => {
    if (!latestByStudent.has(session.student_id)) latestByStudent.set(session.student_id, session);
  });

  const rows = students.map((student) => {
    const studentAbilities = abilities.filter((row) => row.student_id === student.id);
    const averageScore = percent(
      studentAbilities.length
        ? studentAbilities.reduce((sum, row) => sum + number(row.ability_score), 0) / studentAbilities.length
        : 0
    );
    const latestSession = latestByStudent.get(student.id) || null;

    return {
      ...student,
      full_name: fullName(student),
      class_label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
      latestSession,
      completion_status: latestSession?.status === 'completed' ? 'completed' : 'not_completed',
      average_score: averageScore,
      last_test_date: latestSession?.completed_at || latestSession?.started_at || null,
      completed_tests: sessions.filter((session) => session.student_id === student.id && session.status === 'completed').length,
      abandoned_tests: sessions.filter((session) => session.student_id === student.id && session.status === 'abandoned').length,
      in_progress_tests: sessions.filter((session) => session.student_id === student.id && session.status === 'in_progress').length,
      engagement_score: latestSession?.engagement_score ?? null,
    };
  });

  return { principal, rows };
}

export async function getPrincipalStudentDetails(studentId) {
  const principal = await getCurrentPrincipal();
  const { data: student, error } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, grade, class_section, school_id, school_name')
    .eq('id', studentId)
    .eq('school_id', principal.school_id)
    .maybeSingle();

  if (error) throw error;
  if (!student) throw new Error('لا يمكن عرض هذا الطالب.');

  const [sessions, abilities, interests] = await Promise.all([
    getLatestSessions([studentId]),
    getAbilityRows([studentId]),
    getInterestRows([studentId]),
  ]);

  const strengths = abilities
    .slice()
    .sort((a, b) => number(b.ability_score) - number(a.ability_score))
    .slice(0, 4)
    .map((row) => ({ label: row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || 'مجال', score: percent(row.ability_score) }));

  const weaknesses = abilities
    .slice()
    .sort((a, b) => number(a.ability_score) - number(b.ability_score))
    .slice(0, 4)
    .map((row) => ({ label: row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || 'مجال', score: percent(row.ability_score) }));

  return {
    principal,
    student: {
      ...student,
      full_name: fullName(student),
      class_label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
    },
    latestSession: sessions[0] || null,
    strengths,
    weaknesses,
    interests: interests
      .slice()
      .sort((a, b) => number(b.interest_score) - number(a.interest_score))
      .slice(0, 4)
      .map((row) => ({ label: row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || 'مجال', score: percent(row.interest_score) })),
  };
}

export async function updatePrincipalBasicProfile(updates) {
  const principal = await getCurrentPrincipal();
  const payload = {
    full_name: String(updates.full_name || '').trim(),
    phone: String(updates.phone || '').trim() || null,
    preferred_language: String(updates.preferred_language || 'ar').startsWith('he') ? 'he' : 'ar',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('principals')
    .update(payload)
    .eq('id', principal.id)
    .eq('user_id', principal.user_id)
    .select('id, user_id, full_name, email, gmail, phone, school_id, school_name, role, preferred_language, is_active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function recordPrincipalAudit({ action, entityType, entityId, page, status = 'success', metadata = {} }) {
  const { data: auth } = await supabase.auth.getUser();
  const actorId = auth?.user?.id;
  if (!actorId) return { success: false };

  const { error } = await supabase.from('audit_logs').insert([{
    actor_id: actorId,
    actor_role: 'principal',
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    page: page || null,
    status,
    metadata,
  }]);

  return { success: !error, error };
}

export async function getPrincipalStudentsManaged(filters = {}) {
  const principal = await getCurrentPrincipal();
  const { data: students, error } = await supabase
    .from('students')
    .select('id, user_id, student_id, first_name, last_name, email, phone, grade, class_section, preferred_language, school_name, school_id, is_active, last_sign_in_at, created_at')
    .eq('school_id', principal.school_id)
    .order('grade', { ascending: true });

  if (error) throw error;

  const rows = (students || []).filter((student) => {
    if (filters.grade && filters.grade !== 'all' && String(student.grade) !== String(filters.grade)) return false;
    if (filters.classSection && filters.classSection !== 'all' && normalizeClassSection(student.class_section) !== normalizeClassSection(filters.classSection)) return false;
    if (filters.isActive && filters.isActive !== 'all') {
      const active = filters.isActive === 'active';
      if (Boolean(student.is_active) !== active) return false;
    }
    if (filters.language && filters.language !== 'all' && String(student.preferred_language || 'ar') !== filters.language) return false;
    return true;
  });

  return {
    principal,
    rows: rows.map((student) => ({
      ...student,
      full_name: fullName(student),
      class_label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
    })),
  };
}

export async function updatePrincipalManagedStudent(studentId, updates = {}) {
  const principal = await getCurrentPrincipal();
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'phone')) payload.phone = String(updates.phone || '').trim() || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'preferred_language')) {
    const language = String(updates.preferred_language || 'ar').toLowerCase();
    payload.preferred_language = language.startsWith('he') ? 'he' : language.startsWith('en') ? 'en' : 'ar';
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'class_section')) payload.class_section = normalizeClassSection(updates.class_section);
  if (Object.prototype.hasOwnProperty.call(updates, 'is_active')) payload.is_active = Boolean(updates.is_active);

  if (!Object.keys(payload).length) return null;

  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', studentId)
    .eq('school_id', principal.school_id)
    .select('id, user_id, student_id, first_name, last_name, email, phone, grade, class_section, preferred_language, school_id, school_name, is_active, last_sign_in_at')
    .maybeSingle();

  if (error) throw error;
  await recordPrincipalAudit({
    action: payload.is_active === false ? 'principal_disable_student' : 'principal_update_student',
    entityType: 'student',
    entityId: studentId,
    page: 'principalStudents',
    metadata: { updates: Object.keys(payload), school_id: principal.school_id },
  });
  return data;
}

export async function getPrincipalStudentProgress(studentId) {
  const principal = await getCurrentPrincipal();
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, user_id, student_id, first_name, last_name, email, phone, grade, class_section, preferred_language, school_id, school_name, is_active, last_sign_in_at, created_at')
    .eq('id', studentId)
    .eq('school_id', principal.school_id)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!student) throw new Error('لا يمكن عرض هذا الطالب.');

  const [sessionsRes, abilitiesRes, interestsRes, potentialRes, recommendationsRes, notes] = await Promise.all([
    supabase.from('test_sessions').select('id, student_id, subject_id, session_type, status, started_at, completed_at, final_score, correct_answers, wrong_answers, skipped_questions, total_time_seconds, engagement_score').eq('student_id', studentId).order('started_at', { ascending: false }),
    supabase.from('student_abilities').select('student_id, subject_id, ability_score, theta_estimate, confidence_level, total_questions_answered, correct_answers, accuracy_rate, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_interests').select('student_id, subject_id, interest_score, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_learning_potential').select('student_id, subject_id, potential_score, ability_component, interest_component, growth_component, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId),
    supabase.from('student_recommendations').select('id, student_id, subject_id, recommendation_score, reason_ar, reason_he, reason_en, rank, status, created_at, subjects(name_ar, name_he, name_en, code)').eq('student_id', studentId).order('rank', { ascending: true }),
    getPrincipalStudentNotes(studentId),
  ]);

  if (sessionsRes.error) throw sessionsRes.error;
  if (abilitiesRes.error) throw abilitiesRes.error;
  if (interestsRes.error) throw interestsRes.error;

  const sessions = sessionsRes.data || [];
  const abilities = abilitiesRes.data || [];
  const interests = interestsRes.data || [];
  const potentials = potentialRes.error ? [] : potentialRes.data || [];
  const recommendations = recommendationsRes.error ? [] : recommendationsRes.data || [];

  const summary = {
    completed: sessions.filter((session) => session.status === 'completed').length,
    abandoned: sessions.filter((session) => session.status === 'abandoned').length,
    inProgress: sessions.filter((session) => session.status === 'in_progress').length,
    latestSession: sessions[0] || null,
    averageScore: percent(sessions.filter((session) => session.final_score != null).reduce((sum, session) => sum + number(session.final_score), 0) / Math.max(sessions.filter((session) => session.final_score != null).length, 1)),
  };

  await recordPrincipalAudit({ action: 'principal_read_sensitive_student_report', entityType: 'student', entityId: studentId, page: 'principalStudentDetails', metadata: { school_id: principal.school_id } });

  return {
    principal,
    student: { ...student, full_name: fullName(student), class_label: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar') },
    sessions,
    abilities,
    interests,
    potentials,
    recommendations,
    notes,
    summary,
  };
}

export async function getClassAnalyticsRows() {
  const principal = await getCurrentPrincipal();
  const studentsResult = await getPrincipalStudentsManaged();
  const students = studentsResult.rows;
  const studentIds = students.map((student) => student.id);
  const [sessions, abilities] = await Promise.all([getLatestSessions(studentIds), getAbilityRows(studentIds)]);
  const groups = new Map();

  students.forEach((student) => {
    const key = `${student.grade || '-'}:${normalizeClassSection(student.class_section)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        grade: student.grade || '-',
        classSection: normalizeClassSection(student.class_section),
        classLabel: buildClassLabel(student.grade || '-', normalizeClassSection(student.class_section), 'ar'),
        students: [],
      });
    }
    groups.get(key).students.push(student);
  });

  const rows = Array.from(groups.values()).map((group) => {
    const ids = group.students.map((student) => student.id);
    const groupSessions = sessions.filter((session) => ids.includes(session.student_id));
    const groupAbilities = abilities.filter((row) => ids.includes(row.student_id));
    const completed = groupSessions.filter((session) => session.status === 'completed').length;
    const engagementValues = groupSessions.map((session) => number(session.engagement_score, NaN)).filter(Number.isFinite);

    const subjects = new Map();
    groupAbilities.forEach((row) => {
      const subjectId = row.subject_id || 'unknown';
      const label = row.subjects?.name_ar || row.subjects?.name_he || row.subjects?.name_en || 'مجال';
      if (!subjects.has(subjectId)) subjects.set(subjectId, { label, values: [] });
      subjects.get(subjectId).values.push(abilityValue(row));
    });
    const subjectScores = Array.from(subjects.values()).map((subject) => ({
      label: subject.label,
      score: subject.values.length ? subject.values.reduce((a, b) => a + b, 0) / subject.values.length : 0,
    }));

    return {
      ...group,
      studentsCount: group.students.length,
      activeStudents: group.students.filter((student) => student.is_active !== false).length,
      inactiveStudents: group.students.filter((student) => student.is_active === false).length,
      averagePerformance: percent(groupAbilities.length ? groupAbilities.reduce((sum, row) => sum + abilityValue(row), 0) / groupAbilities.length : 0),
      averageEngagement: percent(engagementValues.length ? engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length : 0),
      completionRate: percent((completed / Math.max(group.students.length, 1)) * 100),
      strongestSubject: subjectScores.slice().sort((a, b) => b.score - a.score)[0]?.label || '-',
      weakestSubject: subjectScores.slice().sort((a, b) => a.score - b.score)[0]?.label || '-',
    };
  });

  return { principal, rows };
}

export async function getPrincipalStudentNotes(studentId) {
  const principal = await getCurrentPrincipal();
  const { data, error } = await supabase
    .from('principal_student_notes')
    .select('*')
    .eq('principal_id', principal.id)
    .eq('school_id', principal.school_id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) {
    if (String(error.message || '').toLowerCase().includes('does not exist')) return [];
    throw error;
  }
  return data || [];
}

export async function savePrincipalStudentNote({ studentId, note, visibility = 'principal_only', id }) {
  const principal = await getCurrentPrincipal();
  const payload = {
    principal_id: principal.id,
    student_id: studentId,
    school_id: principal.school_id,
    note: String(note || '').trim(),
    visibility,
    updated_at: new Date().toISOString(),
  };
  if (!payload.note) throw new Error('الملاحظة فارغة.');

  const query = id
    ? supabase.from('principal_student_notes').update(payload).eq('id', id).eq('principal_id', principal.id)
    : supabase.from('principal_student_notes').insert([{ ...payload, created_at: new Date().toISOString() }]);
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  await recordPrincipalAudit({ action: id ? 'principal_update_student_note' : 'principal_create_student_note', entityType: 'principal_student_note', entityId: data?.id, page: 'principalStudentDetails', metadata: { student_id: studentId } });
  return data;
}

export async function deletePrincipalStudentNote(id) {
  const principal = await getCurrentPrincipal();
  const { error } = await supabase
    .from('principal_student_notes')
    .delete()
    .eq('id', id)
    .eq('principal_id', principal.id)
    .eq('school_id', principal.school_id);
  if (error) throw error;
  await recordPrincipalAudit({ action: 'principal_delete_student_note', entityType: 'principal_student_note', entityId: id, page: 'principalStudentDetails' });
  return true;
}

export async function getPrincipalRecommendations(filters = {}) {
  const principal = await getCurrentPrincipal();
  const studentsResult = await getPrincipalStudentsManaged();
  const studentIds = studentsResult.rows.map((student) => student.id);
  if (!studentIds.length) return { principal, rows: [], students: studentsResult.rows };

  let query = supabase
    .from('student_recommendations')
    .select('id, student_id, subject_id, recommendation_type, title_ar, title_he, body_ar, body_he, reason_ar, reason_he, rank, status, payload, created_at, subjects(name_ar, name_he, name_en)')
    .in('student_id', studentIds);

  if (filters.subjectId && filters.subjectId !== 'all') query = query.eq('subject_id', filters.subjectId);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.rank && filters.rank !== 'all') query = query.eq('rank', Number(filters.rank));

  const { data, error } = await query.order('rank', { ascending: true });
  if (error) throw error;
  return { principal, rows: data || [], students: studentsResult.rows };
}

export async function getPrincipalNotifications() {
  const principal = await getCurrentPrincipal();
  const { data, error } = await supabase
    .from('principal_notifications')
    .select('*')
    .eq('principal_id', principal.id)
    .eq('school_id', principal.school_id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    if (String(error.message || '').toLowerCase().includes('does not exist')) return { principal, rows: [] };
    throw error;
  }
  return { principal, rows: data || [] };
}

export async function markPrincipalNotificationRead(id, isRead = true) {
  const principal = await getCurrentPrincipal();
  const { data, error } = await supabase
    .from('principal_notifications')
    .update({ is_read: isRead })
    .eq('id', id)
    .eq('principal_id', principal.id)
    .eq('school_id', principal.school_id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function exportPrincipalStudentsCsv(scope = {}) {
  const { principal, rows } = await getPrincipalStudentsManaged(scope);
  const headers = ['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الصف', 'الشعبة', 'الحالة', 'آخر دخول'];
  const csvRows = rows.map((row) => [
    row.full_name,
    row.email || '',
    csvText(row.phone || ''),
    row.grade || '',
    row.class_section || '',
    row.is_active === false ? 'غير نشط' : 'نشط',
    row.last_sign_in_at || '',
  ]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = `\ufeff${[headers, ...csvRows].map((line) => line.map(escape).join(',')).join('\n')}`;
  await recordPrincipalAudit({ action: 'principal_export_report', entityType: 'school', entityId: principal.school_id, page: 'principalReports', metadata: { rows: rows.length, scope } });
  return { principal, csv, filename: `principal-school-report-${principal.school_id}.csv` };
}
