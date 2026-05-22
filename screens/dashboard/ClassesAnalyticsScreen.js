import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getPrincipalAnalyticsSummary } from '../../services/principalAnalyticsService';

const colors = {
  bg: '#F3F7F6',
  card: '#FFFFFF',
  primary: '#16834A',
  blue: '#1F6EBD',
  teal: '#12A594',
  lime: '#8BC34A',
  orange: '#F59E0B',
  red: '#EF4444',
  gray: '#6B7280',
  dark: '#102A2A',
  secondary: '#607184',
  border: '#DDEBE6',
  track: '#E8F1ED',
};

const palette = [colors.blue, colors.teal, colors.lime, colors.orange, colors.red, '#7C3AED'];

export default function ClassesAnalyticsScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAnalytics(await getPrincipalAnalyticsSummary());
    } catch (err) {
      setError(err?.message || t('analytics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const trend = useMemo(() => {
    if (!analytics) return [];
    const base = analytics.classes.length ? analytics.classes : [];
    return base.map((row, index) => ({
      label: localizedClassLabel(row, i18n.language),
      value: Math.max(8, Number(row.averagePerformance || 0) + index * 2),
    }));
  }, [analytics, i18n.language]);

  if (loading) return <Center text={t('analytics.loading')} />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  const overview = analytics.overview;
  const language = i18n.language;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header navigateTo={navigateTo} title={t('analytics.title')} subtitle={t('analytics.subtitle')} />

        <View style={styles.dashboardGrid}>
          <View style={styles.metricRail}>
            <MetricTile color={colors.blue} icon="users" value={overview.totalStudents} label={t('analytics.students')} />
            <MetricTile color={colors.teal} icon="clock-o" value={`${overview.averageEngagement}%`} label={t('analytics.averageEngagement')} />
            <MetricTile color={colors.lime} icon="file-text-o" value={`${overview.completedFullAssessments}`} label={t('analytics.fullAssessment')} />
            <MetricTile color={colors.orange} icon="warning" value={`${100 - overview.completionRate}%`} label={t('analytics.incomplete')} />
            <MetricTile color={colors.red} icon="gamepad" value={overview.completedGames} label={t('analytics.gameSessions')} />
            <MetricTile color={colors.gray} icon="flag" value={`${overview.completionRate}%`} label={t('analytics.completionRate')} />
          </View>

          <View style={styles.chartColumn}>
            <View style={styles.chartRow}>
              <ChartCard title={t('analytics.performanceByClasses')} subtitle={t('analytics.performanceByClassesSub')}>
                <MiniTrendChart data={trend} color={colors.blue} />
              </ChartCard>
              <ChartCard title={t('analytics.engagementByClasses')} subtitle={t('analytics.engagementByClassesSub')}>
                <MiniTrendChart data={analytics.classes.map((row) => ({ label: localizedClassLabel(row, language), value: row.averageEngagement }))} color={colors.teal} />
              </ChartCard>
            </View>

            <View style={styles.chartRow}>
              <ChartCard title={t('analytics.careerDistribution')} subtitle={t('analytics.careerDistributionSub')}>
                <DonutLikeChart data={analytics.career.topCareers.slice(0, 6).map((item) => ({ label: localizedDegree(item, language), value: item.count }))} />
              </ChartCard>
              <ChartCard title={t('analytics.personalities')} subtitle={t('analytics.personalitiesSub')}>
                <VerticalBars data={analytics.personality.distribution.slice(0, 6).map((item) => ({ label: localizedPersonality(item.label, item.key, language, t), value: item.count }))} color={colors.blue} />
              </ChartCard>
            </View>
          </View>
        </View>

        <View style={styles.wideRow}>
          <ChartCard title={t('analytics.schoolTopCareers')} subtitle={t('analytics.mostVisible', { major: localizedDegree({ label: overview.topMajor, key: overview.topMajor }, language) })}>
            <HorizontalBars data={analytics.career.topCareers.slice(0, 8).map((item) => ({ label: localizedDegree(item, language), value: item.avgScore, meta: `${item.count} ${t('common.students')}` }))} color={colors.blue} />
          </ChartCard>
          <ChartCard title={t('analytics.strongestAbilities')} subtitle={t('analytics.fromFullAssessment')}>
            <HorizontalBars data={analytics.abilities.strongest.slice(0, 6).map((item) => ({ label: localizedSubject(item.label, language), value: item.score, meta: `${item.studentsCount || ''}` }))} color={colors.primary} />
          </ChartCard>
        </View>

        <View style={styles.wideRow}>
          <ChartCard title={t('analytics.abilitiesToImprove')} subtitle={t('analytics.schoolFollowUpAreas')}>
            <HorizontalBars data={analytics.abilities.weakest.slice(0, 6).map((item) => ({ label: localizedSubject(item.label, language), value: item.score, meta: t('analytics.needsStrengthening') }))} color={colors.orange} />
          </ChartCard>
          <ChartCard title={t('analytics.gameSignals')} subtitle={t('analytics.supportOnly')}>
            <HorizontalBars data={analytics.games.strongestSkills.slice(0, 6).map((item) => ({ label: localizedGameSkill(item.label || item.key, language), value: item.avgScore, meta: `${item.count} ${t('analytics.signals')}` }))} color="#0891B2" />
          </ChartCard>
        </View>

        <ChartCard title={t('analytics.classAnalysis')} subtitle={t('analytics.classAnalysisSub')}>
          {analytics.classes.length ? analytics.classes.map((row) => (
            <ClassSummary key={row.key} row={row} language={language} />
          )) : <Empty text={t('analytics.notEnoughClasses')} />}
        </ChartCard>

        <ChartCard title={t('analytics.followUpStudents')} subtitle={t('analytics.followUpStudentsSub')}>
          {analytics.learningPotential.followUpStudents.slice(0, 6).map((student) => (
            <StudentRow key={student.id} student={student} navigateTo={navigateTo} language={language} />
          ))}
          {!analytics.learningPotential.followUpStudents.length && <Empty text={t('analytics.noFollowUpStudents')} />}
        </ChartCard>
      </ScrollView>
      <PrincipalTabs active="analytics" navigateTo={navigateTo} />
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

function localizedClassLabel(row, language = 'ar') {
  if (!isHebrew(language)) return row?.label || '-';
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  const [grade, section] = String(row?.key || '').split(':');
  if (grade && section) return `כיתה ${grade} | ${sections[section] || section}`;
  return String(row?.label || '').replace('صف', 'כיתה');
}

function localizedStudentClassLabel(student, language = 'ar') {
  if (!isHebrew(language)) return student?.class_label || `${student?.grade || '-'} / ${student?.class_section || '-'}`;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${student?.grade || '-'} | ${sections[student?.class_section] || student?.class_section || '-'}`;
}

function Header({ navigateTo, title, subtitle }) {
  const { t } = useTranslation('principal');
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
        <FontAwesome name="chevron-right" size={13} color={colors.primary} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function MetricTile({ color, icon, value, label }) {
  return (
    <View style={[styles.metricTile, { backgroundColor: color }]}>
      <View style={styles.metricText}>
        <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <View style={styles.metricIcon}>
        <FontAwesome name={icon} size={22} color="#fff" />
      </View>
    </View>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.chartSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function MiniTrendChart({ data = [], color }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value) || 0));
  const normalized = data.length ? data : [{ label: '-', value: 0 }];
  return (
    <View style={styles.trendWrap}>
      <View style={styles.yAxis}>
        <Text style={styles.axisText}>100%</Text>
        <Text style={styles.axisText}>50%</Text>
        <Text style={styles.axisText}>0%</Text>
      </View>
      <View style={styles.trendPlot}>
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { bottom: 0 }]} />
        <View style={styles.trendBars}>
          {normalized.map((item, index) => {
            const h = Math.max(8, Math.min(100, ((Number(item.value) || 0) / max) * 100));
            return (
              <View key={`${item.label}-${index}`} style={styles.trendBarSlot}>
                <View style={[styles.trendAreaBar, { height: `${h}%`, backgroundColor: color }]} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function DonutLikeChart({ data = [] }) {
  const { t } = useTranslation('principal');
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const rows = data.length ? data : [{ label: t('common.noData'), value: 0 }];
  const size = 156;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = rows.map((item, index) => {
    const value = Number(item.value) || 0;
    const length = total ? (value / total) * circumference : 0;
    const segment = {
      key: `${item.label}-${index}`,
      color: palette[index % palette.length],
      dasharray: `${Math.max(0, length)} ${circumference}`,
      dashoffset: -offset,
    };
    offset += length;
    return segment;
  });

  const chart = Platform.OS === 'web' && total > 0 ? (
    <View style={styles.donutSvgWrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EAF3FF"
          strokeWidth={stroke}
        />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={segment.dasharray}
            strokeDashoffset={segment.dashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>{t('common.students')}</Text>
      </View>
    </View>
  ) : (
    <View style={[styles.donut, { borderColor: palette[0] }]}>
      <View style={styles.donutInner}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>{t('common.students')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.careerDonutWrap}>
      {chart}
      <View style={styles.careerLegendText}>
        {rows.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.careerLegendRow}>
            <Text style={styles.careerLegendPercent}>{total ? Math.round(((Number(item.value) || 0) / total) * 100) : 0}%</Text>
            <Text style={styles.careerLegendLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.careerDots}>
        {rows.map((item, index) => (
          <View key={`dot-${item.label}-${index}`} style={[styles.careerDot, { backgroundColor: palette[index % palette.length] }]} />
        ))}
      </View>
    </View>
  );
}

function VerticalBars({ data = [], color }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value) || 0));
  const rows = data.length ? data : [{ label: '-', value: 0 }];
  return (
    <View style={styles.verticalChart}>
      {rows.map((item, index) => {
        const height = Math.max(8, Math.min(100, ((Number(item.value) || 0) / max) * 100));
        return (
          <View key={`${item.label}-${index}`} style={styles.verticalItem}>
            <View style={styles.verticalBarBox}>
              <View style={[styles.verticalBar, { height: `${height}%`, backgroundColor: palette[index % palette.length] || color }]} />
            </View>
            <Text style={styles.verticalValue}>{item.value}</Text>
            <Text style={styles.verticalLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HorizontalBars({ data = [], color }) {
  const { t } = useTranslation('principal');
  const rows = data.length ? data : [{ label: t('common.noData'), value: 0, meta: '' }];
  return (
    <View style={styles.horizontalBars}>
      {rows.map((item, index) => {
        const width = `${Math.max(3, Math.min(100, Number(item.value) || 0))}%`;
        return (
          <View key={`${item.label}-${index}`} style={styles.hBarBlock}>
            <View style={styles.hBarTop}>
              <Text style={styles.hBarValue}>{item.meta ? `${item.meta} | ` : ''}{Math.round(Number(item.value) || 0)}%</Text>
              <Text style={styles.hBarLabel} numberOfLines={1}>{item.label}</Text>
            </View>
            <View style={styles.hTrack}>
              <View style={[styles.hFill, { width, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ClassSummary({ row, language = 'ar' }) {
  const { t } = useTranslation('principal');
  return (
    <View style={styles.classRow}>
      <View style={styles.classMain}>
        <Text style={styles.classTitle}>{localizedClassLabel(row, language)}</Text>
        <Text style={styles.classMeta}>{row.studentsCount} {t('common.students')} | {t('analytics.games')} {row.completedGames} | {t('analytics.completion')} {row.completionRate}%</Text>
      </View>
      <View style={styles.classStats}>
        <SmallStat label={t('analytics.performance')} value={`${row.averagePerformance}%`} />
        <SmallStat label={t('analytics.major')} value={localizedDegree({ label: row.topMajor, key: row.topMajor }, language)} />
        <SmallStat label={t('analytics.personality')} value={localizedPersonality(row.topPersonality, null, language, t)} />
      </View>
    </View>
  );
}

function SmallStat({ label, value }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function StudentRow({ student, navigateTo, language = 'ar' }) {
  const { t } = useTranslation('principal');
  return (
    <TouchableOpacity style={styles.studentRow} onPress={() => navigateTo?.('principalStudentDetails', { studentId: student.id })}>
      <FontAwesome name="arrow-left" size={12} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{student.full_name}</Text>
        <Text style={styles.studentMeta}>{localizedStudentClassLabel(student, language)} | {t('analytics.performance')} {student.average_score}% | {localizedPotential(student.learning_potential_level, language, t)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Center({ text }) {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{text}</Text></View>;
}

function ErrorState({ text, onRetry }) {
  const { t } = useTranslation('principal');
  return <View style={styles.center}><Text style={styles.errorTitle}>{t('common.loadErrorTitle')}</Text><Text style={styles.centerText}>{text}</Text><TouchableOpacity style={styles.retryButton} onPress={onRetry}><Text style={styles.retryText}>{t('common.retry')}</Text></TouchableOpacity></View>;
}

function Empty({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900' },
  retryButton: { marginTop: 16, borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  header: { alignItems: 'flex-end', marginBottom: 10 },
  backButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF7EF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 14, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right', lineHeight: 20 },
  dashboardGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  metricRail: { width: 160, flexGrow: 1, maxWidth: 220, gap: 0, borderRadius: 6, overflow: 'hidden' },
  metricTile: { minHeight: 70, padding: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  metricText: { flex: 1, alignItems: 'flex-end' },
  metricValue: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'right' },
  metricLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 16, fontWeight: '800', textAlign: 'right', marginTop: 2 },
  metricIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  chartColumn: { flex: 1, minWidth: 280, gap: 10 },
  chartRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  wideRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chartCard: { flex: 1, minWidth: 270, backgroundColor: colors.card, borderRadius: 5, borderWidth: 1, borderColor: colors.border, padding: 12 },
  chartHead: { alignItems: 'flex-end', marginBottom: 8 },
  chartTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  chartSubtitle: { marginTop: 2, color: colors.secondary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  trendWrap: { height: 170, flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  yAxis: { width: 34, justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 4 },
  axisText: { color: '#94A3B8', fontSize: 9, fontWeight: '800' },
  trendPlot: { flex: 1, position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#DDE6E2', paddingHorizontal: 4 },
  gridLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: '#EEF3F1' },
  trendBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  trendBarSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  trendAreaBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.85 },
  careerDonutWrap: { minHeight: 175, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 20, paddingVertical: 10 },
  donutSvgWrap: { width: 156, height: 156, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutCenter: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  donut: { width: 148, height: 148, borderRadius: 74, borderWidth: 22, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  donutInner: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  donutValue: { color: colors.dark, fontSize: 28, fontWeight: '900' },
  donutLabel: { color: colors.secondary, fontSize: 16, fontWeight: '800' },
  careerLegendText: { flex: 1, maxWidth: 360, gap: 9, alignItems: 'flex-end' },
  careerLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, width: '100%' },
  careerLegendLabel: { color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right', maxWidth: 250 },
  careerLegendPercent: { color: colors.secondary, fontSize: 16, fontWeight: '900', minWidth: 36, textAlign: 'left' },
  careerDots: { width: 18, gap: 14, alignItems: 'center' },
  careerDot: { width: 12, height: 12, borderRadius: 6 },
  verticalChart: { height: 170, flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 10, paddingTop: 8 },
  verticalItem: { flex: 1, alignItems: 'center' },
  verticalBarBox: { height: 115, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  verticalBar: { width: '68%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  verticalValue: { marginTop: 5, color: colors.dark, fontSize: 17, fontWeight: '900' },
  verticalLabel: { color: colors.secondary, fontSize: 16, fontWeight: '800', maxWidth: 78 },
  horizontalBars: { gap: 10 },
  hBarBlock: { marginTop: 3 },
  hBarTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  hBarLabel: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  hBarValue: { color: colors.secondary, fontWeight: '900', fontSize: 17 },
  hTrack: { marginTop: 6, height: 10, borderRadius: 999, backgroundColor: colors.track, overflow: 'hidden' },
  hFill: { height: '100%', borderRadius: 999 },
  classRow: { marginTop: 9, borderRadius: 4, borderWidth: 1, borderColor: '#E7F1EC', backgroundColor: '#FBFEFC', padding: 10 },
  classMain: { alignItems: 'flex-end' },
  classTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  classMeta: { marginTop: 3, color: colors.secondary, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  classStats: { marginTop: 9, flexDirection: 'row-reverse', gap: 8 },
  smallStat: { flex: 1, minHeight: 48, borderRadius: 4, backgroundColor: '#F4FAF7', padding: 8, alignItems: 'flex-end' },
  smallStatValue: { color: colors.dark, fontWeight: '900', fontSize: 17, textAlign: 'right', maxWidth: '100%' },
  smallStatLabel: { marginTop: 2, color: colors.secondary, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  studentRow: { marginTop: 8, borderRadius: 4, backgroundColor: '#F7FBF9', padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  studentName: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  studentMeta: { marginTop: 3, color: colors.secondary, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  emptyText: { marginTop: 8, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
});
