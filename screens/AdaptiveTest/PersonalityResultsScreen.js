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
import { getStudentPersonalityProfile } from '../../services/personalityTestService';

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function toPct(v) {
  return `${Math.round(clamp(safeNum(v, 0), 0, 100))}%`;
}

export default function PersonalityResultsScreen({
  navigateTo,
  studentId,
  language = 'ar',
}) {
  const { t, i18n } = useTranslation();

  // Keep i18n synced with prop
  useEffect(() => {
    const nextLang = String(language).toLowerCase() === 'he' ? 'he' : 'ar';
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const isArabic = String(i18n.language).toLowerCase() !== 'he';

  // Safe translator with fallback (language-aware)
  const tt = (key, fallbackAr, fallbackHe) => {
    const v = t(key);
    if (typeof v === 'string' && v !== key) return v;
    return isArabic ? fallbackAr : fallbackHe;
  };

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!studentId) {
          Alert.alert(
            tt('errors.title', 'خطأ', 'שגיאה'),
            tt('errors.somethingWrong', 'لا يوجد studentId.', 'אין studentId.')
          );
          return;
        }

        setLoading(true);
        const res = await getStudentPersonalityProfile(studentId);

        if (!mounted) return;

        if (!res?.success) {
          Alert.alert(
            tt('errors.title', 'خطأ', 'שגיאה'),
            res?.error ||
              tt('errors.tryAgain', 'فشل تحميل النتائج.', 'טעינת התוצאות נכשלה.')
          );
          setProfile(null);
          setInsights(null);
          return;
        }

        setProfile(res.profile || null);
        setInsights(res.insights || null);
      } catch (e) {
        console.log('PersonalityResultsScreen error:', e?.message || e);
        Alert.alert(
          tt('errors.title', 'خطأ', 'שגיאה'),
          tt(
            'errors.somethingWrong',
            'حدث خطأ أثناء تحميل النتائج.',
            'אירעה שגיאה בעת טעינת התוצאות.'
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // NOTE: rerun when student changes OR language changes
  }, [studentId, i18n.language]);

  const traits = useMemo(() => {
    const p = profile || {};

    // If you want these in JSON later, you can add keys. For now, keep bilingual fallbacks.
    return [
      {
        key: 'O',
        title: isArabic ? 'الانفتاح' : 'פתיחות',
        subtitle: isArabic ? 'أفكار جديدة / فضول' : 'סקרנות / חידוש',
        value: safeNum(p.openness, 0),
      },
      {
        key: 'C',
        title: isArabic ? 'الانضباط' : 'מצפוניות',
        subtitle: isArabic ? 'تنظيم / التزام' : 'ארגון / התמדה',
        value: safeNum(p.conscientiousness, 0),
      },
      {
        key: 'E',
        title: isArabic ? 'الانبساط' : 'מוחצנות',
        subtitle: isArabic ? 'طاقة اجتماعية' : 'אנרגיה חברתית',
        value: safeNum(p.extraversion, 0),
      },
      {
        key: 'A',
        title: isArabic ? 'التوافق' : 'נעימות',
        subtitle: isArabic ? 'تعاون / تعاطف' : 'שיתופיות / אמפתיה',
        value: safeNum(p.agreeableness, 0),
      },
      {
        key: 'N',
        title: isArabic ? 'القلق' : 'נוירוטיות',
        subtitle: isArabic ? 'حساسية للضغط' : 'רגישות ללחץ',
        value: safeNum(p.neuroticism, 0),
      },
    ];
  }, [profile, isArabic]);

  const radarData = useMemo(() => {
    // If your RadarChart expects { label, value } use this.
    return traits.map((tr) => ({ label: tr.key, value: clamp(tr.value, 0, 100) }));
  }, [traits]);

  const headline = useMemo(() => {
    if (!profile) {
      return tt(
        'personalityResults.noResultsYet',
        'لا توجد نتائج بعد',
        'אין תוצאות עדיין'
      );
    }

    const conf = safeNum(profile.confidence_level, 0);

    // Prefer translation key; fallback is language-aware
    return tt(
      'personalityResults.headlineWithConfidence',
      `نتائج الشخصية (ثقة ${Math.round(conf)}%)`,
      `תוצאות אישיות (ביטחון ${Math.round(conf)}%)`
    );
  }, [profile, tt]);

  const descriptionText = useMemo(() => {
    if (insights) {
      return isArabic
        ? (insights.personality_type_description_ar || '')
        : (insights.personality_type_description_he || '');
    }
    if (!profile) return '';

    return tt(
      'personalityResults.defaultDescription',
      'هذه النتائج تعكس نمطًا عامًّا بناءً على إجاباتك.',
      'התוצאות משקפות דפוס כללי לפי התשובות שלך.'
    );
  }, [insights, profile, isArabic, tt]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.centerText}>
          {tt('common.loading', 'جاري التحميل…', 'טוען…')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.hero}>
        <Text style={styles.heroTitle}>
          {tt('personalityResults.title', 'نتائج الشخصية', 'תוצאות אישיות')}
        </Text>
        <Text style={styles.heroSubtitle}>{headline}</Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {tt('personalityResults.summary', 'الملخص', 'סיכום')}
        </Text>
        <Text style={styles.desc}>{descriptionText || '—'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            {tt('personalityResults.traits', 'الصفات', 'מאפיינים')}
          </Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Big Five</Text>
          </View>
        </View>

        <View style={styles.traitsGrid}>
          {traits.map((tr) => (
            <View key={tr.key} style={styles.traitBox}>
              <Text style={styles.traitTitle}>{tr.title}</Text>
              <Text style={styles.traitPct}>{toPct(tr.value)}</Text>
              <Text style={styles.traitSub}>{tr.subtitle}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {tt('personalityResults.chartTitle', 'الرسم البياني', 'תרשים')}
        </Text>
        <Text style={styles.muted}>
          {tt('personalityResults.chartHint', 'صورة عامة لتوزيع السمات.', 'תמונה כללית של התפלגות התכונות.')}
        </Text>

        <View style={{ marginTop: 12 }}>
          <RadarChart data={radarData} />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => navigateTo('home')}
          style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.btnPressed : null]}
        >
          <Text style={styles.secondaryBtnText}>
            {tt('personalityResults.backHome', 'العودة للرئيسية', 'חזרה לדף הבית')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigateTo('testResults')}
          style={({ pressed }) => [styles.primaryBtn, pressed ? styles.btnPressed : null]}
        >
          <Text style={styles.primaryBtnText}>
            {tt('personalityResults.fullTestResults', 'نتائج الاختبار الكامل', 'תוצאות המבחן המלא')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 26 },

  hero: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroSubtitle: { color: '#EAF0FF', marginTop: 8, fontSize: 13, fontWeight: '700' },

  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  desc: { marginTop: 8, color: '#334155', fontWeight: '700', lineHeight: 20 },
  muted: { marginTop: 6, color: '#64748B', fontWeight: '700' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: '#1E40AF', fontWeight: '900', fontSize: 12 },

  traitsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  traitBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F8FAFF',
  },
  traitTitle: { color: '#0F172A', fontWeight: '900', fontSize: 13 },
  traitPct: { marginTop: 8, color: '#1E40AF', fontWeight: '900', fontSize: 22 },
  traitSub: { marginTop: 6, color: '#64748B', fontWeight: '700', fontSize: 12 },

  actionsRow: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#334155', fontWeight: '900' },
  btnPressed: { transform: [{ scale: 0.99 }] },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '700' },
});
