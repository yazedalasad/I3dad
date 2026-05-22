import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getPrincipalEnhancedStudentRows } from '../../services/principalAnalyticsService';
import { localizedPrincipalSchoolName } from '../../services/principalExperienceService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', warning: '#F59E0B', danger: '#E74C3C' };
const grades = ['all', '9', '10', '11', '12'];
const sections = ['all', 'alef', 'bet', 'gimel', 'dalet'];
const activeStates = ['all', 'active', 'inactive'];
const languages = ['all', 'ar', 'he', 'en'];
const performanceLevels = ['all', 'high', 'medium', 'support'];

const DEGREE_HE = {
  EE_BSC: 'הנדסת חשמל',
  electrical_engineering: 'הנדסת חשמל',
  CS_BSC: 'מדעי המחשב',
  computer_science: 'מדעי המחשב',
  CE_BSC: 'הנדסה אזרחית',
  civil_engineering: 'הנדסה אזרחית',
  NURS_BN: 'סיעוד',
  nursing: 'סיעוד',
  ARCH_BARCH: 'אדריכלות',
  architecture: 'אדריכלות',
  ME_BSC: 'הנדסת מכונות',
  mechanical_engineering: 'הנדסת מכונות',
  DATA_BSC: 'מדעי הנתונים',
  data_science: 'מדעי הנתונים',
  EDU_BED: 'חינוך',
  education: 'חינוך',
  PHYS_BSC: 'פיזיקה',
  physics: 'פיזיקה',
  BIOTECH_BSC: 'ביוטכנולוגיה',
  biotechnology: 'ביוטכנולוגיה',
  LAW_LLB: 'משפטים',
  law: 'משפטים',
  COM_BA: 'תקשורת',
  media: 'תקשורת',
  medicine: 'רפואה',
  medical_laboratory_science: 'מדעי המעבדה הרפואית',
  arabic_language: 'ערבית',
  translation: 'תרגום',
};

const AR_MAJOR_TO_HE = [
  ['الهندسة الكهربائية', 'הנדסת חשמל'],
  ['هندسة الكهرباء', 'הנדסת חשמל'],
  ['علوم الحاسوب', 'מדעי המחשב'],
  ['الهندسة المدنية', 'הנדסה אזרחית'],
  ['هندسة مدنية', 'הנדסה אזרחית'],
  ['الهندسة الميكانيكية', 'הנדסת מכונות'],
  ['هندسة ميكانيكية', 'הנדסת מכונות'],
  ['هندسة معمارية', 'אדריכלות'],
  ['علوم البيانات', 'מדעי הנתונים'],
  ['تمريض', 'סיעוד'],
  ['مختبرات طبية', 'מדעי המעבדה הרפואית'],
  ['طب', 'רפואה'],
  ['تربية', 'חינוך'],
  ['فيزياء', 'פיזיקה'],
  ['بيوتكنولوجيا', 'ביוטכנולוגיה'],
  ['قانون', 'משפטים'],
  ['إعلام واتصال', 'תקשורת'],
  ['إعلام', 'תקשורת'],
  ['لغة عربية', 'ערבית'],
  ['ترجمة', 'תרגום'],
];

export default function PrincipalStudentsScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [principal, setPrincipal] = useState(null);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [section, setSection] = useState('all');
  const [active, setActive] = useState('all');
  const [language, setLanguage] = useState('all');
  const [performance, setPerformance] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPrincipalEnhancedStudentRows();
      setPrincipal(result.principal);
      setRows(result.rows);
    } catch (err) {
      setError(err?.message || t('students.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((student) => {
      if (q) {
        const haystack = `${student.full_name} ${student.student_id || ''} ${student.email || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (grade !== 'all' && String(student.grade) !== grade) return false;
      if (section !== 'all' && String(student.class_section || '') !== section) return false;
      if (active !== 'all' && (student.is_active === false ? 'inactive' : 'active') !== active) return false;
      if (language !== 'all' && String(student.preferred_language || 'ar') !== language) return false;
      if (performance === 'high' && Number(student.average_score || 0) < 80) return false;
      if (performance === 'medium' && (Number(student.average_score || 0) < 60 || Number(student.average_score || 0) >= 80)) return false;
      if (performance === 'support' && Number(student.average_score || 0) >= 60) return false;
      return true;
    });
  }, [active, grade, language, performance, query, rows, section]);

  if (loading) return <Center text={t('students.loading')} />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Header navigateTo={navigateTo} title={t('students.title')} subtitle={localizedPrincipalSchoolName(principal, i18n.language, t('dashboard.fallbackSchool'))} />
        <View style={styles.searchCard}>
          <View style={styles.searchBox}>
            <FontAwesome name="search" size={15} color={colors.secondary} />
            <TextInput value={query} onChangeText={setQuery} placeholder={t('students.searchPlaceholder')} placeholderTextColor="#8EA0C8" style={styles.searchInput} textAlign="right" />
          </View>
          <ChipGroup items={grades.map((item) => ({ value: item, label: item === 'all' ? t('students.allGrades') : t('students.grade', { grade: item }) }))} value={grade} onChange={setGrade} />
          <ChipGroup items={sections.map((item) => ({ value: item, label: item === 'all' ? t('students.allSections') : item }))} value={section} onChange={setSection} />
          <ChipGroup items={activeStates.map((item) => ({ value: item, label: item === 'all' ? t('students.allStatuses') : item === 'active' ? t('common.active') : t('common.inactive') }))} value={active} onChange={setActive} />
          <ChipGroup items={languages.map((item) => ({ value: item, label: item === 'all' ? t('students.allLanguages') : item }))} value={language} onChange={setLanguage} />
          <ChipGroup items={performanceLevels.map((item) => ({ value: item, label: item === 'all' ? t('students.allLevels') : item === 'high' ? t('students.highPerformance') : item === 'medium' ? t('students.mediumPerformance') : t('students.needsFollowUp') }))} value={performance} onChange={setPerformance} />
        </View>
        {!rows.length ? <Empty text={t('students.noStudents')} /> : !filtered.length ? <Empty text={t('students.noMatches')} /> : filtered.map((student) => (
          <StudentCard key={student.id} student={student} navigateTo={navigateTo} />
        ))}
      </ScrollView>
      <PrincipalTabs active="students" navigateTo={navigateTo} />
    </View>
  );
}

function Header({ navigateTo, title, subtitle }) {
  const { t } = useTranslation('principal');
  return <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}><FontAwesome name="chevron-right" size={13} color={colors.primary} /><Text style={styles.backText}>{t('common.back')}</Text></TouchableOpacity><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>;
}

function ChipGroup({ items, value, onChange }) {
  return <View style={styles.chips}>{items.map((item) => <TouchableOpacity key={item.value} style={[styles.chip, value === item.value && styles.chipActive]} onPress={() => onChange(item.value)}><Text style={[styles.chipText, value === item.value && styles.chipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>;
}

function StudentCard({ student, navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const active = student.is_active !== false;
  const isHebrew = String(i18n.language || '').startsWith('he');
  const topMajor = localizedMajor(student, i18n.language, t);
  const personality = localizedPersonality(student, i18n.language, t);
  const potential = localizedPotential(student, i18n.language, t);
  const gameSupport = localizedGameSupport(student, i18n.language, t);
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentTop}>
        <View style={styles.avatar}><FontAwesome name="user" size={16} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.studentName}>{student.full_name}</Text>
          <Text style={styles.studentMeta}>{localizedClassLabel(student, i18n.language)} | {student.email || '-'}</Text>
          <Text style={styles.studentMeta}>{t('students.lastLogin', { date: student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleDateString(isHebrew ? 'he-IL' : 'ar') : '-' })}</Text>
        </View>
        <View style={[styles.statusChip, active ? styles.statusDone : styles.statusPending]}><Text style={[styles.statusText, active ? styles.statusDoneText : styles.statusPendingText]}>{active ? t('common.active') : t('common.inactive')}</Text></View>
      </View>
      <View style={styles.metricsRow}>
        <Metric label={t('students.averagePerformance')} value={`${student.average_score ?? 0}%`} />
        <Metric label={t('students.completed')} value={student.completed_tests ?? 0} />
        <Metric label={t('students.engagement')} value={student.engagement_score ?? '-'} />
      </View>
      <View style={styles.smartGrid}>
        <SmartBadge label={t('students.topMajor')} value={`${topMajor} ${student.top_major_score ? `${student.top_major_score}%` : ''}`} tone="blue" />
        <SmartBadge label={t('students.personality')} value={personality} tone="green" />
        <SmartBadge label={t('students.learningPotential')} value={potential} tone={student.learning_potential_key === 'support' ? 'warning' : 'green'} />
        <SmartBadge label={t('students.gameSupport')} value={gameSupport} tone={student.game_support_key === 'strong' ? 'green' : student.game_support_key === 'medium' ? 'blue' : 'gray'} />
      </View>
      <TouchableOpacity style={styles.detailsButton} onPress={() => navigateTo?.('principalStudentDetails', { studentId: student.id })}>
        <Text style={styles.detailsText}>{t('students.viewDetails')}</Text>
        <FontAwesome name="arrow-left" size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function localizedClassLabel(student, language = 'ar') {
  if (!String(language || '').startsWith('he')) return student.class_label || `${student.grade || '-'} / ${student.class_section || '-'}`;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${student.grade || '-'} | ${sections[student.class_section] || student.class_section || '-'}`;
}

function localizedMajor(student, language = 'ar', t) {
  const fallback = student.top_major || t('common.noData');
  if (!String(language || '').startsWith('he')) return fallback;
  const byKey = DEGREE_HE[student.top_major_key];
  if (byKey) return byKey;
  const match = AR_MAJOR_TO_HE.find(([ar]) => String(fallback).includes(ar));
  return match ? match[1] : fallback;
}

function localizedPersonality(student, language = 'ar', t) {
  const value = student.personality_type || t('common.notCompleted');
  if (!String(language || '').startsWith('he')) return value;
  const map = {
    analytical: 'אנליטי',
    social: 'חברתי',
    creative: 'יצירתי',
    disciplined: 'ממושמע',
    'تحليلي': 'אנליטי',
    'اجتماعي': 'חברתי',
    'إبداعي': 'יצירתי',
    'منضبط': 'ממושמע',
    'غير مكتمل': t('common.notCompleted'),
  };
  return map[student.personality_key] || map[value] || value;
}

function localizedPotential(student, language = 'ar', t) {
  const value = student.learning_potential_level || t('common.noData');
  if (!String(language || '').startsWith('he')) return value;
  const map = {
    high: 'פוטנציאל גבוה',
    medium: 'פוטנציאל בינוני',
    support: 'דורש מעקב',
  };
  return map[student.learning_potential_key] || value;
}

function localizedGameSupport(student, language = 'ar', t) {
  const value = student.game_support_level || t('common.noData');
  if (!String(language || '').startsWith('he')) return value;
  const map = {
    strong: 'תמיכת משחקים חזקה',
    medium: 'תמיכת משחקים בינונית',
    weak: 'תמיכת משחקים קלה',
  };
  return map[student.game_support_key] || value;
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function SmartBadge({ label, value, tone = 'blue' }) {
  const toneStyle = tone === 'green' ? styles.badgeGreen : tone === 'warning' ? styles.badgeWarning : tone === 'gray' ? styles.badgeGray : styles.badgeBlue;
  return (
    <View style={[styles.smartBadge, toneStyle]}>
      <Text style={styles.smartLabel}>{label}</Text>
      <Text style={styles.smartValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Empty({ text }) {
  return <View style={styles.empty}><FontAwesome name="users" size={24} color={colors.secondary} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function Center({ text }) {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{text}</Text></View>;
}

function ErrorState({ text, onRetry }) {
  const { t } = useTranslation('principal');
  return <View style={styles.center}><Text style={styles.errorTitle}>{t('common.loadErrorTitle')}</Text><Text style={styles.centerText}>{text}</Text><TouchableOpacity style={styles.retryButton} onPress={onRetry}><Text style={styles.retryText}>{t('common.retry')}</Text></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  retryButton: { marginTop: 16, borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  header: { alignItems: 'flex-end' },
  backButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  searchCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 13 },
  searchBox: { minHeight: 48, borderRadius: 16, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.dark, fontWeight: '800' },
  chips: { marginTop: 10, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.secondary, fontSize: 17, fontWeight: '900' },
  chipTextActive: { color: '#fff' },
  studentCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14 },
  studentTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  studentName: { color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  studentMeta: { marginTop: 3, color: colors.secondary, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  statusDone: { backgroundColor: '#EAFBF1' },
  statusPending: { backgroundColor: '#FFF7E8' },
  statusText: { fontSize: 16, fontWeight: '900' },
  statusDoneText: { color: '#16864A' },
  statusPendingText: { color: '#9A5B00' },
  metricsRow: { marginTop: 12, flexDirection: 'row-reverse', gap: 10 },
  metric: { flex: 1, borderRadius: 15, backgroundColor: '#F8FAFF', padding: 10, alignItems: 'flex-end' },
  metricValue: { color: colors.dark, fontWeight: '900' },
  metricLabel: { marginTop: 3, color: colors.secondary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  smartGrid: { marginTop: 10, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  smartBadge: { width: '48.5%', borderRadius: 14, padding: 10, alignItems: 'flex-end', borderWidth: 1 },
  badgeBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  badgeGreen: { backgroundColor: '#ECFDF5', borderColor: '#BBF7D0' },
  badgeWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  badgeGray: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  smartLabel: { color: colors.secondary, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  smartValue: { marginTop: 4, color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  detailsButton: { marginTop: 12, minHeight: 43, borderRadius: 15, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  detailsText: { color: '#fff', fontWeight: '900' },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
});
