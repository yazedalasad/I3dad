import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getPrincipalAnalyticsSummary } from '../../services/principalAnalyticsService';
import { localizedPrincipalSchoolName } from '../../services/principalExperienceService';

const colors = {
  bg: '#F6FAFF',
  primary: '#16834A',
  blue: '#2563EB',
  dark: '#0F2F2A',
  secondary: '#5D7186',
  border: '#DCEBE4',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  soft: '#EFFAF3',
};

const actionDefs = [
  { titleKey: 'dashboard.studentsAction', descriptionKey: 'dashboard.studentsActionDesc', icon: 'users', route: 'principalStudents' },
  { titleKey: 'dashboard.analyticsAction', descriptionKey: 'dashboard.analyticsActionDesc', icon: 'bar-chart', route: 'principalClassAnalytics' },
  { titleKey: 'dashboard.reportsAction', descriptionKey: 'dashboard.reportsActionDesc', icon: 'file-text-o', route: 'principalReports' },
  { titleKey: 'dashboard.activitiesAction', descriptionKey: 'dashboard.activitiesActionDesc', icon: 'calendar', route: 'principalActivities' },
];

const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

export default function PrincipalDashboardScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAnalytics(await withTimeout(getPrincipalAnalyticsSummary()));
    } catch (err) {
      setError(err?.message === 'timeout' ? t('dashboard.analyticsTimeout') : err?.message || t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Center text={t('dashboard.loading')} />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  const principal = analytics.principal;
  const overview = analytics.overview;
  const language = i18n.language;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0E7A43', '#1FA463', '#2563EB']} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <FontAwesome name="university" size={24} color="#fff" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
              <Text style={styles.headerGreeting}>{t('dashboard.greeting', { name: principal.full_name || t('dashboard.fallbackPrincipal') })}</Text>
              <Text style={styles.headerSchool}>{localizedPrincipalSchoolName(principal, i18n.language, t('dashboard.fallbackSchool'))}</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <HeroStat label={t('dashboard.averagePerformance')} value={`${overview.averagePerformance}%`} />
            <HeroStat label={t('dashboard.assessmentCompletion')} value={`${overview.completionRate}%`} />
            <HeroStat label={t('dashboard.topMajor')} value={localizedDegree({ label: overview.topMajor, key: overview.topMajor }, language)} />
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard icon="users" number={overview.totalStudents} label={t('dashboard.totalStudents')} color={colors.blue} />
          <StatCard icon="check-circle" number={overview.activeStudents} label={t('dashboard.activeStudents')} color={colors.success} />
          <StatCard icon="tasks" number={overview.completedFullAssessments} label={t('dashboard.completedFullAssessment')} color={colors.primary} />
          <StatCard icon="id-card" number={overview.completedPersonality} label={t('dashboard.completedPersonality')} color="#7C3AED" />
          <StatCard icon="gamepad" number={overview.completedGames} label={t('dashboard.completedGames')} color="#0891B2" />
          <StatCard icon="heartbeat" number={`${overview.averageEngagement}%`} label={t('dashboard.averageEngagement')} color={colors.warning} />
        </View>

        <SectionTitle title={t('dashboard.managementTitle')} />
        <View style={styles.actionsGrid}>
          {actionDefs.map((action) => (
            <TouchableOpacity key={action.route} style={styles.actionCard} onPress={() => navigateTo?.(action.route)}>
              <View style={styles.actionIcon}>
                <FontAwesome name={action.icon} size={17} color={colors.primary} />
              </View>
              <Text style={styles.actionTitle}>{t(action.titleKey)}</Text>
              <Text style={styles.actionDescription}>{t(action.descriptionKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title={t('dashboard.careerTendencies')} />
        <Card>
          {analytics.career.topCareers.length ? (
            analytics.career.topCareers.slice(0, 5).map((career) => (
              <ProgressRow key={career.key} label={localizedDegree(career, language)} value={`${career.count} ${t('common.students')} | ${career.avgScore}%`} percent={career.avgScore || Math.min(100, career.count * 18)} color={colors.blue} />
            ))
          ) : (
            <EmptyText text={t('dashboard.noCareerData')} />
          )}
        </Card>

        <SectionTitle title={t('dashboard.personalityInterests')} />
        <View style={styles.twoCol}>
          <MiniPanel title={t('dashboard.commonPersonalities')} icon="pie-chart">
            {analytics.personality.distribution.slice(0, 4).map((item) => (
              <ChipLine key={item.key} label={localizedPersonality(item.label, item.key, language, t)} value={`${item.count}`} />
            ))}
            {!analytics.personality.distribution.length && <EmptyText text={t('dashboard.personalityMissing')} />}
          </MiniPanel>
          <MiniPanel title={t('dashboard.topInterests')} icon="compass">
            {analytics.overview.topInterests.slice(0, 4).map((item) => (
              <ChipLine key={item.key} label={localizedSubject(item.label, language)} value={`${item.count}`} />
            ))}
            {!analytics.overview.topInterests.length && <EmptyText text={t('dashboard.interestsMissing')} />}
          </MiniPanel>
        </View>

        <SectionTitle title={t('dashboard.abilitiesPotential')} />
        <Card>
          <View style={styles.splitHeader}>
            <Text style={styles.cardTitle}>{t('dashboard.strongestAbilities')}</Text>
            <Text style={styles.cardMeta}>{t('dashboard.learningPotential')}: {analytics.learningPotential.average}%</Text>
          </View>
          {analytics.abilities.strongest.slice(0, 5).map((item) => (
            <ProgressRow key={item.label} label={localizedSubject(item.label, language)} value={`${item.score}%`} percent={item.score} color={colors.success} />
          ))}
          <Text style={styles.subTitle}>{t('dashboard.abilitiesToImprove')}</Text>
          {analytics.abilities.weakest.slice(0, 3).map((item) => (
            <ProgressRow key={`weak-${item.label}`} label={localizedSubject(item.label, language)} value={`${item.score}%`} percent={item.score} color={colors.warning} />
          ))}
        </Card>

        <SectionTitle title={t('dashboard.gameSignals')} />
        <Card>
          <View style={styles.splitHeader}>
            <Text style={styles.cardTitle}>{t('dashboard.gamesSupportOnly')}</Text>
            <Text style={styles.cardMeta}>{analytics.games.completedGameSessions}</Text>
          </View>
          {analytics.games.strongestSkills.slice(0, 5).map((skill) => (
            <ProgressRow key={skill.key} label={localizedGameSkill(skill.label || skill.key, language)} value={`${skill.avgScore}%`} percent={skill.avgScore} color="#0891B2" />
          ))}
          {!analytics.games.strongestSkills.length && <EmptyText text={t('dashboard.noGameSignals')} />}
        </Card>

        <SectionTitle title={t('dashboard.followUpStudents')} />
        <Card>
          {analytics.learningPotential.followUpStudents.slice(0, 5).map((student) => (
            <StudentLine key={student.id} student={student} navigateTo={navigateTo} language={language} t={t} />
          ))}
          {!analytics.learningPotential.followUpStudents.length && <EmptyText text={t('dashboard.noFollowUpStudents')} />}
        </Card>

        <SectionTitle title={t('dashboard.readyReports')} />
        <View style={styles.reportsGrid}>
          {buildDashboardReports(analytics, t, language).map((report) => (
            <View key={report.key} style={styles.reportCard}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportDescription}>{report.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <PrincipalTabs active="home" navigateTo={navigateTo} />
    </View>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function StatCard({ icon, number, label, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <FontAwesome name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressRow({ label, value, percent, color }) {
  const width = `${Math.max(4, Math.min(100, Number(percent) || 0))}%`;
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTop}>
        <Text style={styles.progressValue}>{value}</Text>
        <Text style={styles.progressLabel}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MiniPanel({ title, icon, children }) {
  return (
    <View style={styles.miniPanel}>
      <View style={styles.panelHead}>
        <View style={styles.actionIcon}><FontAwesome name={icon} size={15} color={colors.primary} /></View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ChipLine({ label, value }) {
  return (
    <View style={styles.chipLine}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const DEGREE_HE = {
  EE_BSC: 'הנדסת חשמל (B.Sc.)',
  electrical_engineering: 'הנדסת חשמל',
  CS_BSC: 'מדעי המחשב (B.Sc.)',
  computer_science: 'מדעי המחשב',
  CE_BSC: 'הנדסה אזרחית (B.Sc.)',
  civil_engineering: 'הנדסה אזרחית',
  NURS_BN: 'סיעוד (B.N.)',
  nursing: 'סיעוד',
  ARCH_BARCH: 'אדריכלות (B.Arch.)',
  architecture: 'אדריכלות',
  ME_BSC: 'הנדסת מכונות (B.Sc.)',
  mechanical_engineering: 'הנדסת מכונות',
  DATA_BSC: 'מדעי הנתונים (B.Sc.)',
  data_science: 'מדעי הנתונים',
  EDU_BED: 'חינוך (B.Ed.)',
  education: 'חינוך',
  PHYS_BSC: 'פיזיקה (B.Sc.)',
  physics: 'פיזיקה',
  BIOTECH_BSC: 'ביוטכנולוגיה (B.Sc.)',
  biotechnology: 'ביוטכנולוגיה',
  LAW_LLB: 'משפטים (LL.B.)',
  law: 'משפטים',
  COM_BA: 'תקשורת (B.A.)',
  media: 'תקשורת',
  medicine: 'רפואה',
  medical_laboratory_science: 'מדעי המעבדה הרפואית',
  arabic_language: 'ערבית',
  translation: 'תרגום',
  SE_BSC: 'הנדסת תוכנה (B.Sc.)',
  AI_BSC: 'בינה מלאכותית (B.Sc.)',
  CYBER_BSC: 'סייבר (B.Sc.)',
  BIO_BSC: 'ביולוגיה (B.Sc.)',
  CHEM_BSC: 'כימיה (B.Sc.)',
  PSY_BA: 'פסיכולוגיה (B.A.)',
  SOC_BA: 'סוציולוגיה (B.A.)',
};

const DEGREE_AR_TO_HE = [
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

const SUBJECT_AR_TO_HE = [
  ['فيزياء', 'פיזיקה'],
  ['رياضيات', 'מתמטיקה'],
  ['أحياء', 'ביולוגיה'],
  ['كيمياء', 'כימיה'],
  ['لغة عربية', 'ערבית'],
  ['لغة عبرية', 'עברית'],
  ['علوم الحاسوب', 'מדעי המחשב'],
  ['أدب', 'ספרות'],
  ['الاستدلال اللفظي', 'הסקה מילולית'],
  ['الاستدلال الكمي', 'הסקה כמותית'],
  ['تفسير المعطيات', 'פירוש נתונים'],
  ['التفكير المنطقي والمجرد', 'חשיבה לוגית ומופשטת'],
  ['لا توجد بيانات كافية', 'אין מספיק נתונים'],
];

const GAME_SKILL_HE = {
  spatial_reasoning: 'חשיבה מרחבית',
  force_distribution: 'חלוקת כוחות',
  engineering_planning: 'תכנון הנדסי',
  reading_comprehension: 'הבנת הנקרא',
  semantic_reasoning: 'חשיבה סמנטית',
  interpretation: 'פרשנות',
  medical_reasoning: 'חשיבה רפואית',
  clinical_reading: 'קריאה קלינית',
  decision_making: 'קבלת החלטות',
  circuit_logic: 'לוגיקת מעגלים',
  scientific_prediction: 'חיזוי מדעי',
  problem_solving: 'פתרון בעיות',
};

function isHebrew(language = 'ar') {
  return String(language || '').startsWith('he');
}

function localizedByArabicText(value, pairs, language = 'ar') {
  if (!isHebrew(language)) return value;
  const text = String(value || '');
  const match = pairs.find(([ar]) => text.includes(ar));
  return match ? match[1] : text;
}

function localizedDegree(item, language = 'ar') {
  if (!isHebrew(language)) return item?.label || item?.topMajor || item || '';
  const key = String(item?.key || item?.code || item?.degree_code || '').trim();
  return DEGREE_HE[key] || localizedByArabicText(item?.label || item?.topMajor || item, DEGREE_AR_TO_HE, language);
}

function localizedSubject(value, language = 'ar') {
  return localizedByArabicText(value, SUBJECT_AR_TO_HE, language);
}

function localizedPersonality(value, key, language = 'ar', t) {
  if (!isHebrew(language)) return value || t('common.noData');
  const map = {
    analytical: 'אנליטי',
    social: 'חברתי',
    creative: 'יצירתי',
    disciplined: 'ממושמע',
  };
  const byText = [
    ['تحليلي', 'אנליטי'],
    ['اجتماعي', 'חברתי'],
    ['إبداعي', 'יצירתי'],
    ['منضبط', 'ממושמע'],
    ['غير مكتمل', t('common.notCompleted')],
  ];
  return map[key] || localizedByArabicText(value, byText, language) || t('common.noData');
}

function localizedPotential(value, language = 'ar', t) {
  if (!isHebrew(language)) return value || t('common.noData');
  const pairs = [
    ['إمكانات عالية', 'פוטנציאל גבוה'],
    ['إمكانات متوسطة', 'פוטנציאל בינוני'],
    ['يحتاج متابعة', 'דורש מעקב'],
  ];
  return localizedByArabicText(value, pairs, language) || t('common.noData');
}

function localizedGameSkill(value, language = 'ar') {
  if (!isHebrew(language)) return value;
  return GAME_SKILL_HE[value] || String(value || '').replace(/_/g, ' ');
}

function localizedStudentClassLabel(student, language = 'ar') {
  if (!isHebrew(language)) return student?.class_label || `${student?.grade || '-'} / ${student?.class_section || '-'}`;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${student?.grade || '-'} | ${sections[student?.class_section] || student?.class_section || '-'}`;
}

function buildDashboardReports(analytics, t, language = 'ar') {
  const he = isHebrew(language);
  const overview = analytics?.overview || {};
  const topCareer = analytics?.career?.topCareers?.[0];
  const topMajor = localizedDegree({ key: topCareer?.key || overview.topMajor, label: overview.topMajor }, language) || t('common.noData');
  const students = overview.totalStudents || 0;
  const performance = overview.averagePerformance || 0;

  return [
    {
      key: 'school',
      title: he ? 'דוח סיכום בית ספר' : 'تقرير ملخص المدرسة',
      description: he ? `סיכום של ${students} תלמידים וביצועים ממוצעים ${performance}%` : `ملخص ${students} طالب ومتوسط أداء ${performance}%`,
    },
    {
      key: 'class',
      title: he ? 'דוח כיתות' : 'تقرير الصفوف',
      description: he ? 'השוואת כיתות וקבוצות לפי ביצועים, השלמה ומשחקים' : 'مقارنة الصفوف والشعب حسب الأداء والإكمال والألعاب',
    },
    {
      key: 'student',
      title: he ? 'דוח תלמיד' : 'تقرير طالب',
      description: he ? 'דוח תלמיד מפורט עם המלצות וסיבות' : 'تقرير طالب مفصل مع التوصيات والأسباب',
    },
    {
      key: 'career',
      title: he ? 'דוח מגמות תחומים' : 'تقرير اتجاهات التخصصات',
      description: he ? `התחום הבולט ביותר: ${topMajor}` : `أكثر تخصص ظاهر: ${topMajor}`,
    },
    {
      key: 'personality',
      title: he ? 'דוח אישיות ותחומי עניין' : 'تقرير الشخصيات والاهتمامات',
      description: he ? 'ניתוח אישיות ותחומי עניין והקשר שלהם לתחומים' : 'تحليل الشخصيات والاهتمامات وربطها بالتخصصات',
    },
    {
      key: 'games',
      title: he ? 'דוח אותות משחקים' : 'تقرير إشارات الألعاب',
      description: he ? 'איך המשחקים תמכו בהמלצות בלי להחליף את המבחן' : 'كيف دعمت الألعاب التوصيات بدون أن تستبدل الاختبار',
    },
  ];
}

function StudentLine({ student, navigateTo, language = 'ar', t }) {
  return (
    <TouchableOpacity style={styles.studentLine} onPress={() => navigateTo?.('principalStudentDetails', { studentId: student.id })}>
      <FontAwesome name="arrow-left" size={13} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.full_name}</Text>
        <Text style={styles.studentMeta}>{localizedStudentClassLabel(student, language)} | {localizedDegree({ label: student.top_major, key: student.top_major_key }, language)} | {localizedPotential(student.learning_potential_level, language, t)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyText({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function Center({ text }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

function ErrorState({ text, onRetry }) {
  const { t } = useTranslation('principal');
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{t('common.loadErrorTitle')}</Text>
      <Text style={styles.centerText}>{text}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PrincipalTabs({ active, navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const isHebrew = String(i18n.language || '').startsWith('he');
  const nextLanguage = isHebrew ? 'ar' : 'he';
  const tabs = [
    { key: 'home', label: t('tabs.home'), icon: 'home', route: 'principalDashboard' },
    { key: 'students', label: t('tabs.students'), icon: 'users', route: 'principalStudents' },
    { key: 'analytics', label: t('tabs.analytics'), icon: 'bar-chart', route: 'principalClassAnalytics' },
    { key: 'reports', label: t('tabs.reports'), icon: 'file-text-o', route: 'principalReports' },
    { key: 'account', label: t('tabs.account'), icon: 'user-circle', route: 'principalProfileSettings' },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => navigateTo?.(tab.route)}>
          <FontAwesome name={tab.icon} size={16} color={active === tab.key ? colors.primary : colors.secondary} />
          <Text style={[styles.tabText, active === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.languageTab}
        onPress={() => i18n.changeLanguage(nextLanguage)}
        accessibilityRole="button"
        accessibilityLabel={t('common.switchLanguage')}
      >
        <FontAwesome name="language" size={15} color={colors.primary} />
        <Text style={styles.languageTabText}>{isHebrew ? 'עברית' : 'العربية'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  header: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: '#DCFCE7', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  headerGreeting: { marginTop: 4, color: '#fff', fontSize: 23, fontWeight: '900', textAlign: 'right' },
  headerSchool: { marginTop: 4, color: '#EFF6FF', fontWeight: '800', textAlign: 'right' },
  heroStats: { flexDirection: 'row-reverse', gap: 8, marginTop: 18 },
  heroStat: { flex: 1, minHeight: 68, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', padding: 10, alignItems: 'flex-end', justifyContent: 'center' },
  heroStatValue: { color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'right', maxWidth: '100%' },
  heroStatLabel: { marginTop: 4, color: '#EAF7EF', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: '48.5%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'flex-end' },
  statIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statNumber: { marginTop: 12, color: colors.dark, fontSize: 24, fontWeight: '900', textAlign: 'right' },
  statLabel: { marginTop: 3, color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: colors.dark, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  actionsGrid: { gap: 10 },
  actionCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, alignItems: 'flex-end' },
  actionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { marginTop: 10, color: colors.dark, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  actionDescription: { marginTop: 4, color: colors.secondary, fontSize: 12, fontWeight: '700', lineHeight: 19, textAlign: 'right' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15 },
  splitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: colors.dark, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  cardMeta: { color: colors.secondary, fontSize: 12, fontWeight: '900' },
  subTitle: { marginTop: 14, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  progressRow: { marginTop: 12 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressLabel: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  progressValue: { color: colors.secondary, fontWeight: '900' },
  track: { marginTop: 7, height: 8, borderRadius: 999, backgroundColor: '#E9F1EE', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  twoCol: { gap: 10 },
  miniPanel: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15 },
  panelHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  chipLine: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, backgroundColor: '#F7FBF9', padding: 10 },
  chipLabel: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  chipValue: { color: colors.primary, fontWeight: '900' },
  studentLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#F7FBF9', padding: 11, marginTop: 8 },
  studentName: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  studentMeta: { marginTop: 3, color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  reportsGrid: { gap: 10 },
  reportCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'flex-end' },
  reportTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  reportDescription: { marginTop: 5, color: colors.secondary, fontSize: 12, fontWeight: '800', lineHeight: 18, textAlign: 'right' },
  emptyText: { color: colors.secondary, fontWeight: '800', textAlign: 'right', marginTop: 8 },
  tabs: { position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 64, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabText: { color: colors.secondary, fontSize: 10, fontWeight: '900' },
  tabTextActive: { color: colors.primary },
  languageTab: { minWidth: 58, height: 48, borderRadius: 16, backgroundColor: colors.soft, borderWidth: 1, borderColor: '#CDEEDD', alignItems: 'center', justifyContent: 'center', gap: 3, marginHorizontal: 2 },
  languageTabText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
});
