// screens/AdaptiveTest/TestResultsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentJourneySnapshot } from '../../services/studentJourneyService';

const COPY = {
  ar: {
    title: 'نتائج الاختبار الشامل',
    subtitle: 'تقرير تعليمي مختصر حسب أدائك في الامتحان.',
    loading: 'جاري تحميل النتائج والتوصيات...',
    missingStudent: 'لم يتم العثور على الطالب',
    missingSession: 'لا يوجد رقم جلسة لعرض النتائج.',
    loadFailed: 'فشل تحميل نتائج الاختبار.',
    score: 'النتيجة العامة',
    level: 'المستوى',
    answered: 'أسئلة مجابة',
    correct: 'إجابات صحيحة',
    skipped: 'متروكة',
    time: 'الوقت',
    confidence: 'الثقة',
    subjectPerformance: 'أداء المواد',
    noSubjects: 'لا توجد نتائج مواد لهذه الجلسة بعد.',
    strengths: 'أقوى المجالات',
    improvements: 'مجالات تحتاج تدريب',
    noStrengths: 'أكمل أسئلة أكثر حتى تظهر نقاط القوة بوضوح.',
    noImprovements: 'لا توجد مجالات ضعف واضحة حالياً.',
    recommendations: 'تخصصات مقترحة لك',
    noRecommendations: 'لم تظهر توصيات كافية بعد. أكمل الاختبار أو الألعاب لتحسين النتائج.',
    institutions: 'جامعات وكليات مناسبة',
    noInstitutions: 'لا توجد مؤسسات مرتبطة بالتخصصات المقترحة حالياً.',
    nextSteps: 'الخطوات التالية',
    fullRecommendations: 'عرض التوصيات الكاملة',
    suitableInstitutions: 'عرض الجامعات والكليات المناسبة',
    profile: 'الانتقال إلى البروفايل',
    retakeLater: 'إعادة الاختبار لاحقاً',
    reviewAnswers: 'مراجعة الإجابات',
    details: 'تفاصيل المؤسسة',
    relatedMajor: 'التخصص المرتبط',
    excellent: 'ممتاز',
    veryGood: 'جيد جدًا',
    good: 'جيد',
    average: 'متوسط',
    needsImprovement: 'يحتاج تحسين',
    subjectHigh: 'أداء قوي ويمكن البناء عليه في التوصيات.',
    subjectMid: 'أداء جيد، ومع تدريب بسيط يمكن رفع النتيجة.',
    subjectLow: 'هذا المجال يحتاج مراجعة هادئة وتدريب إضافي.',
    recError: 'تم حفظ الامتحان، لكن تحديث التوصيات يحتاج إعادة محاولة.',
  },
  he: {
    title: 'תוצאות המבחן המלא',
    subtitle: 'דוח לימודי קצר לפי הביצועים שלך במבחן.',
    loading: 'טוען תוצאות והמלצות...',
    missingStudent: 'לא נמצא תלמיד',
    missingSession: 'אין מזהה סשן להצגת התוצאות.',
    loadFailed: 'טעינת תוצאות המבחן נכשלה.',
    score: 'ציון כללי',
    level: 'רמה',
    answered: 'שאלות שנענו',
    correct: 'תשובות נכונות',
    skipped: 'דולגו',
    time: 'זמן',
    confidence: 'ביטחון',
    subjectPerformance: 'ביצועים לפי מקצוע',
    noSubjects: 'אין עדיין תוצאות מקצועות לסשן הזה.',
    strengths: 'התחומים החזקים',
    improvements: 'תחומים לתרגול',
    noStrengths: 'ענה על עוד שאלות כדי לראות חוזקות בצורה ברורה.',
    noImprovements: 'אין כרגע תחומי חולשה ברורים.',
    recommendations: 'תחומי לימוד מומלצים',
    noRecommendations: 'עדיין אין מספיק המלצות. השלם את המבחן או המשחקים כדי לשפר את התוצאות.',
    institutions: 'אוניברסיטאות ומכללות מתאימות',
    noInstitutions: 'אין כרגע מוסדות מקושרים לתחומים המומלצים.',
    nextSteps: 'השלבים הבאים',
    fullRecommendations: 'הצגת כל ההמלצות',
    suitableInstitutions: 'הצגת אוניברסיטאות ומכללות',
    profile: 'מעבר לפרופיל',
    retakeLater: 'לבצע שוב מאוחר יותר',
    reviewAnswers: 'סקירת תשובות',
    details: 'פרטי המוסד',
    relatedMajor: 'תחום קשור',
    excellent: 'מצוין',
    veryGood: 'טוב מאוד',
    good: 'טוב',
    average: 'בינוני',
    needsImprovement: 'דורש שיפור',
    subjectHigh: 'ביצוע חזק שאפשר לבנות עליו בהמלצות.',
    subjectMid: 'ביצוע טוב, ועם תרגול קצר אפשר לשפר עוד.',
    subjectLow: 'התחום הזה צריך חזרה רגועה ותרגול נוסף.',
    recError: 'המבחן נשמר, אך עדכון ההמלצות דורש ניסיון נוסף.',
  },
  en: {
    title: 'Full Assessment Results',
    subtitle: 'A concise learning report based on your assessment performance.',
    loading: 'Loading results and recommendations...',
    missingStudent: 'Student was not found',
    missingSession: 'No session ID was provided for results.',
    loadFailed: 'Failed to load assessment results.',
    score: 'Overall score',
    level: 'Level',
    answered: 'Answered',
    correct: 'Correct',
    skipped: 'Skipped',
    time: 'Time',
    confidence: 'Confidence',
    subjectPerformance: 'Subject performance',
    noSubjects: 'No subject results are available for this session yet.',
    strengths: 'Strongest areas',
    improvements: 'Areas to practice',
    noStrengths: 'Answer more questions to show clear strengths.',
    noImprovements: 'No clear weak areas right now.',
    recommendations: 'Recommended majors',
    noRecommendations: 'Not enough recommendations yet. Complete the assessment or games to improve results.',
    institutions: 'Recommended universities and colleges',
    noInstitutions: 'No institutions are linked to the recommended majors yet.',
    nextSteps: 'Next steps',
    fullRecommendations: 'View full recommendations',
    suitableInstitutions: 'View suitable institutions',
    profile: 'Go to profile',
    retakeLater: 'Retake later',
    reviewAnswers: 'Review answers',
    details: 'Institution details',
    relatedMajor: 'Related major',
    excellent: 'Excellent',
    veryGood: 'Very good',
    good: 'Good',
    average: 'Average',
    needsImprovement: 'Needs improvement',
    subjectHigh: 'Strong performance that can support recommendations.',
    subjectMid: 'Good performance, with room to improve through practice.',
    subjectLow: 'This area needs calm review and more practice.',
    recError: 'The assessment was saved, but recommendations need another refresh attempt.',
  },
};

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('en')) return 'en';
  return 'ar';
}

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function pickLocalized(row = {}, base, language) {
  return row?.[`${base}_${language}`] || row?.[`${base}_en`] || row?.[`${base}_ar`] || row?.[`${base}_he`] || row?.[base] || '';
}

function formatMinutes(seconds) {
  const totalSeconds = Math.max(0, Math.floor(safeNum(seconds, 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const rest = totalSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function levelFor(score, copy) {
  if (score >= 85) return copy.excellent;
  if (score >= 70) return copy.veryGood;
  if (score >= 55) return copy.good;
  if (score >= 40) return copy.average;
  return copy.needsImprovement;
}

function explanationFor(score, copy) {
  if (score >= 70) return copy.subjectHigh;
  if (score >= 45) return copy.subjectMid;
  return copy.subjectLow;
}

function normalizeRecommendation(recommendation = {}) {
  return {
    ...recommendation,
    scorePercent: Math.round(clamp(
      recommendation.scorePercent ??
      recommendation.score_percent ??
      recommendation.match_percentage ??
      recommendation.match_score ??
      safeNum(recommendation.score, 0) * 100
    )),
    confidenceScore: Math.round(clamp(recommendation.confidence_score ?? recommendation.confidenceScore ?? 0)),
  };
}

function flattenInstitutions(recommendations = [], language) {
  const seen = new Map();
  recommendations.forEach((recommendation) => {
    const majorName = recommendation.name || pickLocalized(recommendation, 'name', language);
    (recommendation.institutions || []).forEach((program, index) => {
      const institutionId = program.institution_id || program.institution?.id || program.id || `${program.institution_name}-${index}`;
      if (!institutionId || seen.has(institutionId)) return;
      seen.set(institutionId, {
        id: institutionId,
        name: program.institution_name || pickLocalized(program.institution, 'name', language) || program.name || '',
        city: program.city || pickLocalized(program.institution, 'city', language) || program.region || '',
        region: program.region || program.institution?.region || '',
        type: program.institution?.type || program.type || '',
        programName: program.program_name || pickLocalized(program, 'program_name', language) || '',
        majorName,
      });
    });
  });
  return [...seen.values()].filter((institution) => institution.name).slice(0, 3);
}

export default function TestResultsScreen({
  navigateTo,
  sessionId,
  studentId,
  skippedCount,
  totalTimeSpent,
  recommendationRefreshError,
  language = 'ar',
}) {
  const { studentData } = useAuth();
  const { i18n } = useTranslation();
  const lang = normalizeLanguage(language || i18n.language);
  const copy = COPY[lang];
  const isRtl = lang !== 'en';
  const effectiveStudentId = studentId || studentData?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang).catch(() => {});
    }
  }, [i18n, lang]);

  useEffect(() => {
    let mounted = true;

    async function loadResults() {
      if (!effectiveStudentId) {
        Alert.alert(copy.loadFailed, copy.missingStudent);
        setLoading(false);
        return;
      }
      if (!sessionId) {
        Alert.alert(copy.loadFailed, copy.missingSession);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);
        const [sessionRes, subjectRes, journeyRes] = await Promise.all([
          supabase
            .from('test_sessions')
            .select('id, student_id, status, final_score, correct_answers, wrong_answers, skipped_questions, total_time_seconds, engagement_score, metadata, completed_at')
            .eq('id', sessionId)
            .maybeSingle(),
          supabase
            .from('test_session_subjects')
            .select(`
              subject_id,
              questions_answered,
              correct_answers,
              is_complete,
              metadata,
              subjects:subjects (
                id,
                code,
                name_ar,
                name_en,
                name_he
              )
            `)
            .eq('session_id', sessionId),
          getStudentJourneySnapshot(effectiveStudentId, { language: lang }),
        ]);

        if (sessionRes.error) throw sessionRes.error;
        if (subjectRes.error) throw subjectRes.error;

        if (!mounted) return;
        setSession(sessionRes.data || null);
        setRows(subjectRes.data || []);
        setSnapshot(journeyRes?.success ? journeyRes.data : null);
        if (!journeyRes?.success) setLoadError(journeyRes?.error || copy.recError);
      } catch (error) {
        if (!mounted) return;
        setLoadError(error?.message || copy.loadFailed);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadResults();
    return () => {
      mounted = false;
    };
  }, [copy.loadFailed, copy.missingSession, copy.missingStudent, copy.recError, effectiveStudentId, lang, sessionId]);

  const subjectResults = useMemo(() => {
    return (rows || []).map((row, index) => {
      const answered = safeNum(row?.questions_answered, 0);
      const correct = safeNum(row?.correct_answers, 0);
      const accuracy = answered > 0 ? Math.round(clamp((correct / answered) * 100)) : 0;
      const name =
        pickLocalized(row?.subjects, 'name', lang) ||
        (lang === 'he' ? `מקצוע ${index + 1}` : lang === 'en' ? `Subject ${index + 1}` : `المادة ${index + 1}`);
      return {
        subjectId: row.subject_id || `subject-${index}`,
        name,
        answered,
        correct,
        accuracy,
        level: levelFor(accuracy, copy),
        explanation: explanationFor(accuracy, copy),
      };
    }).sort((left, right) => right.accuracy - left.accuracy);
  }, [copy, lang, rows]);

  const totals = useMemo(() => {
    const answered = subjectResults.reduce((sum, item) => sum + item.answered, 0);
    const correct = subjectResults.reduce((sum, item) => sum + item.correct, 0);
    const skipped = safeNum(skippedCount ?? session?.skipped_questions ?? session?.metadata?.skippedCount, 0);
    const timeSeconds = safeNum(totalTimeSpent ?? session?.total_time_seconds ?? session?.metadata?.totalTimeSpentSeconds, 0);
    const score = answered > 0 ? Math.round(clamp((correct / answered) * 100)) : Math.round(clamp(session?.final_score || 0));
    return {
      answered,
      correct,
      skipped,
      time: formatMinutes(timeSeconds),
      score,
      level: levelFor(score, copy),
    };
  }, [copy, session, skippedCount, subjectResults, totalTimeSpent]);

  const recommendations = useMemo(
    () => (snapshot?.recommendations || []).slice(0, 3).map(normalizeRecommendation),
    [snapshot]
  );
  const institutions = useMemo(() => flattenInstitutions(recommendations, lang), [lang, recommendations]);
  const weakestSubjects = useMemo(() => [...subjectResults].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3), [subjectResults]);
  const confidence = recommendations[0]?.confidenceScore ?? safeNum(session?.engagement_score, 0);

  const goRecommendations = () => navigateTo('recommendations', { studentId: effectiveStudentId, language: lang, sessionId });
  const goInstitutions = () => navigateTo('universitiesAndColleges', { studentId: effectiveStudentId, language: lang });
  const goProfile = () => navigateTo('profile', { studentId: effectiveStudentId, language: lang });
  const goReview = () => navigateTo('reviewAnswers', { sessionId, language: lang });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E4FBF" />
        <Text style={styles.centerText}>{copy.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#163A91', '#2257D6']} style={styles.hero}>
        <View style={[styles.heroTop, isRtl && styles.rowReverse]}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>✓</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.heroTitle, isRtl && styles.rtlText]}>{copy.title}</Text>
            <Text style={[styles.heroSubtitle, isRtl && styles.rtlText]}>{copy.subtitle}</Text>
          </View>
        </View>

        <View style={[styles.heroStats, isRtl && styles.rowReverse]}>
          <Metric label={copy.score} value={`${totals.score}%`} />
          <Metric label={copy.level} value={totals.level} />
          <Metric label={copy.answered} value={String(totals.answered)} />
          <Metric label={copy.correct} value={String(totals.correct)} />
          <Metric label={copy.skipped} value={String(totals.skipped)} />
          <Metric label={copy.time} value={totals.time} />
          <Metric label={copy.confidence} value={`${Math.round(clamp(confidence))}%`} />
        </View>
      </LinearGradient>

      {(loadError || recommendationRefreshError) ? (
        <View style={styles.warningCard}>
          <Text style={[styles.warningText, isRtl && styles.rtlText]}>
            {recommendationRefreshError ? copy.recError : loadError}
          </Text>
        </View>
      ) : null}

      <Section title={copy.subjectPerformance} isRtl={isRtl}>
        {subjectResults.length ? (
          subjectResults.map((subject) => (
            <View key={subject.subjectId} style={styles.subjectCard}>
              <View style={[styles.subjectHeader, isRtl && styles.rowReverse]}>
                <View style={styles.flex}>
                  <Text style={[styles.subjectName, isRtl && styles.rtlText]}>{subject.name}</Text>
                  <Text style={[styles.subjectNote, isRtl && styles.rtlText]}>{subject.explanation}</Text>
                </View>
                <View style={styles.scoreBlock}>
                  <Text style={styles.subjectPercent}>{subject.accuracy}%</Text>
                  <Text style={styles.levelPill}>{subject.level}</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${subject.accuracy}%` }]} />
              </View>
              <Text style={[styles.subjectMeta, isRtl && styles.rtlText]}>
                {subject.correct}/{subject.answered}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, isRtl && styles.rtlText]}>{copy.noSubjects}</Text>
        )}
      </Section>

      <View style={styles.twoColumn}>
        <MiniList title={copy.strengths} empty={copy.noStrengths} items={subjectResults.slice(0, 3)} isRtl={isRtl} />
        <MiniList title={copy.improvements} empty={copy.noImprovements} items={weakestSubjects} isRtl={isRtl} />
      </View>

      <Section title={copy.recommendations} isRtl={isRtl}>
        {recommendations.length ? (
          recommendations.map((recommendation, index) => (
            <View key={recommendation.degree_id || recommendation.major_id || `${recommendation.name}-${index}`} style={styles.recommendationCard}>
              <View style={[styles.subjectHeader, isRtl && styles.rowReverse]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.recommendationName, isRtl && styles.rtlText]}>{recommendation.name || pickLocalized(recommendation, 'name', lang)}</Text>
                  <Text style={[styles.subjectNote, isRtl && styles.rtlText]} numberOfLines={2}>
                    {recommendation.explanation || recommendation.reasons?.[0] || recommendation.confidence_reason || ''}
                  </Text>
                </View>
                <View style={styles.scoreBlock}>
                  <Text style={styles.subjectPercent}>{recommendation.scorePercent}%</Text>
                  <Text style={styles.confidencePill}>{copy.confidence} {recommendation.confidenceScore}%</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, isRtl && styles.rtlText]}>{copy.noRecommendations}</Text>
        )}
        <TouchableOpacity style={styles.inlineButton} onPress={goRecommendations}>
          <Text style={styles.inlineButtonText}>{copy.fullRecommendations}</Text>
        </TouchableOpacity>
      </Section>

      <Section title={copy.institutions} isRtl={isRtl}>
        {institutions.length ? (
          institutions.map((institution) => (
            <View key={institution.id} style={styles.institutionCard}>
              <Text style={[styles.institutionName, isRtl && styles.rtlText]}>{institution.name}</Text>
              <Text style={[styles.subjectNote, isRtl && styles.rtlText]}>
                {[institution.city, institution.region, institution.type].filter(Boolean).join(' · ')}
              </Text>
              <Text style={[styles.subjectMeta, isRtl && styles.rtlText]}>
                {copy.relatedMajor}: {institution.majorName}
              </Text>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => navigateTo('institutionDetails', { institutionId: institution.id, language: lang })}
              >
                <Text style={styles.outlineButtonText}>{copy.details}</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, isRtl && styles.rtlText]}>{copy.noInstitutions}</Text>
        )}
      </Section>

      <Section title={copy.nextSteps} isRtl={isRtl}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={goRecommendations}>
            <Text style={styles.primaryButtonText}>{copy.fullRecommendations}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goInstitutions}>
            <Text style={styles.secondaryButtonText}>{copy.suitableInstitutions}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goProfile}>
            <Text style={styles.secondaryButtonText}>{copy.profile}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goReview}>
            <Text style={styles.secondaryButtonText}>{copy.reviewAnswers}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => navigateTo('adaptiveTest')}>
            <Text style={styles.ghostButtonText}>{copy.retakeLater}</Text>
          </TouchableOpacity>
        </View>
      </Section>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children, isRtl }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{title}</Text>
      {children}
    </View>
  );
}

function MiniList({ title, empty, items, isRtl }) {
  return (
    <View style={styles.miniCard}>
      <Text style={[styles.miniTitle, isRtl && styles.rtlText]}>{title}</Text>
      {items?.length ? (
        items.map((item) => (
          <View key={`${title}-${item.subjectId}`} style={[styles.miniRow, isRtl && styles.rowReverse]}>
            <Text style={[styles.miniName, isRtl && styles.rtlText]}>{item.name}</Text>
            <Text style={styles.miniScore}>{item.accuracy}%</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, isRtl && styles.rtlText]}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F7FF' },
  content: { paddingBottom: 24 },
  flex: { flex: 1 },
  rowReverse: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },

  hero: {
    margin: 14,
    padding: 18,
    borderRadius: 24,
    shadowColor: '#0F2E75',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconText: { color: '#FFFFFF', fontSize: 25, fontWeight: '900' },
  heroTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', lineHeight: 30 },
  heroSubtitle: { color: '#DDE8FF', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 4 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  metric: {
    minWidth: 94,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  metricValue: { color: '#FFFFFF', fontWeight: '900', fontSize: 18, textAlign: 'center' },
  metricLabel: { color: '#DDE8FF', fontWeight: '800', fontSize: 11, textAlign: 'center', marginTop: 3 },

  section: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAFE',
  },
  sectionTitle: { color: '#102A68', fontSize: 18, fontWeight: '900', marginBottom: 10 },
  warningCard: {
    marginHorizontal: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },
  warningText: { color: '#8A5A00', fontWeight: '800', lineHeight: 20 },

  subjectCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E4ECFF',
    marginBottom: 9,
  },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectName: { color: '#102A68', fontSize: 15, fontWeight: '900', lineHeight: 22 },
  subjectNote: { color: '#5D6E94', fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 3 },
  subjectPercent: { color: '#1E4FBF', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  subjectMeta: { color: '#6A7899', fontSize: 12, fontWeight: '800', marginTop: 7 },
  scoreBlock: { alignItems: 'center', minWidth: 74 },
  levelPill: {
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E8F8F0',
    color: '#0E9F6E',
    fontSize: 11,
    fontWeight: '900',
  },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: '#DFE8FB', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#18A66A' },

  twoColumn: { marginHorizontal: 14, marginTop: 12, gap: 12 },
  miniCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAFE',
  },
  miniTitle: { color: '#102A68', fontSize: 16, fontWeight: '900', marginBottom: 8 },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FF',
  },
  miniName: { color: '#253C75', fontSize: 14, fontWeight: '800' },
  miniScore: { color: '#1E4FBF', fontSize: 14, fontWeight: '900' },

  recommendationCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E4ECFF',
    marginBottom: 9,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8F0',
  },
  rankText: { color: '#0E9F6E', fontWeight: '900' },
  recommendationName: { color: '#102A68', fontSize: 16, fontWeight: '900', lineHeight: 22 },
  confidencePill: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#EEF4FF',
    color: '#1E4FBF',
    fontSize: 10,
    fontWeight: '900',
  },

  institutionCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#E4ECFF',
    marginBottom: 9,
  },
  institutionName: { color: '#102A68', fontSize: 16, fontWeight: '900', lineHeight: 22 },
  outlineButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E4FBF',
    backgroundColor: '#FFFFFF',
  },
  outlineButtonText: { color: '#1E4FBF', fontWeight: '900' },

  actions: { gap: 10 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFD0FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: '#1E4FBF', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  ghostButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: { color: '#596B91', fontWeight: '900', fontSize: 13, textAlign: 'center' },
  inlineButton: {
    marginTop: 2,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonText: { color: '#FFFFFF', fontWeight: '900' },
  emptyText: { color: '#6A7899', fontSize: 13, fontWeight: '800', lineHeight: 20 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F3F7FF', padding: 20 },
  centerText: { color: '#41547F', fontWeight: '900', textAlign: 'center' },
});
