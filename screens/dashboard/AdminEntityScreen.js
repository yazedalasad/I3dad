import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  AdminCard,
  AdminShell,
  AdminTable,
  ChartCard,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  StatCard,
  StatusBadge,
  useAdminLocale,
} from '../../components/Admin/AdminLayout';
import { adminColors } from '../../components/Admin/adminTheme';
import { useAdminTranslator } from '../../components/Admin/adminTranslations';
import { supabase } from '../../config/supabase';
import { israeliSchools } from '../../data/israeliSchools';
import {
  createAdminInstitution,
  createAdminStudent,
  createAdminSubject,
  deleteAdminInstitution,
  deleteAdminStudent,
  getAdminRows,
  updateAdminGameVisibility,
  updateAdminInstitution,
  updateAdminStudent,
} from '../../services/adminPanelService';

const initialSubjectForm = {
  nameAr: '',
  nameHe: '',
  nameEn: '',
  code: '',
  category: 'core',
  pointLevel: '10',
  descriptionAr: '',
  descriptionHe: '',
  descriptionEn: '',
  isActive: true,
};

const initialInstitutionForm = {
  mode: 'create',
  id: null,
  name_ar: '',
  name_he: '',
  name_en: '',
  type: 'university',
  website: '',
  is_active: true,
};

export const adminEntityConfigs = {
  students: {
    activeKey: 'students',
    title: 'إدارة الطلاب',
    subtitle: 'عرض وإدارة كل الطلاب المسجلين في النظام',
    addLabel: 'إضافة طالب',
    empty: 'لا يوجد طلاب مطابقون للفلاتر',
    columns: [
      { key: 'full_name', label: 'الاسم الكامل', width: 180, render: (row) => <Cell text={fullName(row)} strong /> },
      { key: 'email', label: 'البريد الإلكتروني', width: 210 },
      { key: 'identity_number', label: 'رقم الهوية', width: 130 },
      { key: 'school_name', label: 'المدرسة', width: 170 },
      { key: 'grade', label: 'الصف', width: 90 },
      { key: 'class_section', label: 'الشعبة', width: 90 },
      { key: 'preferred_language', label: 'اللغة', width: 90 },
      { key: 'status', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.is_active === false ? 'موقوف' : 'نشط'} /> },
      { key: 'actions', label: 'إجراءات', width: 210 },
    ],
    filters: ['المدرسة', 'الصف', 'الحالة', 'اللغة'],
  },
  managers: {
    activeKey: 'managers',
    title: 'إدارة مديري المدارس',
    subtitle: 'دعوات المديرين، الربط بالمدارس، والصلاحيات',
    addLabel: 'دعوة مدير جديد',
    empty: 'لا يوجد مديرون بعد',
    addScreen: 'adminManagement',
    columns: [
      { key: 'full_name', label: 'اسم المدير', width: 190 },
      { key: 'email', label: 'البريد الإلكتروني', width: 210 },
      { key: 'school_name', label: 'المدرسة المرتبطة', width: 190 },
      { key: 'students_count', label: 'عدد الطلاب', width: 110 },
      { key: 'last_sign_in_at', label: 'آخر دخول', width: 160 },
      { key: 'status', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.is_active === false ? 'معطل' : 'نشط'} /> },
      { key: 'actions', label: 'إجراءات', width: 180, render: () => <Actions /> },
    ],
    filters: ['المدرسة', 'الحالة', 'اللغة'],
  },
  schools: {
    activeKey: 'schools',
    title: 'إدارة المدارس / المؤسسات التعليمية',
    subtitle: 'إدارة المدارس، المديرين، الطلاب، وتقارير المدرسة',
    addLabel: 'إضافة مدرسة',
    empty: 'لا توجد مدارس. TODO: تأكيد اسم جدول schools إذا كان مختلفًا.',
    columns: [
      { key: 'name_ar', label: 'اسم المدرسة بالعربية', width: 210 },
      { key: 'name_he', label: 'اسم المدرسة بالعبرية', width: 210 },
      { key: 'city_ar', label: 'المدينة / القرية', width: 160 },
      { key: 'region', label: 'المنطقة', width: 130 },
      { key: 'students_count', label: 'الطلاب', width: 100 },
      { key: 'principals_count', label: 'المديرون', width: 110 },
      { key: 'status', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.is_active === false ? 'معطلة' : 'نشطة'} /> },
      { key: 'actions', label: 'إجراءات', width: 170, render: () => <Actions /> },
    ],
    filters: ['المدينة', 'المنطقة', 'الحالة'],
  },
  subjects: {
    activeKey: 'subjects',
    title: 'إدارة المواد والقدرات',
    subtitle: 'التحكم بالمواد والقدرات التي يقيسها النظام',
    addLabel: 'إضافة مادة',
    empty: 'لا توجد مواد مفعلة',
    columns: [
      { key: 'name_ar', label: 'العربية', width: 170 },
      { key: 'name_he', label: 'العبرية', width: 170 },
      { key: 'name_en', label: 'الإنجليزية', width: 170 },
      { key: 'category', label: 'التصنيف', width: 130 },
      { key: 'difficulty', label: 'الصعوبة العامة', width: 130 },
      { key: 'is_active', label: 'مفعلة؟', width: 110, render: (row) => <StatusBadge status={row.is_active === false ? 'غير مفعلة' : 'مفعلة'} /> },
      { key: 'updated_at', label: 'آخر تحديث', width: 160 },
      { key: 'actions', label: 'إجراءات', width: 170, render: () => <Actions /> },
    ],
    filters: ['التصنيف', 'الحالة', 'الصعوبة'],
    extra: 'abilities',
  },
  questions: {
    activeKey: 'questions',
    title: 'بنك الأسئلة',
    subtitle: 'إدارة الأسئلة، اللغات، الصعوبة، والإحصائيات',
    addLabel: 'إضافة سؤال',
    addScreen: 'adminQuestionForm',
    empty: 'لا توجد أسئلة مطابقة',
    columns: [
      { key: 'question_text', label: 'نص السؤال', width: 300 },
      { key: 'subject_id', label: 'المادة', width: 160 },
      { key: 'difficulty', label: 'المستوى', width: 100 },
      { key: 'target_language', label: 'اللغة', width: 90 },
      { key: 'correct_answer', label: 'الإجابة', width: 90 },
      { key: 'times_used', label: 'مرات الظهور', width: 120 },
      { key: 'is_active', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.is_active === false ? 'غير مفعّل' : 'مفعّل'} /> },
      { key: 'actions', label: 'إجراءات', width: 190, render: () => <Actions labels={['تعديل', 'نسخ', 'تجربة']} /> },
    ],
    filters: ['المادة', 'اللغة', 'الصعوبة', 'الحالة'],
  },
  games: {
    activeKey: 'games',
    title: 'إدارة الألعاب التعليمية',
    subtitle: 'تحكم بظهور الألعاب، ألوانها، وإحصائياتها',
    empty: 'لا توجد ألعاب',
    cardMode: 'games',
    filters: ['المادة', 'اللغة', 'الحالة'],
  },
  sessions: {
    activeKey: 'sessions',
    title: 'جلسات الاختبارات',
    subtitle: 'مراقبة كل جلسات الاختبار والإجابات',
    empty: 'لا توجد جلسات اختبار',
    columns: [
      { key: 'id', label: 'sessionId', width: 230 },
      { key: 'student_identity', label: 'رقم الهوية', width: 150 },
      { key: 'session_type', label: 'نوع الاختبار', width: 150 },
      { key: 'started_at', label: 'تاريخ البدء', width: 160 },
      { key: 'completed_at', label: 'تاريخ الانتهاء', width: 160 },
      { key: 'questions_answered', label: 'عدد الأسئلة', width: 110 },
      { key: 'correct_answers', label: 'الصحيحة', width: 100 },
      { key: 'final_score', label: 'النتيجة', width: 100 },
      { key: 'status', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.status || 'غير مكتمل'} /> },
      { key: 'actions', label: 'إجراءات', width: 170, render: () => <Actions labels={['تفاصيل', 'تصدير']} /> },
    ],
    filters: ['المدرسة', 'النوع', 'الحالة', 'التاريخ'],
  },
  reports: {
    activeKey: 'reports',
    title: 'نتائج وتقارير الطلاب',
    subtitle: 'تحليل النتائج بشكل فردي وجماعي',
    empty: 'لا توجد نتائج بعد',
    chartMode: true,
    columns: [
      { key: 'student_identity', label: 'رقم الهوية', width: 150 },
      { key: 'subject_name', label: 'المادة', width: 180 },
      { key: 'ability_estimate', label: 'مستوى القدرة', width: 130 },
      { key: 'total_questions_answered', label: 'عدد الأسئلة', width: 130 },
      { key: 'correct_answers', label: 'الصحيحة', width: 110 },
      { key: 'updated_at', label: 'آخر تحديث', width: 160 },
      { key: 'actions', label: 'إجراءات', width: 170, render: () => <Actions labels={['تقرير', 'PDF']} /> },
    ],
    filters: ['المدرسة', 'المادة', 'الصف', 'التاريخ'],
  },
  institutions: {
    activeKey: 'institutions',
    title: 'إدارة المؤسسات الأكاديمية',
    subtitle: 'الجامعات والكليات والمعاهد التي تظهر في توصيات الطالب',
    addLabel: 'إضافة مؤسسة',
    empty: 'لا توجد مؤسسات أكاديمية',
    columns: [
      { key: 'name_he', label: 'العبرية', width: 210 },
      { key: 'name_en', label: 'الإنجليزية', width: 210 },
      { key: 'type', label: 'النوع', width: 150 },
      { key: 'website', label: 'الموقع', width: 240 },
      { key: 'is_active', label: 'الحالة', width: 120, render: (row) => <StatusBadge status={row.is_active === false ? 'معطلة' : 'نشطة'} /> },
      { key: 'actions', label: 'إجراءات', width: 190, render: () => <Actions labels={['عرض', 'تعديل', 'حذف']} /> },
    ],
    filters: ['النوع', 'الحالة'],
  },
  translations: {
    activeKey: 'translations',
    title: 'إدارة المحتوى والترجمات',
    subtitle: 'تحكم بالنصوص العربية والعبرية والإنجليزية بدون تعديل الكود',
    addLabel: 'إضافة نص',
    empty: 'لا توجد نصوص في static_assets بعد. TODO: إنشاء جدول translations إذا لزم.',
    columns: [
      { key: 'asset_key', label: 'key', width: 220 },
      { key: 'title_ar', label: 'النص العربي', width: 220 },
      { key: 'title_he', label: 'النص العبري', width: 220 },
      { key: 'content_en', label: 'الإنجليزي', width: 180 },
      { key: 'asset_type', label: 'مكان الاستخدام', width: 150 },
      { key: 'updated_at', label: 'آخر تحديث', width: 160 },
      { key: 'actions', label: 'إجراءات', width: 150, render: () => <Actions labels={['تعديل']} /> },
    ],
    filters: ['الصفحة', 'ناقص', 'اللغة'],
  },
  roles: {
    activeKey: 'roles',
    title: 'الصلاحيات والأدوار',
    subtitle: 'Admin، School Manager، Student، وما يملكه كل دور',
    empty: 'لا توجد أدوار',
    columns: [
      { key: 'user_id', label: 'المستخدم', width: 250 },
      { key: 'role', label: 'الدور', width: 140 },
      { key: 'updated_at', label: 'آخر تحديث', width: 160 },
      { key: 'actions', label: 'إجراءات', width: 220, render: () => <Actions labels={['صلاحيات', 'حفظ']} /> },
    ],
    filters: ['الدور', 'صلاحية حساسة'],
    extra: 'permissions',
  },
  audit: {
    activeKey: 'audit',
    title: 'سجل العمليات والأمان',
    subtitle: 'تتبع العمليات المهمة في النظام',
    empty: 'لا توجد عمليات مسجلة',
    columns: [
      { key: 'actor_id', label: 'المستخدم', width: 230 },
      { key: 'action', label: 'نوع العملية', width: 220 },
      { key: 'entity_type', label: 'الصفحة/الكيان', width: 160 },
      { key: 'created_at', label: 'التاريخ والوقت', width: 180 },
      { key: 'metadata', label: 'التفاصيل', width: 260 },
    ],
    filters: ['المستخدم', 'العملية', 'التاريخ', 'الحالة'],
  },
  settings: {
    activeKey: 'settings',
    title: 'إعدادات النظام',
    subtitle: 'الإعدادات العامة، الخصوصية، الأمان، والتقارير',
    empty: 'لا توجد إعدادات محفوظة بعد',
    settingsMode: true,
    columns: [
      { key: 'event_type', label: 'الإعداد / الحدث', width: 220 },
      { key: 'severity', label: 'الأهمية', width: 130 },
      { key: 'message', label: 'الوصف', width: 320 },
      { key: 'created_at', label: 'آخر تحديث', width: 170 },
    ],
    filters: ['اللغة', 'الخصوصية', 'الأمان'],
  },
};

const sectionLabels = {
  ar: { alef: 'ألف', bet: 'باء', gimel: 'جيم', dalet: 'دال' },
  he: { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' },
};

const languageLabels = {
  ar: { ar: 'العربية', he: 'العبرية', en: 'الإنجليزية' },
  he: { ar: 'ערבית', he: 'עברית', en: 'אנגלית' },
};

const statusLabels = {
  ar: { active: 'نشط', inactive: 'موقوف' },
  he: { active: 'פעיל', inactive: 'לא פעיל' },
};

const adminGameCopy = {
  'doctor-soroka': {
    ar: {
      title: 'طبيب في سوروكا',
      description: 'لعبة تشخيص سريري فيها حالات وأسئلة وقرارات سريعة.',
    },
    he: {
      title: 'רופא בסורוקה',
      description: 'משחק אבחון קליני עם מקרים, שאלות והחלטות מהירות.',
    },
  },
  'physics-lab': {
    ar: {
      title: 'مختبر الفيزياء',
      description: 'جرّب القوة والسرعة والتسارع في تجربة تفاعلية.',
    },
    he: {
      title: 'מעבדת פיזיקה',
      description: 'התנסות בכוח, מהירות ותאוצה בחוויה אינטראקטיבית.',
    },
  },
  'arabic-poet-puzzle': {
    ar: {
      title: 'كنوز الألفاظ',
      description: 'لعبة كلمات عربية بطابع شعري ومستوى جاهز للبدء.',
    },
    he: {
      title: 'אוצר המילים',
      description: 'משחק מילים בערבית עם אופי פיוטי ורמה מוכנה להתחלה.',
    },
  },
  'physics-bridge-game': {
    ar: {
      title: 'مهندس الجسور',
      description: 'ابنِ جسراً ثابتاً ثم اختبره ضمن ميزانية محدودة.',
    },
    he: {
      title: 'מהנדס הגשרים',
      description: 'בנו גשר יציב ובדקו אותו במסגרת תקציב מוגבל.',
    },
  },
};

function normalizeSearch(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getAdminGameText(game, isHebrew = false) {
  const copy = adminGameCopy[game.key]?.[isHebrew ? 'he' : 'ar'];
  return {
    title: copy?.title || game.title || '-',
    description: copy?.description || game.description || '-',
  };
}

function getStudentSchoolName(row, isHebrew = false) {
  if (isHebrew) {
    return row.school_name_he || row.schools?.name_he || row.school_name_ar || row.school_name || row.schools?.name_ar || '-';
  }
  return row.school_name_ar || row.school_name || row.schools?.name_ar || row.school_name_he || row.schools?.name_he || '-';
}

function getSchoolName(row, isHebrew = false) {
  return isHebrew ? row.name_he || row.name_ar || '-' : row.name_ar || row.name_he || '-';
}

function getSchoolCity(row, isHebrew = false) {
  return isHebrew ? row.city_he || row.city_ar || '-' : row.city_ar || row.city_he || '-';
}

function getSchoolRegion(row, isHebrew = false) {
  return isHebrew ? row.region_he || row.region_ar || row.region || '-' : row.region_ar || row.region || row.region_he || '-';
}

function getReportSubjectName(row, isHebrew = false) {
  return isHebrew ? row.subject_name_he || row.subject_name_ar || row.subject_name || '-' : row.subject_name_ar || row.subject_name || row.subject_name_he || '-';
}

function formatAdminDate(value, isHebrew = false) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(isHebrew ? 'he-IL' : 'ar', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getStudentSectionLabel(value, isHebrew = false) {
  const key = normalizeSearch(value);
  return (isHebrew ? sectionLabels.he : sectionLabels.ar)[key] || value || '-';
}

function getStudentLanguageLabel(value, isHebrew = false) {
  const key = normalizeSearch(value);
  return (isHebrew ? languageLabels.he : languageLabels.ar)[key] || value || '-';
}

function getStudentStatusKey(row) {
  return row.is_active === false ? 'inactive' : 'active';
}

function getStudentStatusLabel(row, isHebrew = false) {
  const key = getStudentStatusKey(row);
  return (isHebrew ? statusLabels.he : statusLabels.ar)[key];
}

function buildStudentSearchText(row, isHebrew) {
  return [
    fullName(row),
    row.email,
    row.identity_number,
    row.student_id,
    row.student_code,
    row.phone,
    row.grade,
    row.class_section,
    getStudentSectionLabel(row.class_section, isHebrew),
    row.preferred_language,
    getStudentLanguageLabel(row.preferred_language, isHebrew),
    getStudentStatusLabel(row, isHebrew),
    row.school_name,
    row.school_name_ar,
    row.school_name_he,
    row.schools?.name_ar,
    row.schools?.name_he,
  ].join(' ');
}

function uniqueOptions(values) {
  const seen = new Set();
  return values.filter((option) => {
    if (!option?.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

function nextFilterValue(options, currentValue) {
  if (!options.length) return '';
  const currentIndex = options.findIndex((option) => option.value === currentValue);
  if (currentIndex < 0) return options[0].value;
  if (currentIndex === options.length - 1) return '';
  return options[currentIndex + 1].value;
}

function buildStudentFilterChips(rows, activeFilters, setActiveFilters, isHebrew) {
  const copy = isHebrew
    ? { school: 'בית ספר', grade: 'כיתה', status: 'סטטוס', language: 'שפה' }
    : { school: 'المدرسة', grade: 'الصف', status: 'الحالة', language: 'اللغة' };

  const schoolOptions = uniqueOptions(rows.map((row) => ({
    value: row.school_id || getStudentSchoolName(row, false),
    label: getStudentSchoolName(row, isHebrew),
  })));
  const gradeOptions = uniqueOptions(rows.map((row) => ({
    value: String(row.grade || ''),
    label: String(row.grade || ''),
  }))).sort((a, b) => Number(a.value) - Number(b.value));
  const statusOptions = ['active', 'inactive'].map((value) => ({
    value,
    label: (isHebrew ? statusLabels.he : statusLabels.ar)[value],
  }));
  const languageOptions = uniqueOptions(rows.map((row) => {
    const value = normalizeSearch(row.preferred_language);
    return { value, label: getStudentLanguageLabel(value, isHebrew) };
  }));

  return [
    { key: 'school', baseLabel: copy.school, options: schoolOptions },
    { key: 'grade', baseLabel: copy.grade, options: gradeOptions },
    { key: 'status', baseLabel: copy.status, options: statusOptions },
    { key: 'language', baseLabel: copy.language, options: languageOptions },
  ].map((spec) => {
    const selected = spec.options.find((option) => option.value === activeFilters[spec.key]);
    return {
      label: selected ? `${spec.baseLabel}: ${selected.label}` : spec.baseLabel,
      onPress: () => {
        const value = nextFilterValue(spec.options, activeFilters[spec.key]);
        setActiveFilters((current) => ({ ...current, [spec.key]: value }));
      },
    };
  });
}

function filterStudentRows(rows, search, activeFilters, isHebrew) {
  const q = normalizeSearch(search);
  return rows.filter((row) => {
    if (q && !normalizeSearch(buildStudentSearchText(row, isHebrew)).includes(q)) return false;
    if (activeFilters.school && String(row.school_id || getStudentSchoolName(row, false)) !== activeFilters.school) return false;
    if (activeFilters.grade && String(row.grade || '') !== activeFilters.grade) return false;
    if (activeFilters.status && getStudentStatusKey(row) !== activeFilters.status) return false;
    if (activeFilters.language && normalizeSearch(row.preferred_language) !== activeFilters.language) return false;
    return true;
  });
}

export default function AdminEntityScreen({ entity, navigateTo }) {
  const config = adminEntityConfigs[entity];
  const tr = useAdminTranslator();
  const { isHebrew } = useAdminLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [subjectForm, setSubjectForm] = useState(null);
  const [savingSubject, setSavingSubject] = useState(false);
  const [institutionForm, setInstitutionForm] = useState(null);
  const [institutionToDelete, setInstitutionToDelete] = useState(null);
  const [savingInstitution, setSavingInstitution] = useState(false);
  const [savingGameKey, setSavingGameKey] = useState(null);

  useEffect(() => {
    setSearch('');
    setActiveFilters({});
    let mounted = true;
    setLoading(true);
    getAdminRows(entity)
      .then((result) => {
        if (!mounted) return;
        const nextRows = result.rows || [];
        setRows(nextRows);
        setError(!nextRows.length ? result.error?.message || null : null);
      })
      .catch((err) => mounted && setError(err?.message || 'تعذر تحميل البيانات'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [entity]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (entity === 'students') {
      return filterStudentRows(rows, search, activeFilters, isHebrew);
    }
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [activeFilters, entity, isHebrew, rows, search]);

  const filterChips = useMemo(() => {
    if (entity === 'students') {
      return buildStudentFilterChips(rows, activeFilters, setActiveFilters, isHebrew);
    }
    return (config.filters || []).map((label) => ({
      label,
      onPress: () => Alert.alert(tr('ÙÙ„ØªØ±'), tr(`Ø±Ø¨Ø· ÙÙ„ØªØ± ${label} Ù…Ø¹ Ø§Ù„Ø§Ø³ØªØ¹Ù„Ø§Ù…`)),
    }));
  }, [activeFilters, config.filters, entity, isHebrew, rows, tr]);

  const primaryAction = config.addLabel ? (
    <TouchableOpacity
      style={styles.primaryButton}
      onPress={handleAddAction}
    >
      <FontAwesome name="plus" size={14} color="#fff" />
      <Text style={styles.primaryButtonText}>{tr(config.addLabel)}</Text>
    </TouchableOpacity>
  ) : null;

  const openStudentEditor = (student = null) => {
    setEditingStudent({
      mode: student?.id ? 'edit' : 'create',
      id: student?.id || null,
      student_id: /^[0-9]{9}$/.test(String(student?.student_id || '')) ? String(student.student_id) : '',
      first_name: student?.first_name || '',
      last_name: student?.last_name || '',
      email: student?.email || '',
      phone: student?.phone || '',
      birthday: student?.birthday || '2008-01-01',
      school_id: student?.school_id || '',
      school_name: student?.school_name || student?.school_name_ar || '',
      grade: String(student?.grade || '10'),
      class_section: student?.class_section || 'alef',
      preferred_language: student?.preferred_language || 'ar',
      is_active: student?.is_active !== false,
      password: '',
    });
  };

  const saveStudent = async () => {
    if (!editingStudent) return;
    setSavingStudent(true);
    const result = editingStudent.mode === 'create'
      ? await createAdminStudent(editingStudent)
      : await updateAdminStudent(editingStudent.id, editingStudent);
    setSavingStudent(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حفظ الطالب'), result.error?.message || tr('حدث خطأ غير متوقع'));
      return;
    }

    setRows((current) => (
      editingStudent.mode === 'create'
        ? [result.row, ...current]
        : current.map((row) => (row.id === editingStudent.id ? result.row : row))
    ));
    setEditingStudent(null);
    Alert.alert(tr('تم الحفظ'), tr('تم تحديث بيانات الطالب بنجاح.'));
  };

  const confirmDeleteStudent = (student) => {
    setStudentToDelete(student);
  };

  const runDeleteStudent = async () => {
    if (!studentToDelete?.id) return;
    setSavingStudent(true);
    const result = await deleteAdminStudent(studentToDelete.id);
    setSavingStudent(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حذف الطالب'), result.error?.message || tr('تأكد من صلاحيات RLS ثم حاول مرة أخرى.'));
      return;
    }

    setRows((current) => current.filter((row) => row.id !== studentToDelete.id));
    setStudentToDelete(null);
    Alert.alert(tr('تم الحذف'), tr('تم حذف الطالب من جدول الطلاب.'));
  };

  const columns = (config.columns || []).map((column) => {
    if (entity === 'students' && column.key === 'school_name') {
      return {
        ...column,
        render: (row) => <StudentSchoolCell row={row} />,
      };
    }

    if (entity === 'managers' && column.key === 'school_name') {
      return {
        ...column,
        render: (row) => <StudentSchoolCell row={row} />,
      };
    }

    if (entity === 'schools' && (column.key === 'name_ar' || column.key === 'name_he')) {
      return {
        ...column,
        render: (row) => <SchoolNameCell row={row} />,
      };
    }

    if (entity === 'schools' && column.key === 'city_ar') {
      return {
        ...column,
        render: (row) => <SchoolCityCell row={row} />,
      };
    }

    if (entity === 'schools' && column.key === 'region') {
      return {
        ...column,
        render: (row) => <SchoolRegionCell row={row} />,
      };
    }

    if (entity === 'reports' && column.key === 'subject_name') {
      return {
        ...column,
        render: (row) => <ReportSubjectCell row={row} />,
      };
    }

    if (entity === 'reports' && column.key === 'updated_at') {
      return {
        ...column,
        render: (row) => <AdminDateCell value={row.updated_at} />,
      };
    }

    if (entity === 'reports' && column.key === 'actions') {
      return {
        ...column,
        render: () => <Actions labels={isHebrew ? ['דוח', 'PDF'] : ['تقرير', 'PDF']} />,
      };
    }

    if (entity === 'students' && column.key === 'class_section') {
      return {
        ...column,
        render: (row) => <StudentSectionCell value={row.class_section} />,
      };
    }

    if (entity === 'students' && column.key === 'preferred_language') {
      return {
        ...column,
        render: (row) => <StudentLanguageCell value={row.preferred_language} />,
      };
    }

    if (entity === 'students' && column.key === 'actions') {
      return {
        ...column,
        render: (row) => (
          <StudentActions
            labels={['عرض', 'تعديل', 'حذف']}
            onDetails={() => navigateTo?.('adminStudentDetails', { studentId: row.id })}
            onEdit={() => openStudentEditor(row)}
            onDelete={() => confirmDeleteStudent(row)}
          />
        ),
      };
    }

    if (entity === 'institutions' && column.key === 'actions') {
      return {
        ...column,
        render: (row) => (
          <StudentActions
            labels={['عرض', 'تعديل', 'حذف']}
            onDetails={() => showInstitutionDetails(row)}
            onEdit={() => openInstitutionEditor(row)}
            onDelete={() => setInstitutionToDelete(row)}
          />
        ),
      };
    }

    return {
      ...column,
      render: column.render ? (row) => column.render(row, navigateTo) : undefined,
    };
  });

  function handleAddAction() {
    if (entity === 'students') {
      openStudentEditor();
      return;
    }
    if (entity === 'subjects') {
      setSubjectForm(initialSubjectForm);
      return;
    }
    if (entity === 'institutions') {
      openInstitutionEditor();
      return;
    }
    if (config.addScreen) {
      navigateTo?.(config.addScreen, { section: entity });
      return;
    }
    Alert.alert(tr('قريبًا'), tr('TODO: ربط نموذج الإضافة بهذه الصفحة'));
  }

  const saveSubject = async () => {
    if (!subjectForm) return;
    setSavingSubject(true);
    const result = await createAdminSubject(subjectForm);
    setSavingSubject(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حفظ المادة'), result.error?.message || tr('تأكد من صلاحيات جدول subjects.'));
      return;
    }

    setRows((current) => [result.row, ...current]);
    setSubjectForm(null);
    Alert.alert(tr('تم الحفظ'), tr('تمت إضافة المادة بنجاح.'));
  };

  const openInstitutionEditor = (institution = null) => {
    if (String(institution?.id || '').startsWith('catalog-')) {
      Alert.alert(tr('مؤسسة من الملف المحلي'), tr('هذه المؤسسة ظاهرة من ملف الجامعات المحلي. شغّل ملف seed الخاص بالمؤسسات أولًا حتى تقدر تعدلها من لوحة الأدمن.'));
      return;
    }

    setInstitutionForm({
      ...initialInstitutionForm,
      mode: institution?.id ? 'edit' : 'create',
      id: institution?.id || null,
      name_ar: institution?.name_ar || '',
      name_he: institution?.name_he || '',
      name_en: institution?.name_en || '',
      type: institution?.type || 'university',
      website: institution?.website || '',
      is_active: institution?.is_active !== false,
    });
  };

  const showInstitutionDetails = (institution) => {
    Alert.alert(
      institution?.name_ar || institution?.name_en || tr('المؤسسة'),
      [
        `${tr('العبرية')}: ${institution?.name_he || '-'}`,
        `${tr('الإنجليزية')}: ${institution?.name_en || '-'}`,
        `${tr('النوع')}: ${institution?.type || '-'}`,
        `${tr('الموقع')}: ${institution?.website || '-'}`,
      ].join('\n')
    );
  };

  const saveInstitution = async () => {
    if (!institutionForm) return;
    setSavingInstitution(true);
    const result = institutionForm.mode === 'create'
      ? await createAdminInstitution(institutionForm)
      : await updateAdminInstitution(institutionForm.id, institutionForm);
    setSavingInstitution(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حفظ المؤسسة'), result.error?.message || tr('تأكد من صلاحيات جدول institutions.'));
      return;
    }

    setRows((current) => (
      institutionForm.mode === 'create'
        ? [result.row, ...current]
        : current.map((row) => (row.id === institutionForm.id ? result.row : row))
    ));
    setInstitutionForm(null);
    Alert.alert(tr('تم الحفظ'), tr('تم حفظ بيانات المؤسسة بنجاح.'));
  };

  const runDeleteInstitution = async () => {
    if (!institutionToDelete?.id) return;
    if (String(institutionToDelete.id).startsWith('catalog-')) {
      Alert.alert(tr('مؤسسة من الملف المحلي'), tr('لا يمكن حذف مؤسسة من الملف المحلي عبر قاعدة البيانات. شغّل seed أولًا ثم احذفها من الجدول.'));
      setInstitutionToDelete(null);
      return;
    }

    setSavingInstitution(true);
    const result = await deleteAdminInstitution(institutionToDelete.id);
    setSavingInstitution(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حذف المؤسسة'), result.error?.message || tr('تأكد من الصلاحيات أو الارتباطات التابعة.'));
      return;
    }

    setRows((current) => current.filter((row) => row.id !== institutionToDelete.id));
    setInstitutionToDelete(null);
    Alert.alert(tr('تم الحذف'), tr('تم حذف المؤسسة من القائمة.'));
  };

  const toggleGameVisibility = async (game) => {
    const nextActive = game.is_active === false || game.is_visible === false;
    setSavingGameKey(game.key);
    const result = await updateAdminGameVisibility(game.key, nextActive);
    setSavingGameKey(null);

    if (!result.success) {
      Alert.alert(tr('تعذر تحديث اللعبة'), result.error?.message || tr('تأكد من صلاحيات جدول games.'));
      return;
    }

    setRows((current) => current.map((row) => (row.key === game.key ? result.row : row)));
    Alert.alert(
      nextActive ? tr('تم تفعيل اللعبة') : tr('تم تعطيل اللعبة'),
      nextActive ? tr('ستظهر اللعبة الآن في صفحة اللعب للطالب.') : tr('لن تظهر اللعبة الآن في صفحة اللعب للطالب.')
    );
  };

  return (
    <AdminShell
      activeKey={config.activeKey}
      title={config.title}
      subtitle={config.subtitle}
      navigateTo={navigateTo}
      primaryAction={primaryAction}
    >
      <AdminCard>
        {!!config.addLabel && (
          <TouchableOpacity style={styles.inlineAddButton} onPress={handleAddAction} activeOpacity={0.85}>
            <View style={styles.inlineAddIcon}>
              <FontAwesome name="plus" size={14} color="#fff" />
            </View>
            <View style={styles.inlineAddTextWrap}>
              <Text style={styles.inlineAddTitle}>{tr(config.addLabel)}</Text>
              <Text style={styles.inlineAddSub}>
                {tr(entity === 'subjects'
                  ? 'افتح نموذج إضافة مادة جديدة'
                  : entity === 'questions'
                    ? 'افتح نموذج إضافة سؤال جديد'
                    : entity === 'managers'
                      ? 'افتح صفحة دعوة مدير جديد'
                      : 'افتح نموذج الإضافة')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <FilterBar
          search={search}
          onSearch={setSearch}
          filters={filterChips}
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : config.cardMode === 'games' ? (
          <GamesCards rows={filteredRows} savingGameKey={savingGameKey} onToggleVisibility={toggleGameVisibility} />
        ) : config.settingsMode ? (
          <SettingsContent rows={filteredRows} columns={config.columns} />
        ) : (
          <AdminTable
            columns={columns}
            rows={filteredRows}
            emptyText={config.empty}
            onRowPress={entity === 'students' ? (row) => navigateTo?.('adminStudentDetails', { studentId: row.id }) : undefined}
          />
        )}
      </AdminCard>

      {config.extra === 'abilities' && <AbilitiesSection />}
      {config.extra === 'permissions' && <PermissionsSection />}
      {config.chartMode && <ReportsCharts rows={filteredRows} />}
      <StudentEditModal
        visible={!!editingStudent}
        student={editingStudent}
        saving={savingStudent}
        onChange={setEditingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={saveStudent}
      />
      <ConfirmDeleteModal
        visible={!!studentToDelete}
        student={studentToDelete}
        saving={savingStudent}
        onClose={() => setStudentToDelete(null)}
        onConfirm={runDeleteStudent}
      />
      <SubjectModal
        visible={!!subjectForm}
        subject={subjectForm}
        saving={savingSubject}
        onChange={setSubjectForm}
        onClose={() => setSubjectForm(null)}
        onSave={saveSubject}
      />
      <InstitutionModal
        visible={!!institutionForm}
        institution={institutionForm}
        saving={savingInstitution}
        onChange={setInstitutionForm}
        onClose={() => setInstitutionForm(null)}
        onSave={saveInstitution}
      />
      <ConfirmInstitutionDeleteModal
        visible={!!institutionToDelete}
        institution={institutionToDelete}
        saving={savingInstitution}
        onClose={() => setInstitutionToDelete(null)}
        onConfirm={runDeleteInstitution}
      />
    </AdminShell>
  );
}

function Cell({ text, strong }) {
  return <Text style={[styles.cellText, strong && styles.cellStrong]} numberOfLines={2}>{text || '-'}</Text>;
}

function StudentSchoolCell({ row }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getStudentSchoolName(row, isHebrew)} />;
}

function StudentSectionCell({ value }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getStudentSectionLabel(value, isHebrew)} />;
}

function StudentLanguageCell({ value }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getStudentLanguageLabel(value, isHebrew)} />;
}

function SchoolNameCell({ row }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getSchoolName(row, isHebrew)} />;
}

function SchoolCityCell({ row }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getSchoolCity(row, isHebrew)} />;
}

function SchoolRegionCell({ row }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getSchoolRegion(row, isHebrew)} />;
}

function ReportSubjectCell({ row }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={getReportSubjectName(row, isHebrew)} />;
}

function AdminDateCell({ value }) {
  const { isHebrew } = useAdminLocale();
  return <Cell text={formatAdminDate(value, isHebrew)} />;
}

function Actions({ labels = ['عرض', 'تعديل', 'تعطيل'], onDetails }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.actions}>
      {labels.map((label, index) => (
        <TouchableOpacity
          key={label}
          style={[styles.actionBtn, index === 0 && styles.actionBtnPrimary]}
          onPress={index === 0 && onDetails ? onDetails : () => Alert.alert(tr(label), tr('ربط الإجراء بالخدمة المناسبة مع confirmation'))}
        >
          <Text style={[styles.actionText, index === 0 && styles.actionTextPrimary]}>{tr(label)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StudentActions({ labels, onDetails, onEdit, onDelete }) {
  const tr = useAdminTranslator();
  const handlers = [onDetails, onEdit, onDelete];
  const press = (event, handler) => {
    event?.stopPropagation?.();
    handler?.();
  };
  return (
    <View style={styles.actions}>
      {labels.map((label, index) => {
        const isDelete = index === 2;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.actionBtn, index === 0 && styles.actionBtnPrimary, isDelete && styles.actionBtnDanger]}
            onPress={(event) => press(event, handlers[index])}
          >
            <Text style={[styles.actionText, index === 0 && styles.actionTextPrimary, isDelete && styles.actionTextDanger]}>{tr(label)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StudentEditModal({ visible, student, saving, onChange, onClose, onSave }) {
  const tr = useAdminTranslator();
  if (!student) return null;
  const setField = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  const isCreate = student.mode === 'create';
  const gradeOptions = ['9', '10', '11', '12'];
  const sectionOptions = [
    { value: 'alef', label: 'أ' },
    { value: 'bet', label: 'ب' },
    { value: 'gimel', label: 'ج' },
    { value: 'dalet', label: 'د' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tr(isCreate ? 'إضافة طالب جديد' : 'تعديل بيانات الطالب')}</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <FontAwesome name="times" size={16} color={adminColors.text} />
            </TouchableOpacity>
          </View>

          <EditInput
            label="رقم الهوية"
            value={student.student_id}
            onChangeText={(value) => setField('student_id', value.replace(/\D/g, '').slice(0, 9))}
            keyboardType="number-pad"
            placeholder="9 أرقام"
          />
          <View style={styles.formRow}>
            <EditInput label="الاسم الأول" value={student.first_name} onChangeText={(value) => setField('first_name', value)} />
            <EditInput label="اسم العائلة" value={student.last_name} onChangeText={(value) => setField('last_name', value)} />
          </View>
          <EditInput label="البريد الإلكتروني" value={student.email} onChangeText={(value) => setField('email', value)} keyboardType="email-address" />
          <EditInput label="الهاتف" value={student.phone} onChangeText={(value) => setField('phone', value)} />
          <EditInput label="تاريخ الميلاد" value={student.birthday} onChangeText={(value) => setField('birthday', value)} placeholder="2008-01-01" />
          <SchoolAutocomplete
            value={student.school_name}
            onChangeText={(value) => {
              setField('school_name', value);
              setField('school_id', '');
            }}
            onSelect={(school) => {
              setField('school_name', school.schoolName);
              setField('school_id', school.schoolId || '');
            }}
          />
          {isCreate && (
            <EditInput
              label="كلمة مرور مؤقتة"
              value={student.password}
              onChangeText={(value) => setField('password', value)}
              placeholder="مثال: Student@12345"
              secureTextEntry
            />
          )}

          <Text style={styles.modalLabel}>{tr('الصف')}</Text>
          <View style={styles.choiceRow}>
            {gradeOptions.map((grade) => (
              <TouchableOpacity key={grade} style={[styles.choiceChip, student.grade === grade && styles.choiceChipActive]} onPress={() => setField('grade', grade)}>
                <Text style={[styles.choiceText, student.grade === grade && styles.choiceTextActive]}>{grade}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>{tr('الشعبة')}</Text>
          <View style={styles.choiceRow}>
            {sectionOptions.map((section) => (
              <TouchableOpacity key={section.value} style={[styles.choiceChip, student.class_section === section.value && styles.choiceChipActive]} onPress={() => setField('class_section', section.value)}>
                <Text style={[styles.choiceText, student.class_section === section.value && styles.choiceTextActive]}>{section.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{tr('إلغاء')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={onSave} disabled={saving}>
              <Text style={styles.modalSaveText}>{tr(saving ? 'جار الحفظ...' : isCreate ? 'إضافة الطالب' : 'حفظ التعديلات')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmDeleteModal({ visible, student, saving, onClose, onConfirm }) {
  const { isHebrew } = useAdminLocale();
  if (!student) return null;
  const studentName = fullName(student) || student.email || (isHebrew ? 'התלמיד הזה' : 'هذا الطالب');
  const copy = isHebrew
    ? {
      title: 'מחיקת תלמיד',
      message: `האם למחוק את ${studentName} ואת כל הנתונים המשויכים אליו?`,
      cancel: 'ביטול',
      delete: saving ? 'מוחק...' : 'מחיקה סופית',
    }
    : {
      title: 'حذف الطالب',
      message: `هل تريد حذف ${studentName} وكل بياناته التابعة؟`,
      cancel: 'إلغاء',
      delete: saving ? 'جار الحذف...' : 'حذف نهائي',
    };
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.confirmCard}>
          <View style={styles.confirmIcon}>
            <FontAwesome name="trash" size={20} color={adminColors.danger} />
          </View>
          <Text style={styles.modalTitle}>{copy.title}</Text>
          <Text style={styles.confirmText}>
            {copy.message}
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{copy.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSave, styles.modalDelete]} onPress={onConfirm} disabled={saving}>
              <Text style={styles.modalSaveText}>{copy.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SubjectModal({ visible, subject, saving, onChange, onClose, onSave }) {
  const tr = useAdminTranslator();
  if (!subject) return null;
  const setField = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  const categories = [
    { value: 'core', label: 'أساسية' },
    { value: 'stem', label: 'علمية' },
    { value: 'humanities', label: 'إنسانية' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tr('إضافة مادة جديدة')}</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <FontAwesome name="times" size={16} color={adminColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formRow}>
            <EditInput label="اسم المادة بالعربية" value={subject.nameAr} onChangeText={(value) => setField('nameAr', value)} />
            <EditInput label="اسم المادة بالعبرية" value={subject.nameHe} onChangeText={(value) => setField('nameHe', value)} />
          </View>
          <View style={styles.formRow}>
            <EditInput label="اسم المادة بالإنجليزية" value={subject.nameEn} onChangeText={(value) => setField('nameEn', value)} />
            <EditInput label="الكود" value={subject.code} onChangeText={(value) => setField('code', value)} placeholder="math / physics" />
          </View>

          <Text style={styles.modalLabel}>{tr('التصنيف')}</Text>
          <View style={styles.choiceRow}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[styles.choiceChip, subject.category === category.value && styles.choiceChipActive]}
                onPress={() => setField('category', category.value)}
              >
                <Text style={[styles.choiceText, subject.category === category.value && styles.choiceTextActive]}>{tr(category.label)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <EditInput label="مستوى النقاط 1-30" value={subject.pointLevel} onChangeText={(value) => setField('pointLevel', value.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <EditInput label="وصف قصير" value={subject.descriptionAr} onChangeText={(value) => setField('descriptionAr', value)} multiline />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{tr('إلغاء')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={onSave} disabled={saving}>
              <Text style={styles.modalSaveText}>{tr(saving ? 'جار الحفظ...' : 'إضافة المادة')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InstitutionModal({ visible, institution, saving, onChange, onClose, onSave }) {
  const tr = useAdminTranslator();
  if (!institution) return null;
  const setField = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  const isCreate = institution.mode === 'create';
  const types = [
    { value: 'university', label: 'جامعة' },
    { value: 'college', label: 'كلية' },
    { value: 'institute', label: 'معهد' },
    { value: 'other', label: 'أخرى' },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr(isCreate ? 'إضافة مؤسسة جديدة' : 'تعديل المؤسسة')}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={onClose}>
                <FontAwesome name="times" size={16} color={adminColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <EditInput label="اسم المؤسسة بالعربية" value={institution.name_ar} onChangeText={(value) => setField('name_ar', value)} />
              <EditInput label="שם המוסד בעברית" value={institution.name_he} onChangeText={(value) => setField('name_he', value)} />
            </View>
            <EditInput label="Name in English" value={institution.name_en} onChangeText={(value) => setField('name_en', value)} />

            <Text style={styles.modalLabel}>{tr('النوع')}</Text>
            <View style={styles.choiceRow}>
              {types.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.choiceChip, institution.type === type.value && styles.choiceChipActive]}
                  onPress={() => setField('type', type.value)}
                >
                  <Text style={[styles.choiceText, institution.type === type.value && styles.choiceTextActive]}>{tr(type.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <EditInput label="رابط الموقع" value={institution.website} onChangeText={(value) => setField('website', value)} placeholder="https://example.ac.il" />

            <Text style={styles.modalLabel}>{tr('الحالة')}</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity style={[styles.choiceChip, institution.is_active && styles.choiceChipActive]} onPress={() => setField('is_active', true)}>
                <Text style={[styles.choiceText, institution.is_active && styles.choiceTextActive]}>{tr('نشطة')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.choiceChip, !institution.is_active && styles.choiceChipActive]} onPress={() => setField('is_active', false)}>
                <Text style={[styles.choiceText, !institution.is_active && styles.choiceTextActive]}>{tr('معطلة')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
                <Text style={styles.modalCancelText}>{tr('إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={onSave} disabled={saving}>
                <Text style={styles.modalSaveText}>{tr(saving ? 'جار الحفظ...' : isCreate ? 'إضافة المؤسسة' : 'حفظ التعديلات')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ConfirmInstitutionDeleteModal({ visible, institution, saving, onClose, onConfirm }) {
  const tr = useAdminTranslator();
  if (!institution) return null;
  const name = institution.name_ar || institution.name_he || institution.name_en || 'هذه المؤسسة';
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.confirmCard}>
          <View style={styles.confirmIcon}>
            <FontAwesome name="trash" size={20} color={adminColors.danger} />
          </View>
          <Text style={styles.modalTitle}>{tr('حذف المؤسسة')}</Text>
          <Text style={styles.confirmText}>
            {tr('هل تريد حذف')} {name}? {tr('سيتم حذف البرامج والروابط التابعة لها إذا كانت مرتبطة بقاعدة البيانات.')}
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.modalCancelText}>{tr('إلغاء')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSave, styles.modalDelete]} onPress={onConfirm} disabled={saving}>
              <Text style={styles.modalSaveText}>{tr(saving ? 'جار الحذف...' : 'حذف نهائي')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditInput({ label, ...props }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.editField}>
      <Text style={styles.modalLabel}>{tr(label)}</Text>
      <TextInput
        {...props}
        placeholder={tr(props.placeholder)}
        style={styles.editInput}
        placeholderTextColor={adminColors.muted}
        textAlign="right"
        writingDirection="rtl"
      />
    </View>
  );
}

function SchoolAutocomplete({ value, onChangeText, onSelect }) {
  const tr = useAdminTranslator();
  const [focused, setFocused] = useState(false);
  const [dbSchools, setDbSchools] = useState([]);
  const query = String(value || '').trim().toLowerCase();

  useEffect(() => {
    let mounted = true;
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name_ar, name_he, city_ar, city_he, region')
        .order('name_ar', { ascending: true })
        .limit(500);

      if (!mounted || error) return;
      setDbSchools(data || []);
    };

    loadSchools();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => {
    const fromDatabase = dbSchools.map((school) => {
      const schoolName = String(school?.name_ar || school?.name_he || '').trim();
      const city = String(school?.city_ar || school?.city_he || school?.region || '').trim();
      return {
        schoolId: school?.id ? String(school.id) : '',
        schoolName,
        city,
        label: city ? `${schoolName} - ${city}` : schoolName,
      };
    }).filter((school) => school.schoolName);

    const fromFallback = israeliSchools.map((school) => {
      const schoolName = String(school?.name || '').trim();
      const city = String(school?.city || '').trim();
      return {
        schoolId: '',
        schoolName,
        city,
        label: city ? `${schoolName} - ${city}` : schoolName,
      };
    }).filter((school) => school.schoolName);

    const seen = new Set();
    const mapped = [...fromDatabase, ...fromFallback].filter((school) => {
      const key = `${school.schoolId || school.schoolName}::${school.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!query) return mapped.slice(0, 12);
    return mapped
      .filter((school) =>
        school.schoolName.toLowerCase().includes(query) ||
        school.city.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [dbSchools, query]);

  return (
    <View style={[styles.editField, focused && !!value && options.length > 0 && styles.autocompleteFieldOpen]}>
      <Text style={styles.modalLabel}>{tr('المدرسة')}</Text>
      <View style={styles.autocompleteWrap}>
        <TextInput
          value={value}
          onChangeText={(text) => {
            setFocused(true);
            onChangeText(text);
          }}
          onFocus={() => setFocused(true)}
          style={styles.editInput}
          placeholder={tr('اكتب اسم المدرسة...')}
          placeholderTextColor={adminColors.muted}
          textAlign="right"
          writingDirection="rtl"
        />
        {focused && !!value && options.length > 0 && (
          <ScrollView style={styles.schoolResults} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {options.map((school, index) => (
              <TouchableOpacity
                key={`${school.label}-${index}`}
                style={styles.schoolOption}
                onPress={() => {
                  onSelect(school);
                  setFocused(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.schoolOptionTitle} numberOfLines={1}>{school.schoolName}</Text>
                {!!school.city && <Text style={styles.schoolOptionSub} numberOfLines={1}>{school.city}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function GamesCards({ rows, savingGameKey, onToggleVisibility }) {
  const tr = useAdminTranslator();
  const { isHebrew } = useAdminLocale();
  if (!rows.length) return <EmptyState title="لا توجد ألعاب" icon="gamepad" />;
  return (
    <View style={styles.gamesGrid}>
      {rows.map((game) => {
        const isDisabled = game.is_active === false || game.is_visible === false;
        const isSaving = savingGameKey === game.key;
        const gameText = getAdminGameText(game, isHebrew);
        return (
          <View
            key={game.key}
            style={[
              styles.gameCard,
              { borderColor: isDisabled ? '#FECACA' : game.accentSoft || adminColors.border },
              isDisabled && styles.gameCardDisabled,
            ]}
          >
            <View style={[styles.gameIcon, { backgroundColor: isDisabled ? '#94A3B8' : game.buttonBg || adminColors.primary2 }]}>
              <FontAwesome name={game.icon || 'gamepad'} size={24} color="#fff" />
            </View>
            <Text style={styles.gameTitle}>{gameText.title}</Text>
            <Text style={styles.gameDesc}>{gameText.description}</Text>
            <StatusBadge status={isDisabled ? (isHebrew ? 'מושבת' : 'معطلة') : (isHebrew ? 'פעילה' : 'مفعلة')} />
            <View style={styles.actions}>
              <Actions labels={isHebrew ? ['ניהול משחק', 'סטטיסטיקות'] : ['إدارة اللعبة', 'الإحصائيات']} />
              <TouchableOpacity
                style={[styles.actionBtn, isDisabled ? styles.actionBtnPrimary : styles.actionBtnDanger]}
                onPress={() => onToggleVisibility?.(game)}
                disabled={isSaving}
              >
                <Text style={[styles.actionText, isDisabled ? styles.actionTextPrimary : styles.actionTextDanger]}>
                  {isHebrew
                    ? (isSaving ? 'שומר...' : isDisabled ? 'הפעלה' : 'השבתה')
                    : tr(isSaving ? 'جار الحفظ...' : isDisabled ? 'تفعيل' : 'تعطيل')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function AbilitiesSection() {
  const tr = useAdminTranslator();
  const abilities = ['قدرة تحليلية', 'قدرة لغوية', 'قدرة علمية', 'قدرة طبية', 'قدرة منطقية', 'سرعة الاستجابة', 'دقة الإجابة', 'الاستمرارية وعدم التخطي'];
  return (
    <AdminCard title="إدارة القدرات" subtitle="TODO: ربط القدرات بجدول مستقل إذا لم يكن موجودًا">
      <View style={styles.pillGrid}>
        {abilities.map((ability) => <Text key={ability} style={styles.pill}>{tr(ability)}</Text>)}
      </View>
    </AdminCard>
  );
}

function PermissionsSection() {
  const tr = useAdminTranslator();
  const permissions = ['إدارة المستخدمين', 'إدارة المدارس', 'إدارة الأسئلة', 'عرض كل التقارير', 'تصدير البيانات', 'تغيير الصلاحيات', 'تعطيل الحسابات'];
  return (
    <AdminCard title="مصفوفة الصلاحيات" subtitle="تحذير: الصلاحيات الحساسة تحتاج confirmation قبل الحفظ">
      <View style={styles.pillGrid}>
        {['Admin', 'School Manager', 'Student'].map((role) => (
          <View key={role} style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>{role}</Text>
            {permissions.map((permission) => (
              <View key={`${role}-${permission}`} style={styles.permissionRow}>
                <FontAwesome name={role === 'Student' && permission !== 'عرض كل التقارير' ? 'circle-o' : 'check-square'} size={14} color={adminColors.primary2} />
                <Text style={styles.permissionText}>{tr(permission)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </AdminCard>
  );
}

function ReportsCharts({ rows }) {
  const tr = useAdminTranslator();
  const data = rows.slice(0, 8).map((row, index) => ({
    label: row.subject_id ? `${tr('مادة')} ${index + 1}` : `${tr('طالب')} ${index + 1}`,
    value: Math.round(Number(row.ability_estimate || row.score || 0) * 10) || index + 4,
  }));
  return <ChartCard title="ملخص بصري للنتائج" data={data} tone={adminColors.primary2} />;
}

function SettingsContent({ rows, columns }) {
  const tr = useAdminTranslator();
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.settingsGrid}>
        {['اسم النظام', 'اللغة الافتراضية', 'عدد الأسئلة الافتراضي', 'وقت السؤال', 'تفعيل الألعاب', 'الاختبار الشامل', 'إعدادات الخصوصية', 'النسخ الاحتياطي'].map((item) => (
          <View key={item} style={styles.settingTile}>
            <Text style={styles.settingTitle}>{tr(item)}</Text>
            <Text style={styles.settingSub}>{tr('ربط مع جدول system_settings')}</Text>
          </View>
        ))}
      </View>
      <AdminTable columns={columns} rows={rows} emptyText="لا توجد أحداث نظام بعد" />
    </View>
  );
}

function fullName(row) {
  return row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ar', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  } catch (_error) {
    return String(value).slice(0, 10);
  }
}

const styles = StyleSheet.create({
  primaryButton: { height: 42, borderRadius: 14, backgroundColor: adminColors.primary2, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  inlineAddButton: { minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: '#BBD0FF', backgroundColor: adminColors.softBlue, padding: 12, marginBottom: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  inlineAddIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: adminColors.primary2, alignItems: 'center', justifyContent: 'center' },
  inlineAddTextWrap: { flex: 1, alignItems: 'flex-end' },
  inlineAddTitle: { color: adminColors.primary, fontWeight: '900', fontSize: 15, textAlign: 'right' },
  inlineAddSub: { marginTop: 2, color: adminColors.muted, fontWeight: '800', fontSize: 12, textAlign: 'right' },
  cellText: { color: adminColors.text, fontWeight: '700', textAlign: 'right', fontSize: 12 },
  cellStrong: { fontWeight: '900' },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  actionBtn: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: adminColors.bg, borderWidth: 1, borderColor: adminColors.border },
  actionBtnPrimary: { backgroundColor: adminColors.primary2, borderColor: adminColors.primary2 },
  actionBtnDanger: { backgroundColor: adminColors.softRed, borderColor: '#FECACA' },
  actionText: { color: adminColors.text, fontWeight: '900', fontSize: 11 },
  actionTextPrimary: { color: '#fff' },
  actionTextDanger: { color: adminColors.danger },
  modalLayer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,42,104,0.42)' },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '92%', borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: adminColors.border, padding: 16 },
  confirmCard: { width: '100%', maxWidth: 420, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: adminColors.border, padding: 18, alignItems: 'flex-end' },
  confirmIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: adminColors.softRed, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmText: { marginTop: 8, marginBottom: 12, color: adminColors.muted, fontWeight: '800', lineHeight: 22, textAlign: 'right' },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { color: adminColors.text, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  modalClose: { width: 38, height: 38, borderRadius: 13, backgroundColor: adminColors.bg, borderWidth: 1, borderColor: adminColors.border, alignItems: 'center', justifyContent: 'center' },
  formRow: { flexDirection: 'row-reverse', gap: 10 },
  editField: { flex: 1, gap: 6, marginBottom: 10 },
  autocompleteFieldOpen: { marginBottom: 166 },
  modalLabel: { color: adminColors.text, fontWeight: '900', fontSize: 12, textAlign: 'right' },
  editInput: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, color: adminColors.text, paddingHorizontal: 12, fontWeight: '800' },
  autocompleteWrap: { position: 'relative', zIndex: 50 },
  schoolResults: { position: 'absolute', top: 50, left: 0, right: 0, maxHeight: 150, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', zIndex: 100, elevation: 12, shadowColor: '#102A68', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  schoolOption: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: adminColors.border, alignItems: 'flex-end', justifyContent: 'center' },
  schoolOptionTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  schoolOptionSub: { marginTop: 2, color: adminColors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  choiceRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 7, marginBottom: 10 },
  choiceChip: { minWidth: 48, alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff' },
  choiceChipActive: { backgroundColor: adminColors.softBlue, borderColor: '#BBD0FF' },
  choiceText: { color: adminColors.muted, fontWeight: '900' },
  choiceTextActive: { color: adminColors.primary },
  modalActions: { flexDirection: 'row-reverse', gap: 10, justifyContent: 'flex-start', marginTop: 4 },
  modalSave: { minHeight: 42, borderRadius: 14, backgroundColor: adminColors.primary2, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  modalDelete: { backgroundColor: adminColors.danger },
  modalSaveText: { color: '#fff', fontWeight: '900' },
  modalCancel: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: adminColors.text, fontWeight: '900' },
  gamesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  gameCard: { flexGrow: 1, flexBasis: 230, borderRadius: 20, borderWidth: 1, padding: 14, backgroundColor: '#fff', alignItems: 'flex-end' },
  gameCardDisabled: { backgroundColor: '#FFF7F7' },
  gameIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gameTitle: { marginTop: 12, color: adminColors.text, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  gameDesc: { marginTop: 6, color: adminColors.muted, lineHeight: 19, fontWeight: '700', textAlign: 'right' },
  pillGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: adminColors.softBlue, color: adminColors.primary, fontWeight: '900' },
  permissionCard: { flexGrow: 1, flexBasis: 240, borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', padding: 14 },
  permissionTitle: { color: adminColors.text, fontSize: 16, fontWeight: '900', textAlign: 'right', marginBottom: 10 },
  permissionRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', marginTop: 8 },
  permissionText: { color: adminColors.text, fontWeight: '800', textAlign: 'right' },
  settingsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  settingTile: { flexGrow: 1, flexBasis: 220, borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, padding: 14 },
  settingTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  settingSub: { marginTop: 4, color: adminColors.muted, fontWeight: '700', fontSize: 12, textAlign: 'right' },
});
