// screens/AdaptiveTest/PersonalityResultsScreen.js
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import RadarChart from '../../components/AdaptiveTest/RadarChart';
import TraitDetailModal from '../../components/AdaptiveTest/TraitDetailModal';
import { getStudentPersonalityProfile } from '../../services/personalityTestService';

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, safeNum(value)));
}

function pct(value) {
  return Math.round(clamp(value));
}

function normalizeLang(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('en')) return 'en';
  return 'ar';
}

const copy = {
  ar: {
    loading: 'جاري التحميل…',
    errorTitle: 'خطأ',
    missingStudent: 'لا يوجد studentId.',
    loadFailed: 'فشل تحميل النتائج.',
    somethingWrong: 'حدث خطأ أثناء تحميل النتائج.',
    title: 'نتائج الشخصية',
    subtitle: 'نتائج شخصية حسب نمط إجاباتك',
    confidence: (value) => `ثقة ${value}%`,
    heroSummary: 'يعرض ملفك ميلاً جيداً للاستقرار، التعاون، والتفكير المنظّم.',
    quickTitle: 'ملخص سريع',
    quickText: 'النتائج تعكس نمطاً عاماً حسب إجاباتك وتساعد في تحسين توصيات التخصصات.',
    traitsTitle: 'سمات الشخصية الخمس',
    radarTitle: 'خريطة السمات الخمس',
    radarBadge: 'Big Five',
    chartTitle: 'الرسم',
    chartHint: 'مقارنة مختصرة بين السمات الخمس.',
    chartEmpty: 'لا توجد بيانات كافية لعرض الرسم.',
    chartTapHint: 'اضغط على الصفة في الرسم لعرض الشرح',
    close: 'إغلاق',
    meaningTitle: 'ماذا تعني هذه النتائج؟',
    meaningText: 'المسؤولية تدعم المجالات التي تحتاج تخطيطاً، والانفتاح يدعم الإبداع والبحث، والانبساط يساعد في العمل الجماعي، والتعاون مهم للتعليم والرعاية، والحساسية للضغط تعني أن بيئة تعلم داعمة قد تساعدك أكثر.',
    recommendationTitle: 'كيف يؤثر هذا على التوصيات؟',
    recommendationText: 'يستخدم النظام نتائج الشخصية كجزء من التوصية، إلى جانب القدرات التعليمية، الاهتمامات، ونتائج الألعاب.',
    fullReport: 'عرض التقرير الكامل',
    backHome: 'العودة للصفحة الرئيسية',
    traits: {
      openness: ['الانفتاح', 'إبداع / بحث', 'يميل الانفتاح العالي إلى دعم المجالات الإبداعية والبحثية.'],
      conscientiousness: ['المسؤولية والانضباط', 'تنظيم / مثابرة', 'رؤية أوضح للتنظيم والمثابرة تساعدك على التخطيط والتقدم.'],
      extraversion: ['الانبساط', 'تواصل / فريق', 'يعكس الانبساط مدى راحتك في التواصل والعمل ضمن فريق.'],
      agreeableness: ['التعاون', 'تعاطف / مشاركة', 'التعاون يدعم مجالات التعليم، الرعاية، والعمل الجماعي.'],
      neuroticism: ['الحساسية للضغط', 'تنظيم الضغط', 'ارتفاع الحساسية للضغط يعني أن بيئة تعلم داعمة ومنظمة قد تكون أفضل.'],
    },
  },
  he: {
    loading: 'טוען…',
    errorTitle: 'שגיאה',
    missingStudent: 'אין studentId.',
    loadFailed: 'טעינת התוצאות נכשלה.',
    somethingWrong: 'אירעה שגיאה בעת טעינת התוצאות.',
    title: 'תוצאות אישיות',
    subtitle: 'תוצאות אישיות לפי דפוס התשובות שלך',
    confidence: (value) => `ביטחון ${value}%`,
    heroSummary: 'הפרופיל שלך מציג נטייה גבוהה ליציבות, שיתוף פעולה וחשיבה מאורגנת.',
    quickTitle: 'סיכום מהיר',
    quickText: 'התוצאות משקפות דפוס כללי לפי התשובות שלך, ומסייעות לשפר את התאמת תחומי הלימוד.',
    traitsTitle: 'חמש תכונות האישיות',
    radarTitle: 'מפת תכונות האישיות',
    radarBadge: 'Big Five',
    chartTitle: 'תרשים',
    chartHint: 'השוואה קצרה בין חמש התכונות.',
    chartEmpty: 'אין מספיק נתונים להצגת התרשים.',
    chartTapHint: 'לחץ/י על תכונה בגרף כדי לראות הסבר',
    close: 'סגור',
    meaningTitle: 'מה זה אומר?',
    meaningText: 'מצפוניות גבוהה תומכת בתחומים שדורשים תכנון ואחריות, פתיחות גבוהה מתאימה ליצירה ולמחקר, מוחצנות תומכת בעבודה חברתית וצוותית, נעימות חשובה לחינוך, טיפול ושיתוף פעולה, ונוירוטיות גבוהה יותר מצביעה על צורך בסביבת למידה תומכת.',
    recommendationTitle: 'איך זה משפיע על ההמלצות?',
    recommendationText: 'המערכת משתמשת בתוצאות האישיות כחלק מההתאמה, יחד עם יכולות לימודיות, תחומי עניין ותוצאות משחקים.',
    fullReport: 'פירוט הדוח המלא',
    backHome: 'חזרה לדף הבית',
    traits: {
      openness: ['פתיחות', 'יצירה / מחקר', 'פתיחות גבוהה תומכת בתחומים יצירתיים ומחקריים.'],
      conscientiousness: ['מצפוניות', 'ארגון / התמדה', 'רמת הארגון וההתמדה שלך יכולה להתחזק עם תרגול ותכנון.'],
      extraversion: ['מוחצנות', 'תקשורת / צוות', 'מוחצנות משקפת נוחות בתקשורת ובעבודה עם אחרים.'],
      agreeableness: ['נעימות', 'שיתוף / אמפתיה', 'נעימות תומכת בחינוך, טיפול ועבודת צוות.'],
      neuroticism: ['נוירוטיות', 'רגישות ללחץ', 'רגישות גבוהה ללחץ מצביעה על צורך בסביבה תומכת ומסודרת.'],
    },
  },
  en: {
    loading: 'Loading…',
    errorTitle: 'Error',
    missingStudent: 'Missing studentId.',
    loadFailed: 'Failed to load results.',
    somethingWrong: 'Something went wrong while loading results.',
    title: 'Personality Results',
    subtitle: 'Personality results based on your answer patterns',
    confidence: (value) => `Confidence ${value}%`,
    heroSummary: 'Your profile shows a good tendency toward stability, cooperation, and organized thinking.',
    quickTitle: 'Quick Summary',
    quickText: 'These results reflect a general pattern from your answers and help improve major recommendations.',
    traitsTitle: 'Big Five Traits',
    radarTitle: 'Personality Trait Map',
    radarBadge: 'Big Five',
    chartTitle: 'Chart',
    chartHint: 'A compact comparison across the five traits.',
    chartEmpty: 'Not enough data to show the chart.',
    chartTapHint: 'Tap a trait on the chart to see details',
    close: 'Close',
    meaningTitle: 'What does this mean?',
    meaningText: 'Conscientiousness supports fields that require planning and responsibility, openness supports creative and research paths, extraversion supports social and team fields, agreeableness supports education, care, and teamwork, and higher neuroticism suggests the student may benefit from supportive learning environments.',
    recommendationTitle: 'How does this affect recommendations?',
    recommendationText: 'The system uses personality results as one part of the match, together with learning abilities, interests, and game results.',
    fullReport: 'Full Report Details',
    backHome: 'Back Home',
    traits: {
      openness: ['Openness', 'Creativity / research', 'Higher openness supports creative and research-oriented fields.'],
      conscientiousness: ['Conscientiousness', 'Organization / persistence', 'Organization and persistence can grow stronger with practice and planning.'],
      extraversion: ['Extraversion', 'Communication / teams', 'Extraversion reflects comfort with communication and team settings.'],
      agreeableness: ['Agreeableness', 'Cooperation / empathy', 'Agreeableness supports education, care, and teamwork.'],
      neuroticism: ['Neuroticism', 'Stress sensitivity', 'Higher stress sensitivity suggests a supportive learning environment may help.'],
    },
  },
};

const traitOrder = [
  ['openness', 'openness'],
  ['conscientiousness', 'conscientiousness'],
  ['extraversion', 'extraversion'],
  ['agreeableness', 'agreeableness'],
  ['neuroticism', 'neuroticism'],
];

export default function PersonalityResultsScreen({ navigateTo, studentId, language = 'ar' }) {
  const { i18n } = useTranslation();
  const lang = normalizeLang(language || i18n.language);
  const isRtl = lang === 'ar' || lang === 'he';
  const c = copy[lang];
  useEffect(() => {
    if (normalizeLang(i18n.language) !== lang) {
      i18n.changeLanguage(lang).catch(() => {});
    }
  }, [i18n, lang]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);
  const [selectedTraitIndex, setSelectedTraitIndex] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (!studentId) {
          Alert.alert(c.errorTitle, c.missingStudent);
          return;
        }

        setLoading(true);
        const res = await getStudentPersonalityProfile(studentId);
        if (!mounted) return;

        if (!res?.success) {
          Alert.alert(c.errorTitle, res?.error || c.loadFailed);
          setProfile(null);
          setInsights(null);
          return;
        }

        setProfile(res.profile || null);
        setInsights(res.insights || null);
      } catch (error) {
        console.log('PersonalityResultsScreen error:', error?.message || error);
        Alert.alert(c.errorTitle, c.somethingWrong);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [studentId, lang]);

  const confidence = pct(profile?.confidence_level);
  const traits = useMemo(
    () =>
      traitOrder.map(([key, field]) => {
        const [title, label, explanation] = c.traits[key];
        return { key, title, label, explanation, value: pct(profile?.[field]) };
      }),
    [c, profile]
  );
  const hasChartData = traits.some((trait) => trait.value > 0);
  const radarLabels = traits.map((trait) => trait.title);
  const radarValues = traits.map((trait) => trait.value);
  const selectedTrait =
    selectedTraitIndex != null && traits[selectedTraitIndex] ? traits[selectedTraitIndex] : null;
  const description =
    lang === 'he'
      ? insights?.personality_type_description_he
      : lang === 'en'
        ? insights?.personality_type_description_en
        : insights?.personality_type_description_ar;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E4FBF" />
        <Text style={styles.centerText}>{c.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageInner}>
          <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
            <View style={[styles.heroTop, isRtl && styles.rowReverse]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>5</Text>
              </View>
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, isRtl && styles.rtlText]}>{c.title}</Text>
                <Text style={[styles.heroSubtitle, isRtl && styles.rtlText]}>{c.subtitle}</Text>
              </View>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>{c.confidence(confidence)}</Text>
              </View>
            </View>
            <Text style={[styles.heroSummary, isRtl && styles.rtlText]}>{c.heroSummary}</Text>
          </LinearGradient>

          <InfoCard icon="sparkles" title={c.quickTitle} text={description || c.quickText} isRtl={isRtl} />

          <View style={styles.radarCard}>
            {hasChartData ? (
              <>
                <View style={styles.chartWrap}>
                  <RadarChart
                    labels={radarLabels}
                    values={radarValues}
                    headerTitle={c.radarTitle}
                    headerBadge={c.radarBadge}
                    maxItems={5}
                    preserveOrder
                    interactive
                    selectedIndex={selectedTraitIndex}
                    onTraitPress={setSelectedTraitIndex}
                  />
                </View>
                <Text style={[styles.chartTapHint, isRtl && styles.rtlText]}>{c.chartTapHint}</Text>
              </>
            ) : (
              <Text style={[styles.emptyChart, isRtl && styles.rtlText]}>{c.chartEmpty}</Text>
            )}
          </View>

          <TraitDetailModal
            visible={Boolean(selectedTrait)}
            trait={selectedTrait}
            isRtl={isRtl}
            closeLabel={c.close}
            onClose={() => setSelectedTraitIndex(null)}
          />

          <InfoCard icon="help" title={c.meaningTitle} text={c.meaningText} isRtl={isRtl} />
          <InfoCard icon="link" title={c.recommendationTitle} text={c.recommendationText} isRtl={isRtl} />

          <View style={styles.footerCard}>
            <Pressable
              onPress={() => navigateTo('studentInsightReport', { studentId, language: lang })}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.primaryBtnText}>{c.fullReport}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigateTo('home')}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.secondaryBtnText}>{c.backHome}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoCard({ icon, title, text, isRtl }) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoHeader, isRtl && styles.rowReverse]}>
        <View style={styles.infoIcon}>
          <Text style={styles.infoIconText}>{icon === 'sparkles' ? 'i' : icon === 'help' ? '?' : '↗'}</Text>
        </View>
        <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{title}</Text>
      </View>
      <Text style={[styles.bodyText, isRtl && styles.rtlText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 28, flexGrow: 1 },
  pageInner: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '800' },

  hero: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  heroTitle: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '900' },
  heroSubtitle: { color: '#EAF0FF', marginTop: 4, fontSize: 16, lineHeight: 20, fontWeight: '800' },
  heroSummary: { color: '#F8FBFF', marginTop: 14, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  confidencePill: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 7 },
  confidenceText: { color: '#fff', fontWeight: '900', fontSize: 17 },

  radarCard: {
    marginTop: 14,
    backgroundColor: '#F8FAFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    shadowColor: '#102A68',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    overflow: 'visible',
  },
  chartWrap: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    overflow: 'visible',
  },
  chartTapHint: {
    marginTop: 14,
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  infoCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  infoIcon: { width: 30, height: 30, borderRadius: 11, backgroundColor: '#EAF0FF', alignItems: 'center', justifyContent: 'center' },
  infoIconText: { color: '#1E4FBF', fontWeight: '900' },
  sectionTitle: { flex: 1, color: '#102A68', fontSize: 18, lineHeight: 24, fontWeight: '900' },
  bodyText: { color: '#334155', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  muted: { color: '#64748B', marginTop: 4, fontSize: 16, lineHeight: 19, fontWeight: '700' },

  emptyChart: { marginTop: 10, color: '#64748B', fontWeight: '800', lineHeight: 20 },

  footerCard: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    gap: 10,
  },
  primaryBtn: { minHeight: 48, borderRadius: 14, backgroundColor: '#1E4FBF', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryBtn: { minHeight: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#1E4FBF', alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#1E4FBF', fontWeight: '900', fontSize: 16 },
  btnPressed: { transform: [{ scale: 0.99 }] },
  rowReverse: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
});
