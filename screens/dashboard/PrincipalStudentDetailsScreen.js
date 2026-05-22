import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import {
  getPrincipalStudentProgress,
  localizedPrincipalSchoolName,
  savePrincipalStudentNote,
  updatePrincipalManagedStudent,
} from '../../services/principalExperienceService';
import { getPrincipalStudentAnalytics } from '../../services/principalAnalyticsService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', warning: '#F59E0B', danger: '#E74C3C' };

const SUBJECT_LABELS = {
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

const DEGREE_LABELS = {
  EE_BSC: 'الهندسة الكهربائية',
  CS_BSC: 'علوم الحاسوب',
  CE_BSC: 'الهندسة المدنية',
  NURS_BN: 'تمريض',
  ARCH_BARCH: 'هندسة معمارية',
  ME_BSC: 'الهندسة الميكانيكية',
  DATA_BSC: 'علوم البيانات',
  EDU_BED: 'تربية وتعليم',
  PHYS_BSC: 'فيزياء',
  BIOTECH_BSC: 'بيوتكنولوجيا',
  LAW_LLB: 'قانون',
  COM_BA: 'إعلام واتصال',
  medicine: 'طب',
  medical_laboratory_science: 'مختبرات طبية',
  arabic_language: 'لغة عربية',
  translation: 'ترجمة',
};

const SUBJECT_LABELS_HE = {
  physics: 'פיזיקה',
  math: 'מתמטיקה',
  biology: 'ביולוגיה',
  chemistry: 'כימיה',
  arabic: 'ערבית',
  hebrew: 'עברית',
  computer_science: 'מדעי המחשב',
  literature: 'ספרות',
  VR: 'הסקה מילולית',
  QR: 'הסקה כמותית',
  DI: 'פירוש נתונים',
  LR: 'חשיבה לוגית ומופשטת',
};

const DEGREE_LABELS_HE = {
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

const AR_TITLE_TO_HE = [
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

export default function PrincipalStudentDetailsScreen({ navigateTo, route }) {
  const { t, i18n } = useTranslation('principal');
  const studentId = route?.params?.studentId || route?.studentId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ phone: '', preferred_language: 'ar', class_section: 'alef', is_active: true });
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPrincipalStudentProgress(studentId);
      const analyticsResult = await getPrincipalStudentAnalytics(studentId).catch(() => null);
      setData({ ...result, analytics: analyticsResult });
      setForm({
        phone: result.student.phone || '',
        preferred_language: result.student.preferred_language || 'ar',
        class_section: result.student.class_section || 'alef',
        is_active: result.student.is_active !== false,
      });
    } catch (err) {
      setError(err?.message || t('details.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [studentId]);

  const saveStudent = async () => {
    setSaving(true);
    try {
      await updatePrincipalManagedStudent(studentId, form);
      await load();
      Alert.alert(t('details.saveChanges'), t('details.allowedEditHint'));
    } catch (err) {
      Alert.alert(t('common.loadErrorTitle'), err?.message || t('common.retry'));
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await savePrincipalStudentNote({ studentId, note });
      setNote('');
      await load();
    } catch (err) {
      Alert.alert(t('common.loadErrorTitle'), err?.message || t('common.retry'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Center text={t('details.loading')} />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  const student = data.student;
  const summary = data.summary;
  const smart = data.analytics?.student;
  const bestRecommendation = data.analytics?.topRecommendations?.[0];
  const localizedSmart = localizeSmartStudent(smart, i18n.language, t);
  const strengths = data.abilities
    .slice()
    .sort((a, b) => scoreValue(b, 'ability') - scoreValue(a, 'ability'))
    .slice(0, 4);
  const improvements = data.abilities
    .slice()
    .sort((a, b) => scoreValue(a, 'ability') - scoreValue(b, 'ability'))
    .slice(0, 4);
  const topInterests = data.interests
    .slice()
    .sort((a, b) => scoreValue(b, 'interest') - scoreValue(a, 'interest'))
    .slice(0, 4);
  const gameSignals = (smart?.raw?.careerSignals || [])
    .slice()
    .sort((a, b) => (Number(b.career_signal) || 0) - (Number(a.career_signal) || 0))
    .slice(0, 4);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalStudents')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.kicker}>{t('details.reportKicker')}</Text>
          <Text style={styles.title}>{student.full_name}</Text>
          <Text style={styles.subtitle}>{student.email || '-'} | {student.phone || '-'}</Text>
          <Text style={styles.subtitle}>{localizedPrincipalSchoolName(data.principal, i18n.language, student.school_name || '-')} | {localizedClassLabel(student, i18n.language)}</Text>
          <Text style={styles.headerInsight}>{buildStudentMessage({ summary, smart: localizedSmart, t })}</Text>
        </View>

        <View style={styles.grid}>
          <Metric label={t('details.completed')} value={summary.completed} color={colors.success} />
          <Metric label={t('details.inProgress')} value={summary.inProgress} color={colors.primary} />
          <Metric label={t('details.abandoned')} value={summary.abandoned} color={colors.warning} />
          <Metric label={t('details.averagePerformance')} value={`${summary.averageScore}%`} color={colors.primary} />
        </View>

        <Section title={t('details.bestPath')}>
          {bestRecommendation || smart ? (
            <View style={styles.bestCard}>
              <View style={styles.bestTop}>
                <View style={styles.scorePill}><Text style={styles.scorePillText}>{bestRecommendation?.overall ?? smart?.top_major_score ?? 0}%</Text></View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.bestTitle}>{localizedRecommendationTitle(bestRecommendation, localizedSmart, i18n.language, t)}</Text>
                  <Text style={styles.bestMeta}>{confidenceLabel({ summary, smart, t })}</Text>
                </View>
              </View>
              <Text style={styles.explanation}>{localizedRecommendationReason(bestRecommendation, localizedSmart, i18n.language, t)}</Text>
              {bestRecommendation?.breakdown && (
                <View style={styles.breakdownGrid}>
                  <Breakdown label={t('details.abilitiesFromExam')} value={bestRecommendation.breakdown.abilities} color={colors.primary} />
                  <Breakdown label={t('details.interestsShort')} value={bestRecommendation.breakdown.interests} color={colors.success} />
                  <Breakdown label={t('details.personality')} value={bestRecommendation.breakdown.personality} color="#7C3AED" />
                  <Breakdown label={t('details.learningPotential')} value={bestRecommendation.breakdown.learningPotential} color={colors.warning} />
                  <Breakdown label={t('details.games')} value={bestRecommendation.breakdown.games} color="#0891B2" />
                </View>
              )}
            </View>
          ) : (
            <Empty text={t('common.noData')} />
          )}
        </Section>

        <Section title={t('details.smartSummary')}>
          <View style={styles.insightGrid}>
            <InsightCard icon="trophy" label={t('details.bestMajor')} value={localizedSmart?.top_major || t('common.notReady')} tone={colors.primary} />
            <InsightCard icon="user" label={t('details.personalityType')} value={localizedSmart?.personality_type || t('common.notCompleted')} tone="#7C3AED" />
            <InsightCard icon="line-chart" label={t('details.learningPotential')} value={`${localizedSmart?.learning_potential_level || t('common.notAvailable')} ${smart?.learning_potential_score ? `(${smart.learning_potential_score}%)` : ''}`} tone={colors.success} />
            <InsightCard icon="gamepad" label={t('details.gameSupport')} value={localizedSmart?.game_support_level || t('common.noData')} tone="#0891B2" />
          </View>
        </Section>

        <Section title={t('details.strengths')}>
          {strengths.map((row, index) => (
            <AnalysisBar
              key={`strength-${index}`}
              title={subjectName(row, i18n.language)}
              value={scoreValue(row, 'ability')}
              meta={strengthText(scoreValue(row, 'ability'), t)}
              color={colors.success}
            />
          ))}
          {!strengths.length && <Empty text={t('details.noAbilities')} />}
        </Section>

        <Section title={t('details.improvements')}>
          {improvements.map((row, index) => (
            <AnalysisBar
              key={`improve-${index}`}
              title={subjectName(row, i18n.language)}
              value={scoreValue(row, 'ability')}
              meta={improvementText(scoreValue(row, 'ability'), t)}
              color={colors.warning}
            />
          ))}
          {!improvements.length && <Empty text={t('details.noImprovements')} />}
        </Section>

        <Section title={t('details.interests')}>
          {topInterests.map((row, index) => (
            <AnalysisBar
              key={`interest-${index}`}
              title={subjectName(row, i18n.language)}
              value={scoreValue(row, 'interest')}
              meta={t('details.interestMeta')}
              color={colors.primary}
            />
          ))}
          {!topInterests.length && <Empty text={t('details.noInterests')} />}
        </Section>

        <Section title={t('details.gameSignals')}>
          <Text style={styles.sectionHint}>{t('details.gameSignalsHint')}</Text>
          {gameSignals.map((signal, index) => (
            <SignalCard key={`${signal.game_session_id || index}-${signal.degree_code}`} signal={signal} />
          ))}
          {!gameSignals.length && <Empty text={t('details.noGameSignalsLong')} />}
        </Section>

        <Section title={t('details.sessions')}>
          {data.sessions.slice(0, 6).map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
          {!data.sessions.length && <Empty text={t('details.noSessions')} />}
        </Section>

        <Section title={t('details.otherRecommendations')}>
          {data.analytics?.topRecommendations?.slice(1, 4).map((rec) => <RecommendationCard key={rec.id} rec={rec} language={i18n.language} />)}
          {!data.analytics?.topRecommendations?.slice(1, 4).length && data.recommendations.slice(0, 5).map((rec) => <Row key={rec.id} title={subjectName(rec, i18n.language)} meta={localizedStoredRecommendationReason(rec, i18n.language, t)} />)}
          {!data.analytics?.topRecommendations?.length && !data.recommendations.length && <Empty text={t('details.noOtherRecommendations')} />}
        </Section>

        <Section title={t('details.allowedEdit')}>
          <Text style={styles.sectionHint}>{t('details.allowedEditHint')}</Text>
          <Field label={t('details.phone')} value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <Field label={t('details.preferredLanguage')} value={form.preferred_language} onChangeText={(value) => setForm((current) => ({ ...current, preferred_language: value }))} />
          <Field label={t('details.section')} value={form.class_section} onChangeText={(value) => setForm((current) => ({ ...current, class_section: value }))} />
          <TouchableOpacity style={[styles.toggle, !form.is_active && styles.toggleOff]} onPress={() => setForm((current) => ({ ...current, is_active: !current.is_active }))}>
            <Text style={styles.toggleText}>{form.is_active ? t('details.studentActive') : t('details.studentInactive')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveStudent} disabled={saving}>
            <Text style={styles.saveText}>{t('details.saveChanges')}</Text>
          </TouchableOpacity>
        </Section>

        <Section title={t('details.managerNotes')}>
          <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder={t('details.notePlaceholder')} multiline textAlign="right" />
          <TouchableOpacity style={styles.saveButton} onPress={addNote} disabled={saving}>
            <Text style={styles.saveText}>{t('details.addNote')}</Text>
          </TouchableOpacity>
          {data.notes.map((item) => <Row key={item.id} title={item.note} meta={new Date(item.created_at).toLocaleString(localeForLanguage(i18n.language))} />)}
        </Section>
      </ScrollView>
      <PrincipalTabs active="students" navigateTo={navigateTo} />
    </View>
  );
}

function Section({ title, children }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function InsightCard({ icon, label, value, tone }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${tone}18` }]}>
        <FontAwesome name={icon} size={16} color={tone} />
      </View>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
}

function Field({ label, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} textAlign="right" /></View>;
}

function Metric({ label, value, color }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Row({ title, meta }) {
  return <View style={styles.row}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowMeta}>{meta}</Text></View>;
}

function AnalysisBar({ title, value, meta, color }) {
  const width = `${Math.max(4, Math.min(100, Number(value) || 0))}%`;
  return (
    <View style={styles.analysisBlock}>
      <View style={styles.analysisTop}>
        <Text style={styles.analysisValue}>{Math.round(Number(value) || 0)}%</Text>
        <Text style={styles.analysisTitle}>{title}</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>
      <Text style={styles.analysisMeta}>{meta}</Text>
    </View>
  );
}

function SessionCard({ session }) {
  const { t, i18n } = useTranslation('principal');
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <StatusBadge status={session.status} />
        <Text style={styles.sessionTitle}>{session.session_type === 'full_assessment' ? t('details.fullAssessment') : t('details.testSession')}</Text>
      </View>
      <View style={styles.sessionStats}>
        <MiniStat label={t('common.score')} value={session.final_score != null ? `${Math.round(Number(session.final_score))}%` : '-'} />
        <MiniStat label={t('common.engagement')} value={session.engagement_score != null ? `${Math.round(Number(session.engagement_score))}%` : '-'} />
        <MiniStat label={t('common.correct')} value={session.correct_answers ?? '-'} />
        <MiniStat label={t('common.wrong')} value={session.wrong_answers ?? '-'} />
      </View>
      <Text style={styles.rowMeta}>{session.started_at ? new Date(session.started_at).toLocaleString(localeForLanguage(i18n.language)) : '-'}</Text>
    </View>
  );
}

function SignalCard({ signal }) {
  const { t, i18n } = useTranslation('principal');
  const degree = degreeName(signal, i18n.language, t);
  const topic = topicLabel(signal.topic_key, t);
  const ability = Math.round(Number(signal.ability_signal) || 0);
  const interest = Math.round(Number(signal.interest_signal) || 0);
  return (
    <View style={styles.signalCard}>
      <View style={styles.signalTop}>
        <FontAwesome name="gamepad" size={16} color="#0891B2" />
        <Text style={styles.signalTitle}>{degree}</Text>
      </View>
      <Text style={styles.explanation}>{t('details.gameSignalExplanation', { topic })}</Text>
      <View style={styles.sessionStats}>
        <MiniStat label={t('details.abilities')} value={`${ability}%`} />
        <MiniStat label={t('details.interestsShort')} value={`${interest}%`} />
      </View>
    </View>
  );
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation('principal');
  const label = status === 'completed' ? t('common.completed') : status === 'in_progress' ? t('common.inProgress') : status === 'abandoned' ? t('common.abandoned') : t('common.unknown');
  const color = status === 'completed' ? colors.success : status === 'in_progress' ? colors.primary : colors.warning;
  return <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}><Text style={[styles.statusText, { color }]}>{label}</Text></View>;
}

function RecommendationCard({ rec, language }) {
  const { t } = useTranslation('principal');
  const title = localizedRecommendationTitle(rec, null, language, t);
  const reason = localizedRecommendationReason(rec, null, language, t);
  return (
    <View style={styles.recommendationCard}>
      <View style={styles.recommendationHead}>
        <Text style={styles.recommendationScore}>{rec.overall}%</Text>
        <Text style={styles.recommendationTitle}>{title}</Text>
      </View>
      <Text style={styles.rowMeta}>{reason}</Text>
      <Breakdown label={t('details.abilities')} value={rec.breakdown.abilities} color={colors.primary} />
      <Breakdown label={t('details.interestsShort')} value={rec.breakdown.interests} color={colors.success} />
      <Breakdown label={t('details.personality')} value={rec.breakdown.personality} color="#7C3AED" />
      <Breakdown label={t('details.learningPotential')} value={rec.breakdown.learningPotential} color={colors.warning} />
      <Breakdown label={t('details.games')} value={rec.breakdown.games} color="#0891B2" />
    </View>
  );
}

function Breakdown({ label, value, color }) {
  const width = `${Math.max(4, Math.min(100, Number(value) || 0))}%`;
  return (
    <View style={styles.breakdown}>
      <View style={styles.breakdownTop}><Text style={styles.breakdownValue}>{value}%</Text><Text style={styles.breakdownLabel}>{label}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width, backgroundColor: color }]} /></View>
    </View>
  );
}

function SmartLine({ label, value }) {
  return <View style={styles.smartLine}><Text style={styles.smartValue}>{value || '-'}</Text><Text style={styles.smartLabel}>{label}</Text></View>;
}

function scoreValue(row, type) {
  if (type === 'interest') return Number(row?.interest_score) || 0;
  return Number(row?.ability_score ?? row?.theta_estimate ?? row?.confidence_level) || 0;
}

function subjectName(row, language = 'ar') {
  const code = row?.subjects?.code || row?.subject_code || row?.code;
  if (language?.startsWith('he')) {
    return SUBJECT_LABELS_HE[code] || row?.subjects?.name_he || row?.subjects?.name_en || row?.subjects?.name_ar || code || 'תחום';
  }
  return SUBJECT_LABELS[code] || row?.subjects?.name_ar || row?.subjects?.name_en || row?.subjects?.name_he || 'مجال';
}

function degreeName(signal, language = 'ar', t) {
  if (language?.startsWith('he')) {
    return DEGREE_LABELS_HE[signal?.degree_code] || signal?.degrees?.name_he || signal?.degrees?.name_en || signal?.degrees?.name_ar || signal?.degree_code || t('details.majorFallback');
  }
  return DEGREE_LABELS[signal.degree_code] || signal.degrees?.name_ar || signal.degrees?.name_en || signal.degree_code || t('details.majorFallback');
}

function localizedClassLabel(student, language = 'ar') {
  if (!String(language || '').startsWith('he')) return student.class_label || `${student.grade || '-'} / ${student.class_section || '-'}`;
  const sections = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד' };
  return `כיתה ${student.grade || '-'} | ${sections[student.class_section] || student.class_section || '-'}`;
}

function translateArabicTitleToHebrew(title) {
  const text = String(title || '');
  const match = AR_TITLE_TO_HE.find(([ar]) => text.includes(ar));
  return match ? match[1] : text;
}

function localizedRecommendationTitle(rec, smart, language = 'ar', t) {
  const fallback = smart?.top_major || t('details.noReadyRecommendation');
  const title = rec?.title || fallback;
  if (!String(language || '').startsWith('he')) return title;
  const fromCode = DEGREE_LABELS_HE[rec?.id] || DEGREE_LABELS_HE[smart?.top_major_key];
  return fromCode || translateArabicTitleToHebrew(title) || t('details.noReadyRecommendation');
}

function tWithFallback(t, key, defaultValue, options = {}) {
  const value = t(key, { ...options, defaultValue });
  return value === key ? defaultValue : value;
}

function localizedKnownRecommendationReason(value, language = 'ar', t) {
  const key = String(value || '').trim();
  const isHebrew = String(language || '').startsWith('he');
  if (key === 'details.recommendationReasonWithGames') {
    return tWithFallback(
      t,
      key,
      isHebrew
        ? 'ההמלצה מבוססת על המבחן, האישיות ותחומי העניין; המשחקים הוסיפו תמיכה קלה בלבד.'
        : 'هذه التوصية مبنية على الامتحان والشخصية والاهتمامات، والألعاب أضافت دعماً بسيطاً فقط.'
    );
  }
  if (key === 'details.recommendationReasonNoGames') {
    return tWithFallback(
      t,
      key,
      isHebrew
        ? 'ההמלצה מבוססת בעיקר על המבחן, האישיות ותחומי העניין.'
        : 'هذه التوصية مبنية بشكل أساسي على الامتحان والشخصية والاهتمامات.'
    );
  }
  return null;
}

function localizedRecommendationReason(rec, smart, language = 'ar', t) {
  const storedReason = localizedKnownRecommendationReason(rec?.reason, language, t);
  if (storedReason) return storedReason;
  if (!String(language || '').startsWith('he')) return rec?.reason || buildRecommendationReason(smart, t);
  if (rec?.breakdown?.games > 0 || /لعبة|الألعاب|إشارة/.test(String(rec?.reason || ''))) {
    return tWithFallback(t, 'details.recommendationReasonWithGames', 'ההמלצה מבוססת על המבחן, האישיות ותחומי העניין; המשחקים הוסיפו תמיכה קלה בלבד.');
  }
  return tWithFallback(t, 'details.recommendationReasonNoGames', 'ההמלצה מבוססת בעיקר על המבחן, האישיות ותחומי העניין.');
}

function localizedStoredRecommendationReason(rec, language = 'ar', t) {
  const storedReason = localizedKnownRecommendationReason(rec?.reason_ar || rec?.reason_he || rec?.status, language, t);
  if (storedReason) return storedReason;
  if (!String(language || '').startsWith('he')) return rec?.reason_ar || rec?.status || '-';
  if (rec?.reason_he) return rec.reason_he;
  return tWithFallback(t, 'details.recommendationReasonNoGames', 'ההמלצה מבוססת בעיקר על המבחן, האישיות ותחומי העניין.');
}

function localeForLanguage(language = 'ar') {
  return String(language || '').startsWith('he') ? 'he-IL' : 'ar';
}

function localizeSmartStudent(smart, language = 'ar', t) {
  if (!smart || !String(language || '').startsWith('he')) return smart;
  return {
    ...smart,
    top_major: DEGREE_LABELS_HE[smart.top_major_key] || translateArabicTitleToHebrew(smart.top_major),
    top_ability: translateSubjectText(smart.top_ability, language),
    top_interest: translateSubjectText(smart.top_interest, language),
    personality_type: translatePersonality(smart.personality_type, smart.personality_key, t),
    learning_potential_level: translatePotential(smart.learning_potential_key, smart.learning_potential_level, t),
    game_support_level: translateGameSupport(smart.game_support_key, smart.game_support_level, t),
  };
}

function translateSubjectText(value, language = 'ar') {
  if (!String(language || '').startsWith('he')) return value;
  const text = String(value || '');
  const entry = Object.entries(SUBJECT_LABELS).find(([, ar]) => text.includes(ar));
  return entry ? SUBJECT_LABELS_HE[entry[0]] : text;
}

function translatePersonality(value, key, t) {
  const byKey = {
    analytical: 'אנליטי',
    social: 'חברתי',
    creative: 'יצירתי',
    disciplined: 'ממושמע',
  };
  const byText = {
    'تحليلي': 'אנליטי',
    'اجتماعي': 'חברתי',
    'إبداعي': 'יצירתי',
    'منضبط': 'ממושמע',
    'غير مكتمل': t('common.notCompleted'),
  };
  return byKey[key] || byText[value] || value || t('common.notCompleted');
}

function translatePotential(key, value, t) {
  const map = {
    high: 'פוטנציאל גבוה',
    medium: 'פוטנציאל בינוני',
    support: 'דורש מעקב',
  };
  return map[key] || value || t('common.noData');
}

function translateGameSupport(key, value, t) {
  const map = {
    strong: 'תמיכת משחקים חזקה',
    medium: 'תמיכת משחקים בינונית',
    weak: 'תמיכת משחקים קלה',
  };
  return map[key] || value || t('common.noData');
}

function strengthText(value, t) {
  if (value >= 80) return t('details.strengthHigh');
  if (value >= 65) return t('details.strengthMedium');
  return t('details.strengthLow');
}

function improvementText(value, t) {
  if (value >= 65) return t('details.improvementLight');
  if (value >= 45) return t('details.improvementMedium');
  return t('details.improvementNeedsPlan');
}

function buildStudentMessage({ summary, smart, t }) {
  if (!summary.completed && !smart?.completed_games) return t('details.studentMessageNotEnough');
  if (smart?.top_major) return t('details.studentMessageWithMajor', { major: smart.top_major });
  return t('details.studentMessageInitial');
}

function buildRecommendationReason(smart, t) {
  if (!smart) return t('details.noRecommendationExplanation');
  return t('details.recommendationReason', {
    score: smart.average_score || 0,
    ability: smart.top_ability || '-',
    interest: smart.top_interest || '-',
    personality: smart.personality_type || t('common.notCompleted'),
  });
}

function confidenceLabel({ summary, smart, t }) {
  if (summary.completed && smart?.has_personality && smart?.completed_games > 0) return t('details.confidenceHigh');
  if (summary.completed) return t('details.confidenceMedium');
  return t('details.confidenceLow');
}

function topicLabel(topic, t) {
  const labels = {
    diagnosis: t('details.topics.diagnosis'),
    context_understanding: t('details.topics.context_understanding'),
    electricity_circuits: t('details.topics.electricity_circuits'),
    bridge_stability: t('details.topics.bridge_stability'),
  };
  return labels[topic] || topic || t('details.gameTopicFallback');
}

function Empty({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function Center({ text }) {
  return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{text}</Text></View>;
}

function ErrorState({ text, onRetry }) {
  const { t } = useTranslation('principal');
  return <View style={styles.center}><Text style={styles.errorTitle}>{t('common.loadErrorTitle')}</Text><Text style={styles.centerText}>{text}</Text><TouchableOpacity style={styles.saveButton} onPress={onRetry}><Text style={styles.saveText}>{t('common.retry')}</Text></TouchableOpacity></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  headerCard: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'flex-end' },
  kicker: { color: colors.primary, fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 6 },
  title: { color: colors.dark, fontSize: 24, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 6, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  headerInsight: { marginTop: 12, color: colors.dark, fontWeight: '800', textAlign: 'right', lineHeight: 22, backgroundColor: '#F8FAFF', borderRadius: 14, padding: 10, alignSelf: 'stretch' },
  grid: { marginTop: 12, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, minWidth: 130, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'flex-end' },
  metricValue: { fontSize: 21, fontWeight: '900' },
  metricLabel: { marginTop: 4, color: colors.secondary, fontWeight: '800' },
  section: { marginTop: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14 },
  sectionTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  sectionHint: { color: colors.secondary, fontWeight: '800', textAlign: 'right', lineHeight: 20, marginBottom: 8 },
  bestCard: { borderRadius: 18, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#EAF0FF', padding: 14 },
  bestTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scorePill: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center' },
  scorePillText: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  bestTitle: { color: colors.dark, fontSize: 19, fontWeight: '900', textAlign: 'right' },
  bestMeta: { marginTop: 4, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  explanation: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'right', lineHeight: 21 },
  breakdownGrid: { marginTop: 4 },
  insightGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  insightCard: { flexGrow: 1, flexBasis: 170, minHeight: 112, borderRadius: 16, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#EAF0FF', padding: 12, alignItems: 'flex-end' },
  insightIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { marginTop: 8, color: colors.secondary, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  insightValue: { marginTop: 4, color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right', lineHeight: 19 },
  field: { marginTop: 8 },
  label: { color: colors.dark, fontWeight: '900', textAlign: 'right', marginBottom: 5 },
  input: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, color: colors.dark, fontWeight: '800' },
  noteInput: { minHeight: 84, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.dark, fontWeight: '800' },
  toggle: { marginTop: 10, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAFBF1' },
  toggleOff: { backgroundColor: '#FEE2E2' },
  toggleText: { color: colors.dark, fontWeight: '900' },
  saveButton: { marginTop: 10, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingHorizontal: 14 },
  saveText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  row: { marginTop: 8, borderRadius: 14, backgroundColor: '#F8FAFF', padding: 10, alignItems: 'flex-end' },
  rowTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  rowMeta: { marginTop: 4, color: colors.secondary, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  analysisBlock: { marginTop: 9, borderRadius: 16, backgroundColor: '#F8FAFF', padding: 11, borderWidth: 1, borderColor: '#EAF0FF' },
  analysisTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  analysisTitle: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  analysisValue: { color: colors.primary, fontWeight: '900' },
  analysisMeta: { marginTop: 7, color: colors.secondary, fontSize: 17, fontWeight: '800', textAlign: 'right', lineHeight: 18 },
  sessionCard: { marginTop: 9, borderRadius: 16, backgroundColor: '#F8FAFF', padding: 11, borderWidth: 1, borderColor: '#EAF0FF' },
  sessionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sessionTitle: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  sessionStats: { marginTop: 10, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  miniStat: { flexGrow: 1, minWidth: 84, borderRadius: 12, backgroundColor: '#fff', padding: 9, alignItems: 'flex-end' },
  miniValue: { color: colors.dark, fontWeight: '900' },
  miniLabel: { marginTop: 2, color: colors.secondary, fontSize: 16, fontWeight: '800' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 16, fontWeight: '900' },
  signalCard: { marginTop: 9, borderRadius: 16, backgroundColor: '#F3FCFF', padding: 11, borderWidth: 1, borderColor: '#D8F3FA' },
  signalTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  signalTitle: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  recommendationCard: { marginTop: 10, borderRadius: 16, backgroundColor: '#F8FAFF', padding: 12, alignItems: 'stretch' },
  recommendationHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  recommendationTitle: { flex: 1, color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  recommendationScore: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  breakdown: { marginTop: 9 },
  breakdownTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLabel: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  breakdownValue: { color: colors.secondary, fontSize: 17, fontWeight: '900' },
  track: { marginTop: 5, height: 7, borderRadius: 999, backgroundColor: '#E9EEFF', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  smartLine: { marginTop: 8, borderRadius: 14, backgroundColor: '#F8FAFF', padding: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  smartLabel: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'right' },
  smartValue: { flex: 1, color: colors.primary, fontWeight: '900', textAlign: 'left' },
  emptyText: { color: colors.secondary, fontWeight: '800', textAlign: 'right' },
});
