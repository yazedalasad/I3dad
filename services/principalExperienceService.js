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

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(number(value))));
}

function fullName(row) {
  return `${row?.first_name || ''} ${row?.last_name || ''}`.trim() || 'طالب';
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
  return data;
}

export async function getPrincipalStudents(schoolId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, grade, class_section, school_name, school_id, created_at')
    .eq('school_id', schoolId)
    .order('grade', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getLatestSessions(studentIds = []) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, student_id, status, started_at, completed_at, final_score, correct_answers, wrong_answers, skipped_questions, total_time_seconds')
    .in('student_id', studentIds)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAbilityRows(studentIds = []) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('student_abilities')
    .select('student_id, ability_score, subject_id, subjects(name_ar, name_he, name_en)')
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
