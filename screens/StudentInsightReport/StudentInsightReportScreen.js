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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import RadarChart from '../../components/AdaptiveTest/RadarChart';
import { supabase } from '../../config/supabase';

import { getStudentAbilities, updateAbilitiesFromSession } from '../../services/abilityService';
import { getStudentPersonalityProfile } from '../../services/personalityTestService';
import { recommendTopDegrees } from '../../services/recommendationService';

/* ---------------------------- helpers ---------------------------- */

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
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
function dir(lang) {
  return isHe(lang) ? 'rtl' : 'rtl'; // both AR/HE are RTL
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

/* ----------------------- tiny UI components ---------------------- */

function Chip({ icon, label, tone = 'soft' }) {
  return (
    <View style={[styles.chip, tone === 'strong' ? styles.chipStrong : null]}>
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

function BarRow({ label, value, right, accent = '#F5B301' }) {
  const v = clamp(safeNum(value, 0), 0, 100);
  return (
    <View style={styles.barRow}>
      <View style={{ flex: 1 }}>
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

  const traitRows = [
    { k: 'O', label: t('studentInsightReport.traitO', 'الانفتاح', 'פתיחות'), v: safeNum(personality?.openness, 0) },
    { k: 'C', label: t('studentInsightReport.traitC', 'الانضباط', 'מצפוניות'), v: safeNum(personality?.conscientiousness, 0) },
    { k: 'E', label: t('studentInsightReport.traitE', 'الانبساط', 'מוחצנות'), v: safeNum(personality?.extraversion, 0) },
    { k: 'A', label: t('studentInsightReport.traitA', 'التوافق', 'נעימות'), v: safeNum(personality?.agreeableness, 0) },
    { k: 'N', label: t('studentInsightReport.traitN', 'القلق', 'נוירוטיות'), v: safeNum(personality?.neuroticism, 0) },
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
      const name = escapeHtml(r?.name_he || r?.name_en || r?.name_ar || '—');
      const score = clamp(safeNum(r?.score, 0) * 100, 0, 100);
      const topSubjects = (r?.explanation?.top_subjects || [])
        .slice(0, 4)
        .map((s) => escapeHtml(s?.subject_name_he || s?.subject_name_en || s?.subject_name_ar || ''))
        .filter(Boolean)
        .join(' • ');

      return `
        <div class="rec">
          <div class="recTop">
            <div class="recRank">#${idx + 1}</div>
            <div class="recName">${name}</div>
            <div class="recScore">${Math.round(score)}%</div>
          </div>
          <div class="bar"><div class="fill fill3" style="width:${score}%"></div></div>
          <div class="recWhy">${escapeHtml(
            t('studentInsightReport.whyRecommended', 'سبب التوصية', 'למה מומלץ')
          )}: <span>${topSubjects || '—'}</span></div>
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

  // Keep i18n synced with prop
  useEffect(() => {
    const nextLang = String(language).toLowerCase() === 'he' ? 'he' : 'ar';
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const lang = i18n.language;
  const isArabic = !isHe(lang);

  const tt = (key, fallbackAr, fallbackHe) => {
    const v = t(key);
    if (typeof v === 'string' && v !== key) return v;
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
        const rRes = await recommendTopDegrees(studentId, { limit: 5 });
        const recs = rRes?.success ? (rRes?.data || []) : [];

        if (!mounted) return;

        setMeta((m) => ({ ...m, abilityUpdated: abilityWasUpdated }));
        setAbilities(aRes?.success ? (aRes.abilities || []) : []);
        setPersonality(pRes?.success ? (pRes.profile || null) : null);
        setPersonalityInsights(pRes?.success ? (pRes.insights || null) : null);
        setInterests(interestsRows || []);
        setRecommendations(recs || []);
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

  const personalityTraits = useMemo(() => {
    const p = personality || {};
    return [
      {
        key: 'O',
        title: tt('studentInsightReport.traitO', 'الانفتاح', 'פתיחות'),
        sub: tt('studentInsightReport.traitOHint', 'فضول وأفكار جديدة', 'סקרנות וחידוש'),
        value: safeNum(p.openness, 0),
      },
      {
        key: 'C',
        title: tt('studentInsightReport.traitC', 'الانضباط', 'מצפוניות'),
        sub: tt('studentInsightReport.traitCHint', 'تنظيم والتزام', 'ארגון והתמדה'),
        value: safeNum(p.conscientiousness, 0),
      },
      {
        key: 'E',
        title: tt('studentInsightReport.traitE', 'الانبساط', 'מוחצנות'),
        sub: tt('studentInsightReport.traitEHint', 'طاقة اجتماعية', 'אנרגיה חברתית'),
        value: safeNum(p.extraversion, 0),
      },
      {
        key: 'A',
        title: tt('studentInsightReport.traitA', 'التوافق', 'נעימות'),
        sub: tt('studentInsightReport.traitAHint', 'تعاون وتعاطف', 'שיתופיות ואמפתיה'),
        value: safeNum(p.agreeableness, 0),
      },
      {
        key: 'N',
        title: tt('studentInsightReport.traitN', 'القلق', 'נוירוטיות'),
        sub: tt('studentInsightReport.traitNHint', 'حساسية للضغط', 'רגישות ללחץ'),
        value: safeNum(p.neuroticism, 0),
      },
    ];
  }, [personality, lang]);

  const personalityRadarData = useMemo(() => {
    return personalityTraits.map((tr) => ({ label: tr.key, value: clamp(tr.value, 0, 100) }));
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
    const topScore = topRec ? Math.round(clamp(safeNum(topRec.score, 0) * 100, 0, 100)) : 0;

    return { pConf, abilityConfAvg, topScore };
  }, [personality, abilities, recommendations]);

  /* ---------------------------- export ---------------------------- */

  const onExportPdf = async () => {
  try {
    setExporting(true);

    const html = buildReportHtml({
      lang,
      t: (key, arFallback, heFallback) => tt(key, arFallback, heFallback),
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
    console.log('export pdf error:', e?.message || e);
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
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
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
            style={({ pressed }) => [
              styles.exportBtn,
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
          <Text style={styles.muted}>
            {tt(
              'studentInsightReport.noPersonalityYet',
              'لا توجد نتائج شخصية بعد. أكمل اختبار الشخصية أولاً.',
              'אין תוצאות אישיות עדיין. השלם/י מבחן אישיות.'
            )}
          </Text>
        ) : (
          <>
            <View style={styles.twoCol}>
              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.personalityRadar', 'خريطة السمات', 'מפת תכונות')}
                </Text>
                <View style={{ marginTop: 10 }}>
                  {/* Using your RadarChart (it supports labels/values, but here we use data style used by PersonalityResultsScreen) */}
                  <RadarChart data={personalityRadarData} />
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.subCardTitle}>
                  {tt('studentInsightReport.personalitySummary', 'ملخص سريع', 'סיכום מהיר')}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {personalityTraits.map((tr) => (
                    <View key={tr.key} style={styles.traitRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.traitName}>
                          {tr.title} <Text style={styles.traitCode}>({tr.key})</Text>
                        </Text>
                        <Text style={styles.traitHint}>{tr.sub}</Text>
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
              const scorePct = Math.round(clamp(safeNum(rec?.score, 0) * 100, 0, 100));
              const name =
                (isArabic ? (rec?.name_ar || rec?.name_en || rec?.name_he) : (rec?.name_he || rec?.name_en || rec?.name_ar)) ||
                '—';

              const topSubjects = (rec?.explanation?.top_subjects || []).slice(0, 4);

              return (
                <View key={rec.degree_id || `${idx}`} style={styles.recCard}>
                  <View style={styles.recTopRow}>
                    <View style={styles.recRank}>
                      <Text style={styles.recRankText}>#{idx + 1}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.recTitle} numberOfLines={2}>
                        {name}
                      </Text>

                      <Text style={styles.recSub}>
                        {tt('studentInsightReport.compatibility', 'نسبة التوافق', 'אחוז התאמה')}: {scorePct}%
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
                    {tt('studentInsightReport.whyRecommended', 'سبب التوصية', 'למה מומלץ')}
                  </Text>

                  {topSubjects.length === 0 ? (
                    <Text style={styles.muted}>—</Text>
                  ) : (
                    <View style={styles.bullets}>
                      {topSubjects.map((s, i) => (
                        <Text key={`${s.subject_id}-${i}`} style={styles.bullet}>
                          • {s.subject_name_he || s.subject_name_en || s.subject_name_ar || '—'}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => navigateTo?.('home')}
            style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.btnPressed : null]}
          >
            <Text style={styles.secondaryBtnText}>
              {tt('studentInsightReport.backHome', 'العودة للرئيسية', 'חזרה לדף הבית')}
            </Text>
          </Pressable>

          <Pressable
            onPress={onExportPdf}
            disabled={exporting}
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
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  heroTopRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { color: '#EAF0FF', fontWeight: '900', fontSize: 12 },
  chipStrong: { backgroundColor: '#F5B301', borderColor: 'rgba(0,0,0,0.06)' },
  chipTextStrong: { color: '#0B2A66' },

  exportBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F5B301',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    minWidth: 140,
  },
  exportBtnText: { color: '#0B2A66', fontWeight: '900' },
  btnPressed: { transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.6 },

  heroNote: { marginTop: 12, color: '#EAF0FF', fontWeight: '800' },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },

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
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  subCardTitle: { color: '#142B63', fontWeight: '900', fontSize: 13, textAlign: 'right' },

  muted: { marginTop: 8, color: '#64748B', fontWeight: '800', textAlign: 'right' },
  desc: { marginTop: 8, color: '#334155', fontWeight: '700', lineHeight: 20, textAlign: 'right' },

  traitRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6ECFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  traitName: { color: '#0F172A', fontWeight: '900', textAlign: 'right' },
  traitCode: { color: '#64748B', fontWeight: '900' },
  traitHint: { marginTop: 3, color: '#64748B', fontWeight: '800', fontSize: 12, textAlign: 'right' },
  traitValue: { color: '#1E4FBF', fontWeight: '900', fontSize: 16 },

  subtleCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },

  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  barLabel: { color: '#0F172A', fontWeight: '900', textAlign: 'right' },
  barRight: { width: 110, textAlign: 'left', color: '#102A68', fontWeight: '900' },

  barTrack: {
    height: 10,
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
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  recTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  recRank: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(39,174,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recRankText: { color: '#27ae60', fontWeight: '900' },
  recTitle: { color: '#E2E8F0', fontWeight: '900', fontSize: 15, textAlign: 'right' },
  recSub: { marginTop: 4, color: '#94A3B8', fontWeight: '800', textAlign: 'right' },
  recBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B301',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recBadgeText: { color: '#0B2A66', fontWeight: '900' },

  recWhyTitle: { marginTop: 10, color: '#E2E8F0', fontWeight: '900', textAlign: 'right' },
  bullets: { marginTop: 8, gap: 6 },
  bullet: { color: '#94A3B8', fontWeight: '800', textAlign: 'right' },

  actionsRow: { marginTop: 14, flexDirection: 'row-reverse', gap: 10 },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#334155', fontWeight: '900' },

  smallFootnote: { marginTop: 12, color: '#64748B', fontWeight: '800', textAlign: 'right', fontSize: 12 },
});
