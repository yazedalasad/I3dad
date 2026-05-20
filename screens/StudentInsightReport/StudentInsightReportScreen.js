// File: screens/StudentInsightReport/StudentInsightReportScreen.js
// NOTE: i18n-ready. All strings use tt('studentInsightReport.*', arFallback, heFallback)
// Later you will add:
// i18n/locales/ar/screens/StudentInsightReport.json
// i18n/locales/he/screens/StudentInsightReport.json

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';

import RadarChart from '../../components/AdaptiveTest/RadarChart';
import { supabase } from '../../config/supabase';

import { getStudentAbilities, updateAbilitiesFromSession } from '../../services/abilityService';
import { getStudentPersonalityProfile } from '../../services/personalityTestService';
import { recommendTopDegrees } from '../../services/recommendationService';
import { getStudentGameCareerSignalSummary } from '../../services/gameCareerSignalService';

/* ---------------------------- helpers ---------------------------- */

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function validTraitScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 100;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function pct(v) {
  return `${Math.round(clamp(safeNum(v, 0), 0, 100))}%`;
}
function isHe(lang) {
  return String(lang || '').toLowerCase().startsWith('he');
}
function normalizeReportLanguage(lang) {
  const value = String(lang || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('en')) return 'en';
  return 'ar';
}
function isRtlLanguage(lang) {
  const normalized = normalizeReportLanguage(lang);
  return normalized === 'ar' || normalized === 'he';
}
function dir(lang) {
  return isRtlLanguage(lang) ? 'rtl' : 'ltr';
}
function getByLang({ ar, he, en }, lang) {
  if (String(lang).toLowerCase() === 'ar') return ar || en || he || '';
  if (isHe(lang)) return he || en || ar || '';
  return en || ar || he || '';
}
function formatDateISO(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}
function localizeCopy(copy, language) {
  if (typeof copy === 'string') return copy;
  const lang = normalizeReportLanguage(language);
  return copy?.[lang] || copy?.en || copy?.ar || copy?.he || '';
}

const REASON_FALLBACKS = {
  fitCombinesAll: {
    ar: 'تعتمد هذه المطابقة على دمج نتائج الاختبار، ملف الشخصية، وإشارات الألعاب.',
    he: 'ההתאמה מבוססת על שילוב של תוצאות המבחן, פרופיל האישיות ואותות מהמשחקים.',
    en: 'This fit combines assessment results, personality, and game signals.',
  },
  personalityPlanning: {
    ar: 'ملف الشخصية يدعم مهارة التخطيط.',
    he: 'פרופיל האישיות תומך ביכולת תכנון.',
    en: 'Personality profile supports planning',
  },
  gameCreativity: {
    ar: 'إشارات الألعاب عززت الإبداع بدرجة خفيفة.',
    he: 'אותות המשחקים חיזקו במידה מסוימת יצירתיות.',
    en: 'Game signals lightly reinforced creativity',
  },
  gameProblemSolving: {
    ar: 'إشارات الألعاب عززت حل المشكلات بدرجة خفيفة.',
    he: 'אותות המשחקים חיזקו במידה מסוימת פתרון בעיות.',
    en: 'Game signals lightly reinforced problem solving',
  },
  assessmentMath: {
    ar: 'نتائج الاختبار تدعم القدرة الرياضية.',
    he: 'תוצאות המבחן תומכות ביכולת מתמטית.',
    en: 'Assessment supports math',
  },
  assessmentDataInterpretation: {
    ar: 'نتائج الاختبار تدعم تفسير البيانات.',
    he: 'תוצאות המבחן תומכות בפירוש נתונים.',
    en: 'Assessment supports data interpretation',
  },
  multipleSources: {
    ar: 'تعتمد التوصية على عدة مصادر بيانات.',
    he: 'ההמלצה מבוססת על כמה מקורות מידע.',
    en: 'The recommendation is based on multiple data sources.',
  },
};

function reasonKeyFromText(reason) {
  const value = String(reason || '').trim().toLowerCase();
  if (!value) return null;
  if (value.includes('personality profile supports planning') || value.includes('personality supported planning')) return 'personalityPlanning';
  if (value.includes('game signals lightly reinforced creativity') || value.includes('games added partial support in creativity')) return 'gameCreativity';
  if (value.includes('game signals lightly reinforced problem solving') || value.includes('games added partial support in problem solving')) return 'gameProblemSolving';
  if (value.includes('assessment supports data interpretation') || value.includes('assessment showed strength in data interpretation')) return 'assessmentDataInterpretation';
  if (value.includes('assessment supports math') || value.includes('assessment showed strength in math')) return 'assessmentMath';
  if (value.includes('recommendation is based on multiple data sources')) return 'multipleSources';
  if (value.includes('fit combines assessment results') || value.includes('is recommended because')) return 'fitCombinesAll';
  return null;
}

function getLocalizedReason(reason, language, translate) {
  const lang = normalizeReportLanguage(language);
  const key = reasonKeyFromText(reason);
  if (key) {
    const fallback = REASON_FALLBACKS[key][lang] || REASON_FALLBACKS[key].en;
    if (typeof translate === 'function') {
      const i18nKey = `studentInsightReport.reasons.${key}`;
      const translated = translate(i18nKey);
      if (typeof translated === 'string' && translated !== i18nKey) return translated;
    }
    return fallback;
  }
  if (lang === 'en') return String(reason || '');
  return String(reason || '').trim() ? REASON_FALLBACKS.multipleSources[lang] : '';
}

function preserveDegreeCodeDirection(name) {
  return String(name || '').replace(/\b(B\.Arch|B\.Sc|B\.A|LL\.B|M\.A|M\.Sc|Ph\.D)\b/g, '\u200E$1\u200E');
}

function normalizeBigFive(profile) {
  const source =
    profile?.bigFive ||
    profile?.traits ||
    profile?.scores ||
    profile?.personalityProfile?.bigFive ||
    profile?.personalityProfile?.traits ||
    profile?.personalityProfile?.scores ||
    profile?.personalityProfile ||
    profile?.metadata?.bigFive ||
    profile?.metadata?.traits ||
    profile?.metadata?.scores ||
    profile?.metadata?.personalityProfile?.bigFive ||
    profile?.metadata?.personalityProfile?.traits ||
    profile?.metadata?.personalityProfile?.scores ||
    profile?.metadata?.personalityProfile ||
    profile ||
    {};

  return {
    openness: Number(source.openness ?? source.openess ?? source.O ?? source.o),
    conscientiousness: Number(source.conscientiousness ?? source.C ?? source.c),
    extraversion: Number(source.extraversion ?? source.E ?? source.e),
    agreeableness: Number(source.agreeableness ?? source.A ?? source.a),
    neuroticism: Number(source.neuroticism ?? source.N ?? source.n),
  };
}

/* ----------------------- tiny UI components ---------------------- */

function Chip({ icon, label, tone = 'soft', style }) {
  return (
    <View style={[styles.chip, tone === 'strong' ? styles.chipStrong : null, style]}>
      <Ionicons name={icon} size={14} color={tone === 'strong' ? '#0B2A66' : '#EAF0FF'} />
      <Text style={[styles.chipText, tone === 'strong' ? styles.chipTextStrong : null]}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ title, subtitle, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color="#1E4FBF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

function StatTile({ label, value, hint }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

function OverviewTile({ icon, label, value, hint }) {
  return (
    <View style={styles.overviewTile}>
      <View style={styles.overviewIcon}>
        <Ionicons name={icon} size={17} color="#1E4FBF" />
      </View>
      <View style={styles.overviewText}>
        <Text style={styles.overviewLabel}>{label}</Text>
        {!!hint && <Text style={styles.overviewHint}>{hint}</Text>}
      </View>
      <View style={styles.percentBadge}>
        <Text style={styles.percentBadgeText}>{value}</Text>
      </View>
    </View>
  );
}

function EmptyState({ icon = 'information-circle', text, tone = 'info' }) {
  return (
    <View style={[styles.emptyState, tone === 'warning' ? styles.emptyStateWarning : null]}>
      <View style={[styles.emptyIcon, tone === 'warning' ? styles.emptyIconWarning : null]}>
        <Ionicons name={icon} size={17} color={tone === 'warning' ? '#A16207' : '#1E4FBF'} />
      </View>
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

function BarRow({ label, value, right, accent = '#F5B301' }) {
  const v = clamp(safeNum(value, 0), 0, 100);
  return (
    <View style={styles.barRow}>
      <View style={styles.barContent}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${v}%`, backgroundColor: accent }]} />
        </View>
      </View>
      <Text style={styles.barRight}>{right ?? pct(v)}</Text>
    </View>
  );
}

function TableHeader({ cols = [] }) {
  return (
    <View style={styles.tableHeader}>
      {cols.map((c) => (
        <Text key={c.key} style={[styles.tableHeaderCell, { flex: c.flex ?? 1 }]}>
          {c.label}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ cols = [] }) {
  return (
    <View style={styles.tableRow}>
      {cols.map((c) => (
        <Text
          key={c.key}
          style={[styles.tableCell, { flex: c.flex ?? 1 }]}
          numberOfLines={1}
        >
          {c.value}
        </Text>
      ))}
    </View>
  );
}

/* ----------------------- PDF HTML Builder ------------------------ */

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildReportHtml({
  lang,
  t,
  student,
  personality,
  abilities = [],
  interests = [],
  recommendations = [],
  meta = {},
}) {
  const rtl = dir(lang);
  const title = t('studentInsightReport.pdfTitle', 'تقرير الطالب', 'דו"ח תלמיד');
  const subtitle = t(
    'studentInsightReport.pdfSubtitle',
    'ملخص الشخصية والقدرات والتوصيات',
    'סיכום אישיות, יכולות והמלצות'
  );

  const studentName =
    student?.full_name ||
    student?.name ||
    t('studentInsightReport.unknownStudent', 'طالب', 'תלמיד');

  const dateLine = `${t('studentInsightReport.generatedAt', 'تاريخ الإنشاء', 'נוצר בתאריך')}: ${escapeHtml(
    new Date().toLocaleString()
  )}`;

  const bigFive = normalizeBigFive(personality);
  const traitRows = [
    { k: 'O', label: t('studentInsightReport.traitO', 'الانفتاح', 'פתיחות'), v: safeNum(bigFive.openness, 0) },
    { k: 'C', label: t('studentInsightReport.traitC', 'الانضباط', 'מצפוניות'), v: safeNum(bigFive.conscientiousness, 0) },
    { k: 'E', label: t('studentInsightReport.traitE', 'الانبساط', 'מוחצנות'), v: safeNum(bigFive.extraversion, 0) },
    { k: 'A', label: t('studentInsightReport.traitA', 'التوافق', 'נעימות'), v: safeNum(bigFive.agreeableness, 0) },
    { k: 'N', label: t('studentInsightReport.traitN', 'القلق', 'נוירוטיות'), v: safeNum(bigFive.neuroticism, 0) },
  ];

  const topAbilities = [...abilities]
    .sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
    .slice(0, 8);

  const topInterests = [...interests]
    .sort((a, b) => safeNum(b.interest_score) - safeNum(a.interest_score))
    .slice(0, 8);

  const recTop = [...recommendations].slice(0, 5);

  const abilityRowsHtml = topAbilities
    .map((a) => {
      const name = escapeHtml(getByLang({
        ar: a?.subjects?.name_ar,
        he: a?.subjects?.name_he,
        en: a?.subjects?.name_en
      }, lang) || '—');

      const score = clamp(safeNum(a.ability_score, 0), 0, 100);
      return `
        <div class="row">
          <div class="label">${name}</div>
          <div class="bar"><div class="fill" style="width:${score}%"></div></div>
          <div class="val">${Math.round(score)}%</div>
        </div>
      `;
    })
    .join('');

  const interestRowsHtml = topInterests
    .map((i) => {
      const name = escapeHtml(getByLang({
        ar: i?.subjects?.name_ar,
        he: i?.subjects?.name_he,
        en: i?.subjects?.name_en
      }, lang) || '—');

      const score = clamp(safeNum(i.interest_score, 0), 0, 100);
      return `
        <div class="row">
          <div class="label">${name}</div>
          <div class="bar"><div class="fill fill2" style="width:${score}%"></div></div>
          <div class="val">${Math.round(score)}%</div>
        </div>
      `;
    })
    .join('');

  const traitHtml = traitRows
    .map((tr) => {
      const v = clamp(safeNum(tr.v, 0), 0, 100);
      return `
        <div class="trait">
          <div class="traitTop">
            <div class="traitLabel">${escapeHtml(tr.label)} <span class="code">(${tr.k})</span></div>
            <div class="traitVal">${Math.round(v)}%</div>
          </div>
          <div class="bar"><div class="fill" style="width:${v}%"></div></div>
        </div>
      `;
    })
    .join('');

  const recHtml = recTop
    .map((r, idx) => {
      const name = escapeHtml(preserveDegreeCodeDirection(r?.name_he || r?.name_en || r?.name_ar || '—'));
      const score = clamp(safeNum(r?.score_percent, safeNum(r?.score, 0) * 100), 0, 100);
      const topSubjects = (r?.explanation?.top_subjects || [])
        .slice(0, 4)
        .map((s) => escapeHtml(s?.subject_name_he || s?.subject_name_en || s?.subject_name_ar || ''))
        .filter(Boolean)
        .join(' • ');
      const topReasons = (r?.top_reasons || [])
        .slice(0, 3)
        .map((reason) => escapeHtml(getLocalizedReason(reason, lang, t)))
        .join(' • ');
      const confidence = escapeHtml(localizeCopy(r?.confidence_reason, lang));
      const explanation = typeof r?.explanation === 'string'
        ? escapeHtml(getLocalizedReason(r.explanation, lang, t))
        : '';

      return `
        <div class="rec">
          <div class="recTop">
            <div class="recRank">#${idx + 1}</div>
            <div class="recName">${name}</div>
            <div class="recScore">${Math.round(score)}%</div>
          </div>
          <div class="bar"><div class="fill fill3" style="width:${score}%"></div></div>
          <div class="recWhy">${escapeHtml(
            t('studentInsightReport.whyRecommended', 'سبب التوصية', 'למה מומלץ?', 'Why recommended?')
          )}: <span>${topReasons || topSubjects || explanation || '—'}</span></div>
          <div class="muted">${confidence}</div>
        </div>
      `;
    })
    .join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      direction: ${rtl};
      padding: 22px;
      color: #0F172A;
      background: #F6F8FF;
    }
    .hero {
      background: linear-gradient(135deg, #1B3A8A, #1E4FBF);
      color: white;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 14px;
    }
    .hero h1 { margin: 0; font-size: 22px; font-weight: 900; }
    .hero .sub { margin-top: 6px; color: #EAF0FF; font-weight: 800; }
    .hero .meta { margin-top: 10px; color: #DDE7FF; font-weight: 800; font-size: 12px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      background: #fff;
      border-radius: 18px;
      padding: 14px;
      border: 1px solid #E6ECFF;
      margin-bottom: 12px;
    }
    .title {
      font-weight: 900;
      color: #102A68;
      margin: 0 0 10px 0;
    }
    .row {
      display: grid;
      grid-template-columns: 1.4fr 2.6fr 0.6fr;
      gap: 10px;
      align-items: center;
      margin: 8px 0;
    }
    .label { font-weight: 800; color: #0F172A; font-size: 12px; }
    .val { font-weight: 900; color: #102A68; text-align: left; }
    .bar {
      height: 10px;
      background: #EEF3FF;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #E6ECFF;
    }
    .fill { height: 100%; background: #F5B301; border-radius: 999px; }
    .fill2 { background: #27ae60; }
    .fill3 { background: #4F8BFF; }
    .trait { margin-bottom: 10px; }
    .traitTop { display:flex; justify-content: space-between; align-items:center; }
    .traitLabel { font-weight: 900; color:#0F172A; }
    .traitVal { font-weight: 900; color:#1E4FBF; }
    .code { color:#64748B; font-weight: 900; }
    .rec { margin-bottom: 12px; }
    .recTop {
      display:flex;
      align-items:center;
      justify-content: space-between;
      gap: 10px;
    }
    .recRank { font-weight: 900; color:#27ae60; }
    .recName { font-weight: 900; flex: 1; }
    .recScore { font-weight: 900; color:#102A68; }
    .recWhy { margin-top: 8px; color:#334155; font-weight: 800; font-size: 12px; }
    .muted { color:#64748B; font-weight: 800; font-size: 12px; }
    .footer { margin-top: 12px; color:#64748B; font-weight: 800; font-size: 11px; }
    @media print {
      body { background: #fff; }
      .card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${escapeHtml(title)} — ${escapeHtml(studentName)}</h1>
    <div class="sub">${escapeHtml(subtitle)}</div>
    <div class="meta">${escapeHtml(dateLine)}</div>
  </div>

  <div class="grid">
    <div class="card">
      <h3 class="title">${escapeHtml(t('studentInsightReport.personality', 'الشخصية', 'אישיות'))}</h3>
      ${traitHtml || `<div class="muted">—</div>`}
      <div class="footer">${escapeHtml(t('studentInsightReport.personalityNote', 'ملاحظة: النتائج تقديرية.', 'הערה: התוצאות משוערות.'))}</div>
    </div>

    <div class="card">
      <h3 class="title">${escapeHtml(t('studentInsightReport.abilityTop', 'أقوى القدرات', 'יכולות חזקות'))}</h3>
      ${abilityRowsHtml || `<div class="muted">—</div>`}
      <div class="footer">${escapeHtml(t('studentInsightReport.abilityNote', 'تم حسابها من إجابات الاختبار.', 'חושב על בסיס תשובות המבחן.'))}</div>
    </div>
  </div>

  <div class="card">
    <h3 class="title">${escapeHtml(t('studentInsightReport.interestsTop', 'أعلى الاهتمامات', 'תחומי עניין מובילים'))}</h3>
    ${interestRowsHtml || `<div class="muted">—</div>`}
  </div>

  <div class="card">
    <h3 class="title">${escapeHtml(t('studentInsightReport.recommendations', 'المسارات المقترحة', 'מסלולים מומלצים'))}</h3>
    ${recHtml || `<div class="muted">${escapeHtml(
      t('studentInsightReport.noRecommendations', 'لا توجد توصيات بعد.', 'אין המלצות עדיין.')
    )}</div>`}
  </div>

  <div class="footer">
    ${escapeHtml(t('studentInsightReport.pdfFooter', 'تم إنشاء هذا التقرير تلقائيًا من بيانات النظام.', 'דוח זה נוצר אוטומטית מנתוני המערכת.'))}
  </div>
</body>
</html>
`;
}

/* -------------------------- MAIN SCREEN --------------------------- */

export default function StudentInsightReportScreen({
  navigateTo,
  studentId,
  abilitySessionId = null,       // total_exam session id (optional)
  personalitySessionId = null,   // personality session id (optional; we still pull latest profile)
  language = 'ar',
}) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  // Keep i18n synced with prop
  useEffect(() => {
    const nextLang = normalizeReportLanguage(language);
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const lang = i18n.language;
  const currentLang = normalizeReportLanguage(lang);
  const isArabic = currentLang === 'ar';
  const isRtl = isRtlLanguage(currentLang);

  const tt = (key, fallbackAr, fallbackHe, fallbackEn = fallbackHe) => {
    const v = t(key);
    if (typeof v === 'string' && v !== key) return v;
    if (currentLang === 'en') return fallbackEn;
    return isArabic ? fallbackAr : fallbackHe;
  };

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [student, setStudent] = useState(null);

  const [personality, setPersonality] = useState(null);
  const [personalityInsights, setPersonalityInsights] = useState(null);

  const [abilities, setAbilities] = useState([]); // from student_abilities (total_exam)
  const [interests, setInterests] = useState([]); // from student_interests (total_exam)
  const [recommendations, setRecommendations] = useState([]); // top degrees
  const [gameCareerSignals, setGameCareerSignals] = useState({ skills: [], topics: [], degrees: [], explanations: [] });

  const [meta, setMeta] = useState({
    abilityUpdated: false,
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!studentId) {
          Alert.alert(
            tt('errors.title', 'خطأ', 'שגיאה'),
            tt('studentInsightReport.missingStudentId', 'لا يوجد studentId.', 'אין studentId.')
          );
          return;
        }

        setLoading(true);

        // 1) Student basic (optional - if your schema differs, safely ignore)
        try {
          const { data: stu, error: sErr } = await supabase
            .from('students')
            .select('id, full_name, name, created_at')
            .eq('id', studentId)
            .maybeSingle();

          if (!sErr && stu) setStudent(stu);
        } catch {
          // ignore
        }

        // 2) If abilitySessionId provided, compute abilities from this session (idempotent-ish)
        let abilityWasUpdated = false;
        if (abilitySessionId) {
          const up = await updateAbilitiesFromSession(abilitySessionId);
          abilityWasUpdated = !!up?.success;
        }

        // 3) Load abilities snapshot
        const aRes = await getStudentAbilities(studentId);
        if (!aRes?.success) {
          // abilities can be empty if no total exam yet
        }

        // 4) Personality latest profile (service already returns latest for student)
        const pRes = await getStudentPersonalityProfile(studentId);
        if (!pRes?.success) {
          // can be empty if not taken yet
        }

        // 5) Interests: pull student_interests (only examType total_exam if you used metadata)
        let interestsRows = [];
        try {
          const { data: iRows, error: iErr } = await supabase
            .from('student_interests')
            .select(
              `
              *,
              subjects (
                id,
                name_ar,
                name_en,
                name_he
              )
            `
            )
            .eq('student_id', studentId);

          if (!iErr) {
            // keep only total_exam if available in metadata, else keep all
            interestsRows = (iRows || []).filter((r) => {
              const ex = r?.metadata?.examType;
              return !ex || ex === 'total_exam';
            });
          }
        } catch {
          // ignore
        }

        // 6) Recommendations
        const [rRes, gameSignalRes] = await Promise.all([
          recommendTopDegrees(studentId, { limit: 5 }),
          getStudentGameCareerSignalSummary(studentId),
        ]);
        const recs = rRes?.success ? (rRes?.data || []) : [];

        if (!mounted) return;

        setMeta((m) => ({ ...m, abilityUpdated: abilityWasUpdated }));
        setAbilities(aRes?.success ? (aRes.abilities || []) : []);
        setPersonality(pRes?.success ? (pRes.profile || null) : null);
        setPersonalityInsights(pRes?.success ? (pRes.insights || null) : null);
        setInterests(interestsRows || []);
        setRecommendations(recs || []);
        setGameCareerSignals(gameSignalRes || { skills: [], topics: [], degrees: [], explanations: [] });
      } catch (e) {
        console.log('StudentInsightReportScreen error:', e?.message || e);
        Alert.alert(
          tt('errors.title', 'خطأ', 'שגיאה'),
          tt(
            'studentInsightReport.loadFailed',
            'فشل تحميل تقرير الطالب.',
            'טעינת הדוח נכשלה.'
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentId, abilitySessionId, personalitySessionId, lang]);

  /* ------------------------ derived data ------------------------- */

  const studentName = useMemo(() => {
    return (
      student?.full_name ||
      student?.name ||
      tt('studentInsightReport.student', 'الطالب', 'תלמיד')
    );
  }, [student, isArabic]);

  const bigFive = useMemo(() => normalizeBigFive(personality), [personality]);

  const personalityTraits = useMemo(() => {
    return [
      {
        key: 'O',
        title: tt('studentInsightReport.traitO', 'الانفتاح', 'פתיחות'),
        sub: tt('studentInsightReport.traitOHint', 'فضول وأفكار جديدة', 'סקרנות וחידוש'),
        value: safeNum(bigFive.openness, 0),
      },
      {
        key: 'C',
        title: tt('studentInsightReport.traitC', 'الانضباط', 'מצפוניות'),
        sub: tt('studentInsightReport.traitCHint', 'تنظيم والتزام', 'ארגון והתמדה'),
        value: safeNum(bigFive.conscientiousness, 0),
      },
      {
        key: 'E',
        title: tt('studentInsightReport.traitE', 'الانبساط', 'מוחצנות'),
        sub: tt('studentInsightReport.traitEHint', 'طاقة اجتماعية', 'אנרגיה חברתית'),
        value: safeNum(bigFive.extraversion, 0),
      },
      {
        key: 'A',
        title: tt('studentInsightReport.traitA', 'التوافق', 'נעימות'),
        sub: tt('studentInsightReport.traitAHint', 'تعاون وتعاطف', 'שיתופיות ואמפתיה'),
        value: safeNum(bigFive.agreeableness, 0),
      },
      {
        key: 'N',
        title: tt('studentInsightReport.traitN', 'القلق', 'נוירוטיות'),
        sub: tt('studentInsightReport.traitNHint', 'حساسية للضغط', 'רגישות ללחץ'),
        value: safeNum(bigFive.neuroticism, 0),
      },
    ];
  }, [bigFive, lang]);

  const personalityRadarData = useMemo(() => {
    return personalityTraits
      .filter((tr) => validTraitScore(tr.value))
      .map((tr) => ({ label: tr.key, value: clamp(tr.value, 0, 100) }));
  }, [personalityTraits]);

  const topAbilities = useMemo(() => {
    return [...(abilities || [])]
      .sort((a, b) => safeNum(b.ability_score) - safeNum(a.ability_score))
      .slice(0, 8);
  }, [abilities]);

  const abilityRadarLabels = useMemo(() => {
    return topAbilities.map((a, idx) =>
      getByLang(
        { ar: a?.subjects?.name_ar, he: a?.subjects?.name_he, en: a?.subjects?.name_en },
        lang
      ) || (isArabic ? `المادة ${idx + 1}` : `מקצוע ${idx + 1}`)
    );
  }, [topAbilities, lang, isArabic]);

  const abilityRadarValues = useMemo(() => {
    return topAbilities.map((a) => clamp(safeNum(a?.ability_score, 0), 0, 100));
  }, [topAbilities]);

  const topInterests = useMemo(() => {
    return [...(interests || [])]
      .sort((a, b) => safeNum(b.interest_score) - safeNum(a.interest_score))
      .slice(0, 8);
  }, [interests]);

  const summary = useMemo(() => {
    const pConf = clamp(safeNum(personality?.confidence_level, 0), 0, 100);

    const abilityConfAvg =
      abilities?.length
        ? Math.round(
            abilities.reduce((acc, a) => acc + clamp(safeNum(a.confidence_level, 0), 0, 100), 0) /
              abilities.length
          )
        : 0;

    const topRec = recommendations?.[0];
    const topScore = topRec
      ? Math.round(clamp(safeNum(topRec.score_percent, safeNum(topRec.score, 0) * 100), 0, 100))
      : 0;

    return { pConf, abilityConfAvg, topScore };
  }, [personality, abilities, recommendations]);

  const hasPersonalityData = personalityRadarData.length >= 3;

  /* ---------------------------- export ---------------------------- */

  const onExportPdf = async () => {
  try {
    setExporting(true);

    const html = buildReportHtml({
      lang,
      t: (key, arFallback, heFallback, enFallback) => tt(key, arFallback, heFallback, enFallback),
      student,
      personality,
      abilities,
      interests,
      recommendations,
      meta,
    });

    /* =======================
       🌐 WEB
       ======================= */
    if (Platform.OS === 'web') {
      const w = window.open('', '_blank');
      if (!w) {
        Alert.alert(
          tt('errors.title', 'خطأ', 'שגיאה'),
          tt(
            'studentInsightReport.popupBlocked',
            'يبدو أن المتصفح منع النافذة الجديدة. فعّل Popups ثم حاول مرة أخرى.',
            'נראה שהדפדפן חסם חלון חדש. אפשר/י Popups ונסה/י שוב.'
          )
        );
        return;
      }

      w.document.open();
      w.document.write(html);
      w.document.close();

      setTimeout(() => {
        w.focus();
        w.print();
      }, 300);

      return;
    }

    /* =======================
       📱 NATIVE (expo-print)
       ======================= */
    let Print;
    try {
      // IMPORTANT: require INSIDE runtime branch
      Print = require('expo-print');
    } catch {
      Alert.alert(
        tt('errors.title', 'خطأ', 'שגיאה'),
        tt(
          'studentInsightReport.printNotInstalled',
          'ميزة PDF غير متوفرة. ثبّت expo-print أولاً.',
          'אפשרות PDF לא זמינה. יש להתקין קודם expo-print.'
        )
      );
      return;
    }

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    /* =======================
       📱 NATIVE (expo-sharing)
       ======================= */
    let Sharing = null;
    try {
      // IMPORTANT: require INSIDE runtime branch
      Sharing = require('expo-sharing');
    } catch {
      Sharing = null;
    }

    const shareAsyncFn =
      Sharing?.shareAsync || Sharing?.default?.shareAsync;

    // If sharing is unavailable, still succeed
    if (!shareAsyncFn) {
      Alert.alert(
        tt('studentInsightReport.pdfReady', 'تم إنشاء ملف PDF', 'נוצר קובץ PDF'),
        uri
      );
      return;
    }

    await shareAsyncFn(uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
    });
  } catch (e) {
    Alert.alert(
      tt('errors.title', 'خطأ', 'שגיאה'),
      tt(
        'studentInsightReport.exportFailed',
        'فشل تصدير الملف PDF.',
        'ייצוא ה-PDF נכשל.'
      )
    );
  } finally {
    setExporting(false);
  }
};


  /* ------------------------------ UI ------------------------------ */

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
      {/* HERO */}
      <LinearGradient colors={['#0B2A66', '#1E4FBF']} style={styles.hero}>
        <View style={[styles.heroTopRow, !isWide ? styles.heroTopRowStacked : null]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>
              {tt(
                'studentInsightReport.heroEyebrow',
                'تقرير شامل للطالب',
                'דו"ח תלמיד מקיף'
              )}
            </Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {studentName}
            </Text>
            <Text style={styles.heroSubtitle}>
              {tt(
                'studentInsightReport.heroSubtitle',
                'الشخصية • القدرات • الاهتمامات • المسارات المقترحة',
                'אישיות • יכולות • תחומי עניין • מסלולים מומלצים'
              )}
            </Text>

            <View style={styles.chipsRow}>
              <Chip
                icon="shield-checkmark"
                label={`${tt(
                  'studentInsightReport.personalityConfidence',
                  'ثقة الشخصية',
                  'ביטחון אישיות'
                )}: ${summary.pConf}%`}
              />
              <Chip
                icon="stats-chart"
                label={`${tt(
                  'studentInsightReport.abilityConfidence',
                  'ثقة القدرات',
                  'ביטחון יכולות'
                )}: ${summary.abilityConfAvg}%`}
              />
              <Chip
                icon="sparkles"
                label={`${tt(
                  'studentInsightReport.topMatch',
                  'أفضل تطابق',
                  'התאמה מובילה'
                )}: ${summary.topScore}%`}
                tone="strong"
              />
            </View>
          </View>

          <Pressable
            onPress={onExportPdf}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel={tt('studentInsightReport.downloadPdf', 'ØªØ­Ù…ÙŠÙ„ PDF', '×”×•×¨×“ PDF')}
            style={({ pressed }) => [
              styles.exportBtn,
              !isWide ? styles.fullWidthButton : null,
              pressed ? styles.btnPressed : null,
              exporting ? styles.btnDisabled : null,
            ]}
          >
            <Ionicons name="download" size={18} color="#0B2A66" />
            <Text style={styles.exportBtnText}>
              {exporting
                ? tt('studentInsightReport.exporting', 'جاري التصدير…', 'מייצא…')
                : tt('studentInsightReport.downloadPdf', 'تحميل PDF', 'הורד PDF')}
            </Text>
          </Pressable>
        </View>

        {!!abilitySessionId && meta.abilityUpdated && (
          <Text style={styles.heroNote}>
            {tt(
              'studentInsightReport.abilityRefreshed',
              '✅ تم تحديث القدرات بناءً على جلسة الاختبار.',
              '✅ היכולות עודכנו לפי סשן המבחן.'
            )}
          </Text>
        )}
      </LinearGradient>

      {/* This redesign is UI-only; scoring, recommendation logic, Supabase queries, and calculations stay unchanged. */}
      <View style={[styles.overviewGrid, isWide ? styles.overviewGridWide : null]}>
        <OverviewTile
          icon="person-circle"
          label={tt('studentInsightReport.personalityConfidence', 'Ø§ÙƒØªÙ…Ø§Ù„ Ø§Ù„Ø´Ø®ØµÙŠØ©', '×”×©×œ×ž×ª ××™×©×™×•×ª')}
          value={`${summary.pConf}%`}
          hint={tt('studentInsightReport.personalitySection', 'Ù…Ù† Ø£Ù†ØªØŸ (Ø§Ù„Ø´Ø®ØµÙŠØ©)', '×ž×™ ××ª×”? (××™×©×™×•×ª)')}
        />
        <OverviewTile
          icon="analytics"
          label={tt('studentInsightReport.abilityConfidence', 'Ø§ÙƒØªÙ…Ø§Ù„ Ø§Ù„Ù‚Ø¯Ø±Ø§Øª', '×”×©×œ×ž×ª ×™×›×•×œ×•×ª')}
          value={`${summary.abilityConfAvg}%`}
          hint={tt('studentInsightReport.abilityTop', 'Ø£Ù‚ÙˆÙ‰ Ø§Ù„Ù‚Ø¯Ø±Ø§Øª', '×™×›×•×œ×•×ª ×—×–×§×•×ª')}
        />
        <OverviewTile
          icon="ribbon"
          label={tt('studentInsightReport.topMatch', 'Ø¯Ø±Ø¬Ø© Ø§Ù„Ù…Ù„Ø§Ø¡Ù…Ø©', '×¦×™×•×Ÿ ×”×ª××ž×”')}
          value={`${summary.topScore}%`}
          hint={tt('studentInsightReport.pathsSection', 'Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø£Ù†Ø³Ø¨ Ù„Ùƒ', '×”×ž×¡×œ×•×œ ×”×ž×ª××™× ×œ×š')}
        />
      </View>

      {/* SECTION: Personality */}
      <View style={styles.card}>
        <SectionHeader
          title={tt('studentInsightReport.personalitySection', 'من أنت؟ (الشخصية)', 'מי אתה? (אישיות)')}
          subtitle={tt(
            'studentInsightReport.personalitySectionSub',
            'Big Five — صورة عامة عن أسلوب التفكير والتصرف',
            'Big Five — תמונה כללית על דפוסי התנהגות'
          )}
          icon="person-circle"
        />

        {!personality ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-circle" size={17} color="#1E4FBF" />
            </View>
            <Text style={styles.emptyStateText}>
            {tt(
              'studentInsightReport.noPersonalityYet',
              'لا توجد نتائج شخصية بعد. أكمل اختبار الشخصية أولاً.',
              'אין תוצאות אישיות עדיין. השלם/י מבחן אישיות.'
            )}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.twoCol}>
              {hasPersonalityData ? (
              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.personalityRadar', 'خريطة السمات', 'מפת תכונות')}
                </Text>
                <View style={styles.chartWrap}>
                  <RadarChart
                    labels={personalityRadarData.map((tr) => tr.label)}
                    values={personalityRadarData.map((tr) => tr.value)}
                  />
                </View>
              </View>
              ) : (
              <View style={styles.chartEmptyCard}>
                <View style={styles.emptyStateHeader}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="analytics" size={17} color="#1E4FBF" />
                  </View>
                  <View style={styles.emptyStateCopy}>
                    <Text style={styles.emptyStateTitle}>
                      {tt(
                        'studentInsightReport.personalityMapUnavailableTitle',
                        'خريطة الشخصية غير متاحة بعد',
                        'מפת התכונות עדיין לא זמינה'
                      )}
                    </Text>
                    <Text style={styles.emptyStateText}>
                      {tt(
                        'studentInsightReport.personalityMapUnavailableText',
                        'لا توجد بيانات شخصية كافية لعرض الرسم الكامل.',
                        'אין מספיק נתוני אישיות כדי להציג תרשים מלא.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
              )}

              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.personalitySummary', 'ملخص سريع', 'סיכום מהיר')}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {personalityTraits.map((tr) => (
                    <View key={tr.key} style={styles.traitRow}>
                      <View style={styles.traitText}>
                        <Text style={styles.traitName}>
                          {tr.title} <Text style={styles.traitCode}>({tr.key})</Text>
                        </Text>
                        <Text style={styles.traitHint}>{tr.sub}</Text>
                        <View style={styles.traitBarTrack}>
                          <View
                            style={[
                              styles.traitBarFill,
                              { width: `${clamp(safeNum(tr.value, 0), 0, 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.traitValue}>{pct(tr.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.subtleCard, { marginTop: 12 }]}>
              <Text style={styles.subCardTitle}>
                {tt('studentInsightReport.personalityInsight', 'ماذا يعني ذلك؟', 'מה זה אומר?')}
              </Text>
              <Text style={styles.desc}>
                {personalityInsights
                  ? (isArabic
                      ? (personalityInsights.personality_type_description_ar || '—')
                      : (personalityInsights.personality_type_description_he || '—'))
                  : tt(
                      'studentInsightReport.personalityDefaultText',
                      'هذه النتائج تقديرية وتساعد على فهم أسلوبك العام. استخدمها كدليل، وليس كحكم.',
                      'התוצאות משוערות ומסייעות להבין את הסגנון הכללי. השתמש/י בהן ככיוון, לא כקביעה.'
                    )}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* SECTION: Ability */}
      <View style={styles.card}>
        <SectionHeader
          title={tt('studentInsightReport.abilitySection', 'ماذا تتقن؟ (القدرات)', 'מה אתה יודע? (יכולות)')}
          subtitle={tt(
            'studentInsightReport.abilitySectionSub',
            'مستوى القدرة لكل مادة بناءً على نتائج الاختبار',
            'רמת יכולת לכל מקצוע לפי תוצאות המבחן'
          )}
          icon="analytics"
        />

        {(!abilities || abilities.length === 0) ? (
          <Text style={styles.muted}>
            {tt(
              'studentInsightReport.noAbilityYet',
              'لا توجد قدرات بعد. أكمل الاختبار الشامل (Total Exam) أولاً.',
              'אין יכולות עדיין. השלם/י מבחן מלא (Total Exam).'
            )}
          </Text>
        ) : (
          <>
            <View style={styles.twoCol}>
              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.abilityRadar', 'أفضل 8 مواد', '8 מקצועות מובילים')}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <RadarChart labels={abilityRadarLabels} values={abilityRadarValues} />
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.abilityTopList', 'تفصيل سريع', 'פירוט מהיר')}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {topAbilities.map((a, idx) => {
                    const name =
                      getByLang(
                        { ar: a?.subjects?.name_ar, he: a?.subjects?.name_he, en: a?.subjects?.name_en },
                        lang
                      ) || (isArabic ? `المادة ${idx + 1}` : `מקצוע ${idx + 1}`);

                    const score = clamp(safeNum(a?.ability_score, 0), 0, 100);
                    const conf = clamp(safeNum(a?.confidence_level, 0), 0, 100);

                    return (
                      <View key={a.id || `${a.subject_id}-${idx}`} style={{ marginBottom: 10 }}>
                        <BarRow
                          label={name}
                          value={score}
                          right={`${Math.round(score)}% • ${tt(
                            'studentInsightReport.confShort',
                            'ثقة',
                            'ביטחון'
                          )} ${Math.round(conf)}%`}
                          accent="#4F8BFF"
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={[styles.subtleCard, { marginTop: 12 }]}>
              <Text style={styles.subCardTitle}>
                {tt('studentInsightReport.abilityTableTitle', 'جدول القدرات', 'טבלת יכולות')}
              </Text>

              <TableHeader
                cols={[
                  { key: 's', label: tt('studentInsightReport.colSubject', 'المادة', 'מקצוע'), flex: 1.6 },
                  { key: 'a', label: tt('studentInsightReport.colAbility', 'القدرة', 'יכולת'), flex: 0.8 },
                  { key: 'acc', label: tt('studentInsightReport.colAccuracy', 'الدقة', 'דיוק'), flex: 0.8 },
                  { key: 'c', label: tt('studentInsightReport.colConfidence', 'الثقة', 'ביטחון'), flex: 0.8 },
                ]}
              />

              {[...abilities]
                .sort((x, y) => safeNum(y.ability_score) - safeNum(x.ability_score))
                .slice(0, 12)
                .map((a, idx) => {
                  const name =
                    getByLang(
                      { ar: a?.subjects?.name_ar, he: a?.subjects?.name_he, en: a?.subjects?.name_en },
                      lang
                    ) || (isArabic ? `المادة ${idx + 1}` : `מקצוע ${idx + 1}`);
                  return (
                    <TableRow
                      key={a.id || `${a.subject_id}-${idx}`}
                      cols={[
                        { key: 's', value: name, flex: 1.6 },
                        { key: 'a', value: `${Math.round(clamp(safeNum(a.ability_score, 0), 0, 100))}%`, flex: 0.8 },
                        { key: 'acc', value: `${Math.round(clamp(safeNum(a.accuracy_rate, 0), 0, 100))}%`, flex: 0.8 },
                        { key: 'c', value: `${Math.round(clamp(safeNum(a.confidence_level, 0), 0, 100))}%`, flex: 0.8 },
                      ]}
                    />
                  );
                })}
            </View>
          </>
        )}
      </View>

      {/* SECTION: Interests */}
      <View style={styles.card}>
        <SectionHeader
          title={tt('studentInsightReport.interestSection', 'ما الذي يجذبك؟ (الاهتمامات)', 'מה מושך אותך? (תחומי עניין)')}
          subtitle={tt(
            'studentInsightReport.interestSectionSub',
            'يتم استنتاج الاهتمام من الوقت والدقة والسلوك داخل الجلسة',
            'תחומי העניין נגזרים מזמן, דיוק והתנהגות בסשן'
          )}
          icon="heart"
        />

        {(!interests || interests.length === 0) ? (
          <Text style={styles.muted}>
            {tt(
              'studentInsightReport.noInterestsYet',
              'لا توجد بيانات اهتمام بعد.',
              'אין נתוני עניין עדיין.'
            )}
          </Text>
        ) : (
          <>
            <View style={styles.twoCol}>
              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.topInterests', 'أعلى الاهتمامات', 'תחומי עניין מובילים')}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {topInterests.map((i, idx) => {
                    const name =
                      getByLang(
                        { ar: i?.subjects?.name_ar, he: i?.subjects?.name_he, en: i?.subjects?.name_en },
                        lang
                      ) || (isArabic ? `المادة ${idx + 1}` : `מקצוע ${idx + 1}`);

                    const score = clamp(safeNum(i?.interest_score, 0), 0, 100);
                    return (
                      <View key={i.id || `${i.subject_id}-${idx}`} style={{ marginBottom: 10 }}>
                        <BarRow
                          label={name}
                          value={score}
                          right={`${Math.round(score)}%`}
                          accent="#27ae60"
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.interestNotes', 'ملاحظات تفسيرية', 'הערות פרשנות')}
                </Text>

                <View style={{ marginTop: 8, gap: 10 }}>
                  <View style={styles.noteRow}>
                    <Ionicons name="flash" size={16} color="#F5B301" />
                    <Text style={styles.noteText}>
                      {tt(
                        'studentInsightReport.noteFastGuess',
                        'سرعة عالية مع دقة منخفضة قد تعني تخمينًا وليس اهتمامًا.',
                        'מהירות גבוהה עם דיוק נמוך עשויה להעיד על ניחוש ולא על עניין.'
                      )}
                    </Text>
                  </View>

                  <View style={styles.noteRow}>
                    <Ionicons name="timer" size={16} color="#4F8BFF" />
                    <Text style={styles.noteText}>
                      {tt(
                        'studentInsightReport.noteBalanced',
                        'الزمن المتوازن مع دقة جيدة غالبًا يشير إلى تفاعل صحي.',
                        'זמן מאוזן עם דיוק טוב לרוב מעיד על מעורבות בריאה.'
                      )}
                    </Text>
                  </View>

                  <View style={styles.noteRow}>
                    <Ionicons name="pulse" size={16} color="#27ae60" />
                    <Text style={styles.noteText}>
                      {tt(
                        'studentInsightReport.noteEngagement',
                        'يتم تعزيز قياس الاهتمام باستخدام مؤشر المشاركة في الجلسة.',
                        'מדידת העניין מתחזקת באמצעות מדד המעורבות בסשן.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      {/* SECTION: Game career signals */}
      <View style={styles.card}>
        <SectionHeader
          title={tt('studentInsightReport.gameSignalsSection', 'إشارات من الألعاب', 'אותות מהמשחקים')}
          subtitle={tt(
            'studentInsightReport.gameSignalsSectionSub',
            'الألعاب تضيف إشارات مهنية صغيرة ولا تستبدل نتائج الاختبار الشامل.',
            'המשחקים מוסיפים אותות קריירה קטנים ואינם מחליפים את תוצאות המבחן המלא.'
          )}
          icon="game-controller"
        />

        {!gameCareerSignals.skills?.length && !gameCareerSignals.topics?.length && !gameCareerSignals.degrees?.length ? (
          <Text style={styles.muted}>
            {tt('studentInsightReport.noGameSignals', 'لا توجد بيانات ألعاب كافية بعد.', 'אין עדיין מספיק נתוני משחקים.')}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {!!gameCareerSignals.skills?.length && (
              <View style={styles.chipsWrap}>
                {gameCareerSignals.skills.slice(0, 5).map((skill) => (
                  <Chip key={skill.key || `${skill.game_key || 'game'}:${skill.skill_tag}`} icon="sparkles" label={`${skill.label} ${skill.score}%`} tone="strong" />
                ))}
              </View>
            )}

            {(gameCareerSignals.topics || []).slice(0, 4).map((topic) => (
              <BarRow key={topic.topic_key} label={topic.label} value={clamp(safeNum(topic.score, 0), 0, 100)} />
            ))}

            {!!gameCareerSignals.degrees?.length && (
              <View style={styles.tableBox}>
                <TableHeader
                  cols={[
                    { label: tt('studentInsightReport.degreeBoosted', 'تخصص تعزز بالألعاب', 'מסלול שחוזק ממשחקים'), flex: 1.4 },
                    { label: tt('studentInsightReport.gameSignal', 'الإشارة', 'אות'), flex: 0.6 },
                  ]}
                />
                {gameCareerSignals.degrees.slice(0, 4).map((degree) => (
                  <TableRow
                    key={degree.degree_id || degree.degree_code}
                    cols={[
                      {
                        value: isArabic
                          ? degree.name_ar || degree.name_he || degree.name_en || degree.degree_code
                          : degree.name_he || degree.name_ar || degree.name_en || degree.degree_code,
                        flex: 1.4,
                      },
                      { value: `${degree.score}`, flex: 0.6 },
                    ]}
                  />
                ))}
              </View>
            )}

            {gameCareerSignals.explanations?.slice(0, 2).map((item, index) => (
              <View key={`${item.game_key || item.topic_key || 'game'}-${index}`} style={styles.noteRow}>
                <Ionicons name="information-circle" size={16} color="#4F8BFF" />
                <Text style={styles.noteText}>
                  {currentLang === 'ar'
                    ? item.reason_ar || item.reason_en || item.reason_he
                    : currentLang === 'he'
                      ? item.reason_he || item.reason_en || item.reason_ar
                      : item.reason_en || item.reason_ar || item.reason_he}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SECTION: Recommendations */}
      <View style={styles.card}>
        <SectionHeader
          title={tt('studentInsightReport.pathsSection', 'المسار الأنسب لك', 'המסלול המתאים לך')}
          subtitle={tt(
            'studentInsightReport.pathsSectionSub',
            'توصيات مبنية على القدرات + الاهتمامات (وممكن لاحقًا إضافة الشخصية)',
            'המלצות על בסיס יכולות + תחומי עניין (ובהמשך ניתן לשלב אישיות)'
          )}
          icon="school"
        />

        {(!recommendations || recommendations.length === 0) ? (
          <Text style={styles.muted}>
            {tt(
              'studentInsightReport.noRecommendations',
              'لا توجد توصيات حالياً. تأكد من إكمال الاختبارات أولاً.',
              'אין המלצות כרגע. ודא/י שהמבחנים הושלמו.'
            )}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {recommendations.slice(0, 5).map((rec, idx) => {
              const scorePct = Math.round(clamp(safeNum(rec?.score_percent, safeNum(rec?.score, 0) * 100), 0, 100));
              const name = preserveDegreeCodeDirection(
                currentLang === 'ar'
                  ? rec?.name_ar || rec?.name_en || rec?.name_he || '—'
                  : currentLang === 'he'
                    ? rec?.name_he || rec?.name_en || rec?.name_ar || '—'
                    : rec?.name_en || rec?.name_ar || rec?.name_he || '—'
              );

              const topSubjects = (rec?.explanation?.top_subjects || []).slice(0, 4);
              const topReasons = (rec?.top_reasons || rec?.reasons || [])
                .slice(0, 4)
                .map((reason) => getLocalizedReason(reason, currentLang, t))
                .filter(Boolean);
              const localizedExplanation = typeof rec?.explanation === 'string'
                ? getLocalizedReason(rec.explanation, currentLang, t)
                : '';
              const confidenceText = localizeCopy(rec?.confidence_reason, lang);
              const missingSteps = (rec?.missing_steps || []).slice(0, 3);

              return (
                <View key={rec.degree_id || `${idx}`} style={styles.recCard}>
                  <View style={styles.recTopRow}>
                    <View style={styles.recRank}>
                      <Text style={styles.recRankText}>#{idx + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recTitle, !isRtl ? styles.ltrText : null]} numberOfLines={2}>
                        {name}
                      </Text>

                      <Text style={styles.recSub}>
                        {tt('studentInsightReport.compatibility', 'نسبة التوافق', 'אחוז התאמה')}: {scorePct}%
                      </Text>
                      <Text style={styles.recSub}>
                        {tt('studentInsightReport.confidence', 'الثقة', 'ביטחון')}: {rec?.confidence_level || 'low'}
                      </Text>
                    </View>

                    <View style={styles.recBadge}>
                      <Ionicons name="sparkles" size={14} color="#0B2A66" />
                      <Text style={styles.recBadgeText}>{scorePct}%</Text>
                    </View>
                  </View>

                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${scorePct}%`, backgroundColor: '#F5B301' }]} />
                  </View>

                  <Text style={styles.recWhyTitle}>
                    {tt('studentInsightReport.whyRecommended', 'سبب التوصية', 'למה מומלץ?', 'Why recommended?')}
                  </Text>

                  {!!localizedExplanation ? (
                    <Text style={[styles.recExplanation, !isRtl ? styles.ltrText : null]}>{localizedExplanation}</Text>
                  ) : null}

                  {topReasons.length === 0 && topSubjects.length === 0 ? (
                    <Text style={styles.muted}>{confidenceText || '—'}</Text>
                  ) : (
                    <View style={styles.bullets}>
                      {topReasons.map((reason, i) => (
                        <Text key={`reason-${i}`} style={[styles.bullet, !isRtl ? styles.ltrText : null]}>
                          • {reason}
                        </Text>
                      ))}
                      {topSubjects.map((s, i) => (
                        <Text key={`${s.subject_id}-${i}`} style={[styles.bullet, !isRtl ? styles.ltrText : null]}>
                          • {s.subject_name_he || s.subject_name_en || s.subject_name_ar || '—'}
                        </Text>
                      ))}
                    </View>
                  )}
                  {!!confidenceText && <Text style={styles.muted}>{confidenceText}</Text>}
                  {missingSteps.map((step) => (
                    <Text key={step.key} style={[styles.bullet, !isRtl ? styles.ltrText : null]}>
                      • {localizeCopy(step.label, lang)}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => navigateTo?.('home')}
            accessibilityRole="button"
            accessibilityLabel={tt('studentInsightReport.backHome', 'Ø§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ø±Ø¦ÙŠØ³ÙŠØ©', '×—×–×¨×” ×œ×“×£ ×”×‘×™×ª')}
            style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.btnPressed : null]}
          >
            <Text style={styles.secondaryBtnText}>
              {tt('studentInsightReport.backHome', 'العودة للرئيسية', 'חזרה לדף הבית')}
            </Text>
          </Pressable>

          <Pressable
            onPress={onExportPdf}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel={tt('studentInsightReport.downloadPdf', 'ØªØ­Ù…ÙŠÙ„ PDF', '×”×•×¨×“ PDF')}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.btnPressed : null,
              exporting ? styles.btnDisabled : null,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {exporting
                ? tt('studentInsightReport.exporting', 'جاري التصدير…', 'מייצא…')
                : tt('studentInsightReport.downloadPdf', 'تحميل PDF', 'הורד PDF')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.smallFootnote}>
          {tt(
            'studentInsightReport.footnote',
            'هذا التقرير تعليمي وإرشادي. لا يُعتبر تشخيصًا أو قرارًا نهائيًا.',
            'דוח זה חינוכי והכוונתי. אינו אבחון או החלטה סופית.'
          )}
        </Text>
      </View>

      {/* Spacer */}
      <View style={{ height: 26 }} />
    </ScrollView>
  );
}

/* ------------------------------ Styles ---------------------------- */

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 18 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '800' },

  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTopRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
  heroTopRowStacked: { flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: '#DDE7FF', fontWeight: '900', fontSize: 12 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 24, marginTop: 6 },
  heroSubtitle: { color: '#EAF0FF', fontWeight: '800', marginTop: 8, lineHeight: 18 },

  chipsRow: { marginTop: 12, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },

  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  chipText: { color: '#EAF0FF', fontWeight: '900', fontSize: 12 },
  chipStrong: { backgroundColor: '#F5B301', borderColor: 'rgba(0,0,0,0.06)' },
  chipTextStrong: { color: '#0B2A66' },

  exportBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F5B301',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minWidth: 140,
  },
  fullWidthButton: { width: '100%' },
  exportBtnText: { color: '#0B2A66', fontWeight: '900' },
  btnPressed: { transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.6 },

  heroNote: { marginTop: 12, color: '#EAF0FF', fontWeight: '800' },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },

  overviewGrid: {
    marginHorizontal: 16,
    marginTop: 2,
    gap: 10,
  },
  overviewGridWide: { flexDirection: 'row-reverse' },
  overviewTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },
  overviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewText: { flex: 1, minWidth: 0 },
  overviewLabel: { color: '#102A68', fontWeight: '900', textAlign: 'right', fontSize: 13 },
  overviewHint: { marginTop: 3, color: '#64748B', fontWeight: '700', textAlign: 'right', fontSize: 11 },
  percentBadge: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: '#FFF7D6',
    borderWidth: 1,
    borderColor: '#F8DF83',
  },
  percentBadgeText: { color: '#0B2A66', fontWeight: '900', fontSize: 12 },

  sectionHeader: { marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { color: '#102A68', fontWeight: '900', fontSize: 15, textAlign: 'right' },
  sectionSubtitle: { marginTop: 4, color: '#64748B', fontWeight: '800', fontSize: 12, textAlign: 'right' },

  twoCol: {
    marginTop: 6,
    flexDirection: 'column',
    gap: 12,
  },

  chartCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  compactPanel: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  chartWrap: {
    marginTop: 8,
    alignSelf: 'center',
    maxWidth: 340,
    width: '100%',
    maxHeight: 360,
    overflow: 'hidden',
  },
  chartEmptyCard: {
    minHeight: 92,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
    justifyContent: 'center',
  },
  subCardTitle: { color: '#142B63', fontWeight: '900', fontSize: 13, textAlign: 'right' },

  muted: { marginTop: 8, color: '#64748B', fontWeight: '800', textAlign: 'right' },
  desc: { marginTop: 8, color: '#334155', fontWeight: '700', lineHeight: 20, textAlign: 'right' },
  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  emptyState: {
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 9,
  },
  emptyStateWarning: { backgroundColor: '#FFF8E1', borderColor: '#F8DF83' },
  emptyIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWarning: { backgroundColor: '#FEF3C7' },
  emptyStateText: { flex: 1, color: '#475569', fontWeight: '800', textAlign: 'right', lineHeight: 18 },
  emptyStateHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  emptyStateCopy: { flex: 1, minWidth: 0 },
  emptyStateTitle: { color: '#102A68', fontWeight: '900', textAlign: 'right', marginBottom: 3 },
  tableBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  traitRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6ECFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  traitList: { marginTop: 8 },
  traitText: { flex: 1, minWidth: 0 },
  traitName: { color: '#0F172A', fontWeight: '900', textAlign: 'right' },
  traitCode: { color: '#64748B', fontWeight: '900' },
  traitHint: { marginTop: 3, color: '#64748B', fontWeight: '800', fontSize: 12, textAlign: 'right' },
  traitValue: { color: '#1E4FBF', fontWeight: '900', fontSize: 14, minWidth: 44, textAlign: 'left' },
  traitBarTrack: {
    height: 6,
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  traitBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#4F8BFF' },

  subtleCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },

  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  barContent: { flex: 1, minWidth: 0 },
  barLabel: { color: '#0F172A', fontWeight: '900', textAlign: 'right' },
  barRight: { minWidth: 64, maxWidth: 112, textAlign: 'left', color: '#102A68', fontWeight: '900', fontSize: 12 },

  barTrack: {
    height: 8,
    backgroundColor: '#EEF3FF',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6ECFF',
    marginTop: 8,
  },
  barFill: { height: '100%', borderRadius: 999 },

  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#EEF3FF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  tableHeaderCell: { color: '#102A68', fontWeight: '900', textAlign: 'right', fontSize: 12 },

  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FF',
  },
  tableCell: { color: '#334155', fontWeight: '800', textAlign: 'right', fontSize: 12 },

  noteRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, color: '#334155', fontWeight: '700', lineHeight: 18, textAlign: 'right' },

  recCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },
  recTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  recRank: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recRankText: { color: '#1E4FBF', fontWeight: '900' },
  recTitle: { color: '#0F172A', fontWeight: '900', fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  ltrText: { textAlign: 'left', writingDirection: 'ltr' },
  recSub: { marginTop: 4, color: '#64748B', fontWeight: '800', textAlign: 'right', fontSize: 12 },
  recBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B301',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  recBadgeText: { color: '#0B2A66', fontWeight: '900', fontSize: 12 },

  recWhyTitle: { marginTop: 10, color: '#102A68', fontWeight: '900', textAlign: 'right' },
  recExplanation: { marginTop: 6, color: '#334155', fontWeight: '600', lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  bullets: { marginTop: 10, gap: 6 },
  bullet: { color: '#475569', fontWeight: '700', textAlign: 'right', lineHeight: 19 },

  actionsRow: { marginTop: 14, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  primaryBtn: {
    flex: 1,
    minWidth: 190,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    flex: 1,
    minWidth: 190,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#334155', fontWeight: '900' },

  smallFootnote: { marginTop: 12, color: '#64748B', fontWeight: '800', textAlign: 'right', fontSize: 12 },
});
