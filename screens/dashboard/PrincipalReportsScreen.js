import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { supabase } from '../../config/supabase';
import { PrincipalTabs } from './PrincipalDashboardScreen';
import { exportPrincipalStudentsCsv, localizedPrincipalSchoolName } from '../../services/principalExperienceService';
import { getPrincipalEnhancedStudentRows } from '../../services/principalAnalyticsService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF' };

export default function PrincipalReportsScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState([]);
  const [principal, setPrincipal] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const result = await getPrincipalEnhancedStudentRows();
      const schoolResult = result.principal?.school_id
        ? await supabase.from('schools').select('id, name_ar, name_he, name_en').eq('id', result.principal.school_id).maybeSingle()
        : { data: null };
      if (!mounted) return;
      setPrincipal(result.principal);
      setSchool(schoolResult.data || null);
      setAnalytics(result.analytics);
      setRows(result.rows.filter((row) => row.latestSession || row.average_score > 0));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const result = await exportPrincipalStudentsCsv();
      if (typeof window !== 'undefined') {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{t('common.loadingData')}</Text></View>;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('reports.title')}</Text>
        <Text style={styles.subtitle}>{localizedPrincipalSchoolName({ ...principal, school }, i18n.language, t('dashboard.fallbackSchool'))}</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportCsv} disabled={exporting}>
          <FontAwesome name="download" size={14} color="#fff" />
          <Text style={styles.exportText}>{exporting ? t('reports.exporting') : t('reports.exportCsv')}</Text>
        </TouchableOpacity>
        {analytics ? (
          <View style={styles.reportTypes}>
            {buildLocalizedReportCards(analytics, t, i18n.language).map((report) => (
              <View key={report.key} style={styles.reportTypeCard}>
                <Text style={styles.reportTypeTitle}>{report.title}</Text>
                <Text style={styles.reportTypeDescription}>{report.description}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {!rows.length ? (
          <View style={styles.empty}><FontAwesome name="file-text-o" size={26} color={colors.secondary} /><Text style={styles.emptyText}>{t('common.noData')}</Text></View>
        ) : rows.map((row) => (
          <TouchableOpacity key={row.id} style={styles.card} onPress={() => navigateTo?.('principalStudentDetails', { studentId: row.id })}>
            <View style={styles.icon}><FontAwesome name="file-text-o" size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{row.full_name}</Text>
              <Text style={styles.meta}>{localizedReportClassLabel(row, i18n.language)} | {t('analytics.performance')} {row.average_score}% | {localizedReportMajor(row, i18n.language, t)}</Text>
              <Text style={styles.meta}>{localizedReportPersonality(row, i18n.language, t)} | {localizedReportGameSupport(row, i18n.language, t)} | {localizedReportPotential(row, i18n.language, t)}</Text>
            </View>
            <FontAwesome name="chevron-left" size={13} color={colors.secondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <PrincipalTabs active="reports" navigateTo={navigateTo} />
    </View>
  );
}

function buildReportCards(analytics, t, language) {
  const isHe = String(language || '').startsWith('he');
  const tr = (key, ar, he, options = {}) => t(key, { ...options, defaultValue: isHe ? he : ar });
  const overview = analytics?.overview || {};
  const topCareer = analytics?.career?.topCareers?.[0];
  const topMajor = isHe
    ? DEGREE_HE[topCareer?.key] || DEGREE_HE[overview.topMajor] || overview.topMajor || t('common.noData')
    : overview.topMajor || t('common.noData');
  return [
    {
      key: 'school',
      title: tr('reports.types.school.title', 'تقرير ملخص المدرسة', 'דוח סיכום בית ספר'),
      description: tr('reports.types.school.description', 'ملخص {{students}} طالب ومتوسط أداء {{performance}}%', 'סיכום של {{students}} תלמידים וביצועים ממוצעים {{performance}}%', {
        students: overview.totalStudents || 0,
        performance: overview.averagePerformance || 0,
      }),
    },
    {
      key: 'class',
      title: tr('reports.types.class.title', 'تقرير الصفوف', 'דוח כיתות'),
      description: tr('reports.types.class.description', 'مقارنة الصفوف والشعب حسب الأداء والإكمال والألعاب', 'השוואת כיתות וקבוצות לפי ביצועים, השלמה ומשחקים'),
    },
    {
      key: 'student',
      title: tr('reports.types.student.title', 'تقرير طالب', 'דוח תלמיד'),
      description: tr('reports.types.student.description', 'تقرير طالب مفصل مع التوصيات والأسباب', 'דוח תלמיד מפורט עם המלצות וסיבות'),
    },
    {
      key: 'career',
      title: tr('reports.types.career.title', 'تقرير اتجاهات التخصصات', 'דוח מגמות תחומים'),
      description: tr('reports.types.career.description', 'أكثر تخصص ظاهر: {{major}}', 'התחום הבולט ביותר: {{major}}', { major: topMajor }),
    },
    {
      key: 'personality',
      title: tr('reports.types.personality.title', 'تقرير الشخصيات والاهتمامات', 'דוח אישיות ותחומי עניין'),
      description: tr('reports.types.personality.description', 'تحليل الشخصيات والاهتمامات وربطها بالتخصصات', 'ניתוח אישיות ותחומי עניין והקשר שלהם לתחומים'),
    },
    {
      key: 'games',
      title: tr('reports.types.games.title', 'تقرير إشارات الألعاب', 'דוח אותות משחקים'),
      description: tr('reports.types.games.description', 'كيف دعمت الألعاب التوصيات بدون أن تستبدل الاختبار', 'איך המשחקים תמכו בהמלצות בלי להחליף את המבחן'),
    },
  ];
}

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

function localizedMajor(row, language, t) {
  if (!String(language || '').startsWith('he')) return row.top_major || t('common.noData');
  return DEGREE_HE[row.top_major_key] || row.raw?.degreeRecommendations?.[0]?.name_he || row.top_major || t('common.noData');
}

function localizedClassLabel(row, language) {
  if (!String(language || '').startsWith('he')) return row.class_label;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${row.grade || '-'} | ${sections[row.class_section] || row.class_section || '-'}`;
}

function localizedPersonality(row, language, t) {
  if (!String(language || '').startsWith('he')) return row.personality_type || t('common.notCompleted');
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
  return map[row.personality_type] || row.personality_type || t('common.notCompleted');
}

function localizedPotential(row, language, t) {
  if (!String(language || '').startsWith('he')) return row.learning_potential_level || t('common.noData');
  const map = {
    high: 'פוטנציאל גבוה',
    medium: 'פוטנציאל בינוני',
    support: 'דורש מעקב',
  };
  return map[row.learning_potential_key] || row.learning_potential_level || t('common.noData');
}

function localizedGameSupport(row, language, t) {
  if (!String(language || '').startsWith('he')) return row.game_support_level || t('common.noData');
  const map = {
    strong: 'תמיכת משחקים חזקה',
    medium: 'תמיכת משחקים בינונית',
    weak: 'תמיכת משחקים קלה',
  };
  return map[row.game_support_key] || row.game_support_level || t('common.noData');
}

const REPORT_DEGREE_HE = {
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
  SE_BSC: 'הנדסת תוכנה',
  AI_BSC: 'בינה מלאכותית',
  CYBER_BSC: 'סייבר',
  BIO_BSC: 'ביולוגיה',
  CHEM_BSC: 'כימיה',
  PSY_BA: 'פסיכולוגיה',
  SOC_BA: 'סוציולוגיה',
};

const REPORT_DEGREE_AR_TO_HE = [
  ['الهندسة الكهربائية', 'הנדסת חשמל'],
  ['هندسة الكهرباء', 'הנדסת חשמל'],
  ['علوم الحاسوب', 'מדעי המחשב'],
  ['الهندسة المدنية', 'הנדסה אזרחית'],
  ['هندسة مدنية', 'הנדסה אזרחית'],
  ['تمريض', 'סיעוד'],
  ['هندسة معمارية', 'אדריכלות'],
  ['الهندسة الميكانيكية', 'הנדסת מכונות'],
  ['علوم البيانات', 'מדעי הנתונים'],
  ['تربية', 'חינוך'],
  ['فيزياء', 'פיזיקה'],
  ['بيوتكنولوجيا', 'ביוטכנולוגיה'],
  ['قانون', 'משפטים'],
  ['إعلام', 'תקשורת'],
  ['طب', 'רפואה'],
  ['مختبرات طبية', 'מדעי המעבדה הרפואית'],
  ['لغة عربية', 'ערבית'],
  ['ترجمة', 'תרגום'],
  ['لا توجد بيانات كافية', 'אין מספיק נתונים'],
];

function isReportHebrew(language) {
  return String(language || '').startsWith('he');
}

function translateReportArabicText(value, pairs, language) {
  if (!isReportHebrew(language)) return value;
  const text = String(value || '');
  const match = pairs.find(([ar]) => text.includes(ar));
  return match ? match[1] : text;
}

function localizedReportDegreeValue(item, language, t) {
  if (!isReportHebrew(language)) return item?.label || item?.topMajor || item || t('common.noData');
  const key = String(item?.key || item?.code || item?.degree_code || '').trim();
  return REPORT_DEGREE_HE[key] || translateReportArabicText(item?.label || item?.topMajor || item, REPORT_DEGREE_AR_TO_HE, language) || t('common.noData');
}

function buildLocalizedReportCards(analytics, t, language) {
  const isHe = isReportHebrew(language);
  const overview = analytics?.overview || {};
  const topCareer = analytics?.career?.topCareers?.[0];
  const topMajor = localizedReportDegreeValue({ key: topCareer?.key || overview.topMajor, label: overview.topMajor }, language, t);
  const students = overview.totalStudents || 0;
  const performance = overview.averagePerformance || 0;

  return [
    {
      key: 'school',
      title: isHe ? 'דוח סיכום בית ספר' : 'تقرير ملخص المدرسة',
      description: isHe ? `סיכום של ${students} תלמידים וביצועים ממוצעים ${performance}%` : `ملخص ${students} طالب ومتوسط أداء ${performance}%`,
    },
    {
      key: 'class',
      title: isHe ? 'דוח כיתות' : 'تقرير الصفوف',
      description: isHe ? 'השוואת כיתות וקבוצות לפי ביצועים, השלמה ומשחקים' : 'مقارنة الصفوف والشعب حسب الأداء والإكمال والألعاب',
    },
    {
      key: 'student',
      title: isHe ? 'דוח תלמיד' : 'تقرير طالب',
      description: isHe ? 'דוח תלמיד מפורט עם המלצות וסיבות' : 'تقرير طالب مفصل مع التوصيات والأسباب',
    },
    {
      key: 'career',
      title: isHe ? 'דוח מגמות תחומים' : 'تقرير اتجاهات التخصصات',
      description: isHe ? `התחום הבולט ביותר: ${topMajor}` : `أكثر تخصص ظاهر: ${topMajor}`,
    },
    {
      key: 'personality',
      title: isHe ? 'דוח אישיות ותחומי עניין' : 'تقرير الشخصيات والاهتمامات',
      description: isHe ? 'ניתוח אישיות ותחומי עניין והקשר שלהם לתחומים' : 'تحليل الشخصيات والاهتمامات وربطها بالتخصصات',
    },
    {
      key: 'games',
      title: isHe ? 'דוח אותות משחקים' : 'تقرير إشارات الألعاب',
      description: isHe ? 'איך המשחקים תמכו בהמלצות בלי להחליף את המבחן' : 'كيف دعمت الألعاب التوصيات بدون أن تستبدل الاختبار',
    },
  ];
}

function localizedReportMajor(row, language, t) {
  return localizedReportDegreeValue({ key: row.top_major_key, label: row.top_major }, language, t);
}

function localizedReportClassLabel(row, language) {
  if (!isReportHebrew(language)) return row.class_label;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${row.grade || '-'} | ${sections[row.class_section] || row.class_section || '-'}`;
}

function localizedReportPersonality(row, language, t) {
  if (!isReportHebrew(language)) return row.personality_type || t('common.notCompleted');
  const byKey = {
    analytical: 'אנליטי',
    social: 'חברתי',
    creative: 'יצירתי',
    disciplined: 'ממושמע',
  };
  const pairs = [
    ['تحليلي', 'אנליטי'],
    ['اجتماعي', 'חברתי'],
    ['إبداعي', 'יצירתי'],
    ['منضبط', 'ממושמע'],
    ['غير مكتمل', t('common.notCompleted')],
  ];
  return byKey[row.personality_key] || translateReportArabicText(row.personality_type, pairs, language) || t('common.notCompleted');
}

function localizedReportPotential(row, language, t) {
  if (!isReportHebrew(language)) return row.learning_potential_level || t('common.noData');
  const map = {
    high: 'פוטנציאל גבוה',
    medium: 'פוטנציאל בינוני',
    support: 'דורש מעקב',
  };
  const pairs = [
    ['إمكانات عالية', 'פוטנציאל גבוה'],
    ['إمكانات متوسطة', 'פוטנציאל בינוני'],
    ['يحتاج متابعة', 'דורש מעקב'],
  ];
  return map[row.learning_potential_key] || translateReportArabicText(row.learning_potential_level, pairs, language) || t('common.noData');
}

function localizedReportGameSupport(row, language, t) {
  if (!isReportHebrew(language)) return row.game_support_level || t('common.noData');
  const map = {
    strong: 'תמיכת משחקים חזקה',
    medium: 'תמיכת משחקים בינונית',
    weak: 'תמיכת משחקים קלה',
  };
  const pairs = [
    ['دعم قوي من الألعاب', 'תמיכת משחקים חזקה'],
    ['دعم متوسط من الألعاب', 'תמיכת משחקים בינונית'],
    ['دعم خفيف من الألعاب', 'תמיכת משחקים קלה'],
  ];
  return map[row.game_support_key] || translateReportArabicText(row.game_support_level, pairs, language) || t('common.noData');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  exportButton: { marginTop: 14, minHeight: 44, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportText: { color: '#fff', fontWeight: '900' },
  reportTypes: { marginTop: 14, gap: 10 },
  reportTypeCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 13, alignItems: 'flex-end' },
  reportTypeTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  reportTypeDescription: { marginTop: 5, color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right', lineHeight: 18 },
  empty: { marginTop: 18, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' },
  emptyText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  icon: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  meta: { marginTop: 4, color: colors.secondary, fontWeight: '800', fontSize: 12, textAlign: 'right' },
});
