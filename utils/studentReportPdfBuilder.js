import { majorCatalog } from '../data/majorCatalog';
import { getLocalizedReason, normalizeReportLanguage } from './reportReasons';

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function subjectScore(item) {
  return clamp(safeNum(item?.ability_score ?? item?.score ?? item?.accuracy, 0), 0, 100);
}

function getByLang({ ar, he, en }, lang) {
  const normalized = normalizeReportLanguage(lang);
  if (normalized === 'ar') return ar || en || he || '';
  if (normalized === 'he') return he || en || ar || '';
  return en || ar || he || '';
}

function dir(lang) {
  const normalized = normalizeReportLanguage(lang);
  return normalized === 'ar' || normalized === 'he' ? 'rtl' : 'ltr';
}

function L(lang, ar, he, en = he) {
  const normalized = normalizeReportLanguage(lang);
  if (normalized === 'he') return he;
  if (normalized === 'en') return en;
  return ar;
}

function localizeCopy(copy, language) {
  if (typeof copy === 'string') return copy;
  const lang = normalizeReportLanguage(language);
  return copy?.[lang] || copy?.en || copy?.ar || copy?.he || '';
}

function preserveDegreeCodeDirection(name) {
  return String(name || '').replace(/\b(B\.Arch|B\.Sc|B\.A|LL\.B|M\.A|M\.Sc|Ph\.D)\b/g, '\u200E$1\u200E');
}

export function normalizeBigFive(profile) {
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

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function subjectNameForReport(item, lang) {
  return getByLang({
    ar: item?.subjects?.name_ar || item?.subject_name_ar || item?.name_ar,
    he: item?.subjects?.name_he || item?.subject_name_he || item?.name_he,
    en: item?.subjects?.name_en || item?.subject_name_en || item?.name_en,
  }, lang) || item?.subject_name || item?.name || L(lang, 'مادة', 'מקצוע', 'Subject');
}

function recommendationNameForReport(recommendation, lang) {
  return preserveDegreeCodeDirection(
    getByLang(
      {
        ar: recommendation?.name_ar,
        he: recommendation?.name_he,
        en: recommendation?.name_en,
      },
      lang
    ) || recommendation?.name || recommendation?.major_key || L(lang, 'مسار دراسي', 'מסלול לימודים', 'Study path')
  );
}

function institutionNameForReport(program, lang) {
  const institution = program?.institution || program?.institutions || {};
  return getByLang(
    {
      ar: program?.institution_name_ar || institution?.name_ar || institution?.title?.ar,
      he: program?.institution_name_he || institution?.name_he || institution?.title?.he,
      en: program?.institution_name_en || institution?.name_en || institution?.title?.en,
    },
    lang
  ) || program?.institution_name || institution?.name || program?.name || '';
}

function institutionCityForReport(program, lang) {
  const institution = program?.institution || program?.institutions || {};
  return getByLang(
    {
      ar: program?.city_ar || institution?.city_ar || institution?.cityLabel?.ar,
      he: program?.city_he || institution?.city_he || institution?.cityLabel?.he,
      en: program?.city_en || institution?.city_en || institution?.cityLabel?.en,
    },
    lang
  ) || program?.city || institution?.city || program?.region || '';
}

function findMajorCatalogEntry(recommendation) {
  const key = String(
    recommendation?.major_key || recommendation?.code || recommendation?.category || ''
  )
    .trim()
    .toLowerCase();
  if (!key) return null;
  return (
    majorCatalog.find((entry) => entry.key === key) ||
    majorCatalog.find((entry) =>
      [entry.title?.ar, entry.title?.he, entry.title?.en]
        .filter(Boolean)
        .some((title) => String(title).toLowerCase().includes(key))
    ) ||
    null
  );
}

function safeFilePart(value, fallback = 'student') {
  const cleaned = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || fallback;
}

export function buildStudentReportFilename(student) {
  const studentName = safeFilePart(student?.full_name || student?.name);
  const date = new Date().toISOString().slice(0, 10);
  return `student-report-${studentName}-${date}.pdf`;
}

function getImprovementAdvice(lang) {
  return L(
    lang,
    'يوصى بمراجعة الأساسيات وحل أسئلة قصيرة يوميًا.',
    'מומלץ לחזור על היסודות ולתרגל שאלות קצרות מדי יום.',
    'Review fundamentals and practice short questions daily.'
  );
}

export function deriveStrengthBuckets(subjectResults = []) {
  const sorted = [...subjectResults].sort((a, b) => subjectScore(b) - subjectScore(a));
  const strong = sorted.filter((item) => subjectScore(item) >= 80);
  const good = sorted.filter((item) => subjectScore(item) >= 70 && subjectScore(item) < 80);
  return { strong, good, all: [...strong, ...good] };
}

export function deriveImprovementItems(subjectResults = [], lang = 'ar') {
  return [...subjectResults]
    .filter((item) => subjectScore(item) < 60)
    .sort((a, b) => subjectScore(a) - subjectScore(b))
    .slice(0, 6)
    .map((item) => ({
      item,
      score: Math.round(subjectScore(item)),
      advice: getImprovementAdvice(lang),
    }));
}

function computeOverallScore(subjectResults, recommendations, overallScoreInput) {
  if (Number.isFinite(Number(overallScoreInput))) {
    return Math.round(clamp(Number(overallScoreInput), 0, 100));
  }
  const recTop = recommendations?.[0];
  if (recTop) {
    return Math.round(
      clamp(safeNum(recTop?.score_percent, safeNum(recTop?.score, 0) * 100), 0, 100)
    );
  }
  if (subjectResults.length) {
    return Math.round(
      subjectResults.reduce((sum, item) => sum + subjectScore(item), 0) / subjectResults.length
    );
  }
  return 0;
}

function buildExecutiveSummaryParagraph({
  lang,
  overallScore,
  recommendationsCount,
  strongestNames = [],
  weakestNames = [],
  institutionCount = 0,
}) {
  const levelWord =
    overallScore >= 80
      ? L(lang, 'ممتاز', 'מצוין', 'excellent')
      : overallScore >= 65
        ? L(lang, 'جيد', 'טוב', 'good')
        : L(lang, 'متوسط', 'בינוני', 'moderate');

  const hasSubjectInsight = strongestNames.length > 0;

  if (normalizeReportLanguage(lang) === 'he') {
    if (!hasSubjectInsight) {
      return `הדוח מציג המלצות לימודיות מותאמות לפרופיל התלמיד. ציון ההתאמה הכללי הוא ${overallScore}%, עם ${recommendationsCount} תחומי לימוד מומלצים ו-${institutionCount} מוסדות לימוד רלוונטיים לבדיקה. מומלץ לבחון את המסלולים והמכללות יחד עם יועץ בית הספר.`;
    }
    const strongestText = strongestNames.join(', ');
    const weakestText = weakestNames.join(', ');
    return `הדוח מסכם את תוצאות המבחן והמלצות הלימודיות. ציון ההתאמה הכללי (${overallScore}%) מצביע על רמה ${levelWord}, עם חוזק ב-${strongestText}${weakestText.length ? ` ושיפור אפשרי ב-${weakestText}` : ''}. מומלץ לבדוק ${recommendationsCount} תחומי לימוד ו-${institutionCount} מוסדות מוצעים.`;
  }

  if (normalizeReportLanguage(lang) === 'en') {
    if (!hasSubjectInsight) {
      return `This report presents study recommendations tailored to the student profile. Overall fit is ${overallScore}% with ${recommendationsCount} recommended fields and ${institutionCount} relevant colleges to review with a school counselor.`;
    }
    return `This report summarizes assessment results and study recommendations. Overall fit (${overallScore}%) is ${levelWord}, with strength in ${strongestNames.join(', ')}${weakestNames.length ? ` and room to improve in ${weakestNames.join(', ')}` : ''}. Review ${recommendationsCount} recommended fields and ${institutionCount} suggested institutions.`;
  }

  if (!hasSubjectInsight) {
    return `يعرض هذا التقرير توصيات دراسية مخصصة لملف الطالب. التطابق العام ${overallScore}% مع ${recommendationsCount} تخصصات مقترحة و${institutionCount} مؤسسة تعليمية للمراجعة مع مرشد المدرسة.`;
  }
  const strongestText = strongestNames.join('، ');
  const weakestText = weakestNames.join('، ');
  return `يلخص هذا التقرير نتائج الاختبار والتوصيات التعليمية. التطابق العام (${overallScore}%) يشير إلى مستوى ${levelWord}، مع قوة في ${strongestText}${weakestText.length ? ` ومجال للتحسين في ${weakestText}` : ''}. يُنصح بمراجعة ${recommendationsCount} تخصصات و${institutionCount} مؤسسة مقترحة.`;
}

function getFitLevelLabel(score, lang) {
  const value = clamp(score, 0, 100);
  if (value >= 85) return L(lang, 'ملاءمة عالية', 'התאמה גבוהה', 'High fit');
  if (value >= 70) return L(lang, 'ملاءمة جيدة', 'התאמה טובה', 'Good fit');
  if (value >= 55) return L(lang, 'ملاءمة متوسطة', 'התאמה בינונית', 'Moderate fit');
  return L(lang, 'يتطلب تعزيزًا مسبقًا', 'דורש חיזוק מוקדם', 'Needs prior strengthening');
}

function getDifficultyNote(score, lang) {
  const value = clamp(score, 0, 100);
  if (value >= 85) {
    return L(
      lang,
      'المسار مناسب جدًا وفق البيانات الحالية.',
      'המסלול מתאים מאוד לפי הנתונים הנוכחיים.',
      'This path is a very strong fit based on current data.'
    );
  }
  if (value >= 70) {
    return L(
      lang,
      'مسار واقعي مع استمرار في التدريب على المواد الداعمة.',
      'מסלול ריאלי עם המשך תרגול במקצועות התומכים.',
      'A realistic path with continued practice in supporting subjects.'
    );
  }
  return L(
    lang,
    'يحتاج الطالب لتقوية المواد الأساسية قبل التقدم لهذا المسار.',
    'התלמיד צריך לחזק מקצועות יסוד לפני התקדמות למסלול זה.',
    'Strengthen foundational subjects before pursuing this path.'
  );
}

const ISRAEL_INSTITUTION_FALLBACKS = [
  {
    id: 'sce',
    categories: ['engineering', 'computer', 'stem'],
    name: { ar: 'كلية سامي شمعون للهندسة (SCE)', he: 'מכללת סמי שמעון להנדסה (SCE)', en: 'Sami Shamoon College of Engineering (SCE)' },
    city: { ar: 'بئر السبع / أشدود', he: 'באר שבע / אשדוד', en: 'Beer Sheva / Ashdod' },
    website: 'https://www.sce.ac.il',
  },
  {
    id: 'bgu',
    categories: ['engineering', 'computer', 'stem', 'medical', 'social'],
    name: { ar: 'جامعة بن غوريون في النقب', he: 'אוניברסיטת בן-גוריון בנגב', en: 'Ben-Gurion University of the Negev' },
    city: { ar: 'بئر السبع', he: 'באר שבע', en: 'Beer Sheva' },
    website: 'https://www.bgu.ac.il',
  },
  {
    id: 'sapir',
    categories: ['education', 'social', 'computer'],
    name: { ar: 'كلية ساپير الأكاديمية', he: 'מכללת ספיר', en: 'Sapir Academic College' },
    city: { ar: 'قرب سديروت', he: 'ליד שדרות', en: 'Near Sderot' },
    website: 'https://www.sapir.ac.il',
  },
  {
    id: 'achva',
    categories: ['education', 'social'],
    name: { ar: 'كلية أخوا الأكاديمية', he: 'מכללת אחוה', en: 'Achva Academic College' },
    city: { ar: 'قرب كريات ملاخي', he: 'ליד קריית מלאכי', en: 'Near Kiryat Malakhi' },
    website: 'https://www.achva.ac.il',
  },
  {
    id: 'kaye',
    categories: ['education'],
    name: { ar: 'كلية كايه الأكاديمية للتربية', he: 'מכללת קיי להוראה', en: 'Kaye Academic College of Education' },
    city: { ar: 'بئر السبع', he: 'באר שבע', en: 'Beer Sheva' },
    website: 'https://www.kaye.ac.il',
  },
  {
    id: 'ashkelon',
    categories: ['medical', 'social'],
    name: { ar: 'كلية عسقلان الأكاديمية', he: 'מכללת אשקלון', en: 'Ashkelon Academic College' },
    city: { ar: 'عسقلان', he: 'אשקלון', en: 'Ashkelon' },
    website: 'https://www.ashkelon.ac.il',
  },
  {
    id: 'hadassah',
    categories: ['medical', 'computer', 'social'],
    name: { ar: 'كلية هداسا الأكاديمية', he: 'מכללת הדסה', en: 'Hadassah Academic College' },
    city: { ar: 'القدس', he: 'ירושלים', en: 'Jerusalem' },
    website: 'https://www.hadassah.ac.il',
  },
  {
    id: 'braude',
    categories: ['engineering'],
    name: { ar: 'كلية براوده للهندسة', he: 'מכללת בראודה להנדסה', en: 'Braude College of Engineering' },
    city: { ar: 'كرميئيل', he: 'כרמיאל', en: 'Karmiel' },
    website: 'https://www.braude.ac.il',
  },
  {
    id: 'hit',
    categories: ['engineering', 'computer', 'stem'],
    name: { ar: 'معهد حولون للتكنولوجيا (HIT)', he: 'המכון הטכנולוגי חולון (HIT)', en: 'HIT Holon Institute of Technology' },
    city: { ar: 'حولون', he: 'חולון', en: 'Holon' },
    website: 'https://www.hit.ac.il',
  },
];

function getMajorCategory(recommendation) {
  const key = String(recommendation?.major_key || recommendation?.code || '').toLowerCase();
  const name = `${recommendation?.name_ar || ''} ${recommendation?.name_he || ''} ${recommendation?.name_en || ''}`.toLowerCase();
  const blob = `${key} ${name}`;

  if (/medicine|nursing|biology|chemistry|health|medical|רפואה|סיעוד|ביולוג|כימיה|طب|تمريض|أحياء|كيمياء|רפוא/.test(blob)) return 'medical';
  if (/education|teaching|חינוך|تربية|הוראה|literature|history|ספרות|היסטוריה|أدب|تاريخ|עברית/.test(blob)) return 'education';
  if (/law|social|business|management|משפט|עסקים|إدارة|قانون|علوم اجتماع/.test(blob)) return 'social';
  if (/architect|civil|mechanical|engineer|הנדס|הנדסה|هندسة|אדריכל|בניין/.test(blob)) return 'engineering';
  if (/computer|software|data|cyber|technology|מדעי המחשב|הנדסת תוכנה|حاسوب|برمج|נתונים/.test(blob)) return 'computer';
  if (/math|physics|מתמטיק|פיזיק|رياضيات|فيزياء/.test(blob)) return 'stem';
  return 'general';
}

function getFallbackInstitutionsForMajor(recommendation, lang) {
  const category = getMajorCategory(recommendation);
  const matched = ISRAEL_INSTITUTION_FALLBACKS.filter(
    (entry) => entry.categories.includes(category) || (category === 'general' && entry.id === 'bgu')
  );
  const picks = (matched.length ? matched : ISRAEL_INSTITUTION_FALLBACKS.filter((e) => e.id === 'bgu' || e.id === 'sce')).slice(0, 4);

  return picks.map((entry) => ({
    id: `fallback-${entry.id}`,
    name: getByLang(entry.name, lang),
    city: getByLang(entry.city, lang),
    matchReason: L(
      lang,
      'اقتراح عام بناءً على مجال التخصص المقترح',
      'הצעה כללית על בסיס תחום הלימוד המומלץ',
      'General suggestion based on the recommended field of study'
    ),
    admissionNote: L(
      lang,
      'تحقق من شروط القبول والمواد المطلوبة في موقع المؤسسة',
      'בדקו תנאי קבלה ומקצועות נדרשים באתר המוסד',
      'Check admission requirements and required subjects on the institution website'
    ),
    distance: '',
    link: entry.website,
    isSuggestion: true,
  }));
}

function toInstitutionCard(program, recommendation, majorName, lang, translate) {
  const name = institutionNameForReport(program, lang);
  if (!name) return null;

  const admissionNote = getByLang(
    {
      ar: program?.admission_requirements_ar || program?.admission_notes_ar,
      he: program?.admission_requirements_he || program?.admission_notes_he,
      en: program?.admission_requirements_en || program?.admission_notes_en,
    },
    lang
  );

  const matchFromReasons = (recommendation?.top_reasons || [])
    .slice(0, 2)
    .map((reason) => getLocalizedReason(reason, lang, translate))
    .filter(Boolean)
    .join(lang === 'he' ? ' • ' : ' • ');

  return {
    id: program?.institution_id || program?.id || `${name}-${majorName}`,
    name,
    city: institutionCityForReport(program, lang),
    majorName:
      majorName ||
      getByLang(
        {
          ar: program?.program_name_ar || program?.major_name_ar,
          he: program?.program_name_he || program?.major_name_he,
          en: program?.program_name_en || program?.major_name_en,
        },
        lang
      ) ||
      program?.program_name ||
      '',
    matchReason:
      matchFromReasons ||
      (typeof recommendation?.explanation === 'string'
        ? getLocalizedReason(recommendation.explanation, lang, translate)
        : localizeCopy(recommendation?.explanation, lang)) ||
      L(
        lang,
        'ملاءمة جيدة مع التخصص المقترح ونتائج التقييم',
        'התאמה טובה לתחום הלימוד המומלץ ולתוצאות המבחן',
        'Good fit with the recommended major and assessment results'
      ),
    distance:
      program?.distance_km != null
        ? `${Math.round(safeNum(program.distance_km))} km`
        : program?.distance || '',
    admissionNote:
      admissionNote ||
      L(
        lang,
        'راجع موقع المؤسسة لمتطلبات القبول المحدثة',
        'עיינו באתר המוסד לדרישות קבלה מעודכנות',
        'See the institution website for up-to-date admission requirements'
      ),
    link: program?.program_url || program?.website_url || program?.website || '',
    isSuggestion: false,
  };
}

function getInstitutionCardsForMajor(recommendation, institutionsInput, lang, translate) {
  const majorName = recommendationNameForReport(recommendation, lang);
  const majorKey = String(recommendation?.major_key || '').toLowerCase();
  const seen = new Set();
  const cards = [];

  const programs = [
    ...(recommendation?.institutions || []),
    ...(recommendation?.programs || []),
    ...(institutionsInput || []).filter((program) => {
      const programKey = String(program?.major_key || program?.major_id || '').toLowerCase();
      return !programKey || programKey === majorKey;
    }),
  ];

  for (const program of programs) {
    const card = toInstitutionCard(program, recommendation, majorName, lang, translate);
    if (!card || seen.has(card.id)) continue;
    seen.add(card.id);
    cards.push(card);
  }

  if (!cards.length) {
    return getFallbackInstitutionsForMajor(recommendation, lang).map((card) => ({
      ...card,
      majorName,
    }));
  }

  return cards.slice(0, 4);
}

function buildInstitutionGroups(recommendations, institutionsInput, lang, translate) {
  return recommendations.slice(0, 5).map((recommendation) => ({
    majorName: recommendationNameForReport(recommendation, lang),
    cards: getInstitutionCardsForMajor(recommendation, institutionsInput, lang, translate),
  }));
}

function buildPersonalRecommendations(lang) {
  return [
    L(lang, 'راجع المواد الأضعف بخطة قصيرة أسبوعية.', 'חזור על המקצועות החלשים עם תוכנית שבועית קצרה.', 'Review weaker subjects with a short weekly plan.'),
    L(lang, 'استكشف أفضل مسارين مقترحين وقارن بينهما.', 'בדוק את שני המסלולים המובילים והשווה ביניהם.', 'Explore the top two recommended paths and compare them.'),
    L(lang, 'أكمل مهامًا مصغّرة أو ألعابًا تعليمية لدعم ملفك.', 'השלם משימות קצרות או משחקים לימודיים לחיזוק הפרופיל.', 'Complete mini tasks or educational games to strengthen your profile.'),
    L(lang, 'ناقش النتائج مع مرشد المدرسة أو معلم التوجيه.', 'דון בתוצאות עם יועץ בית הספר או מחנך.', 'Discuss results with a school counselor or homeroom teacher.'),
    L(lang, 'قارن بين الجامعات والكليات المناسبة قبل اتخاذ قرار.', 'השווה בין מוסדות לימוד מתאימים לפני קבלת החלטה.', 'Compare suitable colleges before making a decision.'),
    L(lang, 'أعد الاختبار لاحقًا بعد فترة تدريب لقياس التقدم.', 'בצע מבחן חוזר לאחר תקופת תרגול למדידת התקדמות.', 'Retake the assessment after practice to measure progress.'),
  ];
}

/**
 * Rich student guidance report HTML (A4, RTL-aware, no charts).
 */
export function buildStudentReportHtml({
  student,
  subjectResults = [],
  overallScore: overallScoreInput,
  strengths: strengthsInput = [],
  improvements: improvementsInput = [],
  recommendations = [],
  institutions = [],
  language = 'ar',
  interests = [],
  personality = null,
  meta = {},
  t,
}) {
  const lang = normalizeReportLanguage(language);
  const rtl = dir(lang);
  const translate = typeof t === 'function' ? t : (key, ar, he, en) => L(lang, ar, he, en);

  const studentName =
    student?.full_name || student?.name || L(lang, 'الطالب', 'התלמיד', 'Student');

  const generatedAt = new Date().toLocaleString(lang === 'he' ? 'he-IL' : lang === 'ar' ? 'ar' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const languageLabel =
    lang === 'he' ? 'עברית' : lang === 'ar' ? 'العربية' : 'English';

  const sortedSubjects = [...subjectResults].sort((a, b) => subjectScore(b) - subjectScore(a));
  const overallScore = computeOverallScore(sortedSubjects, recommendations, overallScoreInput);
  const recTop = recommendations.slice(0, 5);

  const strongest = sortedSubjects
    .filter((item) => subjectScore(item) >= 70)
    .slice(0, 3)
    .map((item) => subjectNameForReport(item, lang));
  const weakest = [...sortedSubjects]
    .filter((item) => subjectScore(item) > 0 && subjectScore(item) < 60)
    .sort((a, b) => subjectScore(a) - subjectScore(b))
    .slice(0, 3)
    .map((item) => subjectNameForReport(item, lang));

  const institutionGroups = buildInstitutionGroups(recTop, institutions, lang, translate);
  const institutionCount = institutionGroups.reduce((sum, group) => sum + group.cards.length, 0);
  const personalTips = buildPersonalRecommendations(lang);

  const executiveSummary = buildExecutiveSummaryParagraph({
    lang,
    overallScore,
    recommendationsCount: recTop.length,
    strongestNames: strongest,
    weakestNames: weakest,
    institutionCount,
  });

  const recommendationsHtml = recTop.length
    ? recTop
        .map((rec, idx) => {
          const catalog = findMajorCatalogEntry(rec);
          const name = recommendationNameForReport(rec, lang);
          const score = Math.round(clamp(safeNum(rec?.score_percent, safeNum(rec?.score, 0) * 100), 0, 100));
          const why =
            (rec?.top_reasons || [])
              .slice(0, 3)
              .map((reason) => getLocalizedReason(reason, lang, translate))
              .filter(Boolean)
              .join(lang === 'he' ? ' • ' : ' • ') ||
            (typeof rec?.explanation === 'string'
              ? getLocalizedReason(rec.explanation, lang, translate)
              : localizeCopy(rec?.explanation, lang)) ||
            L(
              lang,
              'يتوافق هذا المسار مع نتائج الاختبار واهتماماتك الحالية.',
              'מסלול זה תואם לתוצאות המבחן ולתחומי העניין הנוכחיים.',
              'This path aligns with your assessment results and current interests.'
            );

          const studyText =
            localizeCopy(catalog?.summary, lang) ||
            L(
              lang,
              'ستتعلم مفاهيم أساسية في المجال، مهارات تحليل، وتطبيقات عملية مرتبطة بالسوق.',
              'תלמדו מושגי יסוד בתחום, מיומנויות ניתוח ויישומים מעשיים.',
              'You will learn core concepts, analytical skills, and practical applications.'
            );

          const careers = localizeCopy(catalog?.careers, lang);
          const careersText = Array.isArray(careers)
            ? careers.join(lang === 'he' ? ', ' : '، ')
            : careers ||
              L(lang, 'مسارات مهنية متنوعة حسب التخصص الدقيق.', 'אפשרויות תעסוקה מגוונות לפי ההתמחות.', 'Various career paths depending on specialization.');

          return `
            <div class="rec-card featured avoid-break">
              <div class="rec-header">
                <div class="rec-rank">#${idx + 1}</div>
                <div class="rec-title-block">
                  <div class="rec-title">${escapeHtml(name)}</div>
                  <div class="rec-fit">${escapeHtml(getFitLevelLabel(score, lang))}</div>
                </div>
                <div class="rec-match">${score}%</div>
              </div>
              <div class="rec-body">
                <p><strong>${escapeHtml(L(lang, 'لماذا نوصي بهذا المسار؟', 'למה המסלול מומלץ?', 'Why this path?'))}</strong> ${escapeHtml(why)}</p>
                <p><strong>${escapeHtml(L(lang, 'ما الذي ستتعلمه؟', 'מה לומדים?', 'What will you study?'))}</strong> ${escapeHtml(studyText)}</p>
                <p><strong>${escapeHtml(L(lang, 'فرص مستقبلية', 'אפשרויות עתידיות', 'Future opportunities'))}</strong> ${escapeHtml(careersText)}</p>
              </div>
            </div>
          `;
        })
        .join('')
    : '';

  const institutionsHtml = institutionGroups
    .map(
      (group) => `
      <div class="inst-major-group avoid-break">
        <h3 class="inst-major-title">${escapeHtml(group.majorName)}</h3>
        ${group.cards
          .map(
            (card) => `
          <div class="inst-card ${card.isSuggestion ? 'inst-suggestion' : ''}">
            <div class="inst-card-head">
              <div class="inst-card-name">${escapeHtml(card.name)}</div>
              ${card.isSuggestion ? `<span class="suggestion-badge">${escapeHtml(L(lang, 'اقتراح عام', 'הצעה כללית', 'General suggestion'))}</span>` : ''}
            </div>
            <div class="inst-card-grid">
              <div><span class="inst-k">${escapeHtml(L(lang, 'الموقع', 'מיקום', 'Location'))}</span> ${escapeHtml(card.city || '—')}</div>
              <div><span class="inst-k">${escapeHtml(L(lang, 'التخصص', 'תחום', 'Major'))}</span> ${escapeHtml(card.majorName)}</div>
              ${card.distance ? `<div><span class="inst-k">${escapeHtml(L(lang, 'المسافة', 'מרחק', 'Distance'))}</span> ${escapeHtml(card.distance)}</div>` : ''}
            </div>
            <div class="inst-card-line"><span class="inst-k">${escapeHtml(L(lang, 'سبب الملاءمة', 'סיבת התאמה', 'Match reason'))}</span> ${escapeHtml(card.matchReason)}</div>
            <div class="inst-card-line"><span class="inst-k">${escapeHtml(L(lang, 'ملاحظة القبول', 'הערת קבלה', 'Admission note'))}</span> ${escapeHtml(card.admissionNote)}</div>
            ${card.link ? `<div class="inst-card-link">${escapeHtml(card.link)}</div>` : ''}
          </div>`
          )
          .join('')}
      </div>`
    )
    .join('');

  const tipsHtml = personalTips
    .map((tip, index) => `<li class="avoid-break"><span class="tip-num">${index + 1}</span>${escapeHtml(tip)}</li>`)
    .join('');

  return `<!doctype html>
<html lang="${lang}" dir="${rtl}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      direction: ${rtl};
      background: #EEF2FA;
      color: #0F172A;
      font-size: 14px;
      line-height: 1.55;
    }
    .pdf-root {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 28px 26px 36px;
      background: #EEF2FA;
      direction: ${rtl};
    }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .section-card {
      background: #fff;
      border: 1px solid #D9E3F5;
      border-radius: 14px;
      padding: 16px 18px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-title {
      margin: 0 0 12px;
      font-size: 17px;
      font-weight: 900;
      color: #102A68;
      border-bottom: 2px solid #E6ECFF;
      padding-bottom: 8px;
    }
    .section-featured {
      border-color: #B8C9F0;
      box-shadow: 0 4px 14px rgba(16, 42, 104, 0.06);
    }
    .cover {
      background: linear-gradient(135deg, #0B2A66 0%, #1E4FBF 55%, #2B63D9 100%);
      color: #fff;
      border-radius: 16px;
      padding: 22px 22px 18px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.3px;
    }
    .brand-mark {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255,255,255,0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 900;
    }
    .cover-tag {
      background: rgba(255,255,255,0.14);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 14px;
      font-weight: 800;
    }
    .cover h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      line-height: 1.25;
    }
    .cover .student-name {
      margin-top: 8px;
      font-size: 18px;
      font-weight: 900;
      color: #F5F8FF;
    }
    .cover .subtitle {
      margin-top: 8px;
      color: #DDE7FF;
      font-size: 15px;
      font-weight: 700;
      max-width: 92%;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 16px;
    }
    .meta-item {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 14px;
      font-weight: 700;
      color: #EAF0FF;
    }
    .meta-item strong {
      display: block;
      color: #fff;
      font-size: 14px;
      margin-top: 3px;
      font-weight: 900;
    }
    .summary-text {
      margin: 0;
      font-size: 15px;
      color: #334155;
      font-weight: 700;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #D9E3F5;
      border-radius: 14px;
      padding: 14px 12px;
      page-break-inside: avoid;
    }
    .kpi-icon {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: #EAF0FF;
      color: #1E4FBF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 8px;
    }
    .kpi-label {
      font-size: 14px;
      font-weight: 900;
      color: #64748B;
    }
    .kpi-value {
      margin-top: 4px;
      font-size: 22px;
      font-weight: 900;
      color: #102A68;
      line-height: 1.1;
    }
    .kpi-hint {
      margin-top: 6px;
      font-size: 14px;
      color: #64748B;
      font-weight: 700;
    }
    .rec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    .rec-title {
      font-weight: 900;
      color: #102A68;
      font-size: 16px;
    }
    .rec-match {
      font-weight: 900;
      color: #1E4FBF;
      white-space: nowrap;
      font-size: 15px;
    }
    .rec-card {
      border: 1px solid #D9E3F5;
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 10px;
      background: #FBFCFF;
    }
    .rec-card.featured {
      border-color: #93B4F3;
      background: linear-gradient(180deg, #FFFFFF 0%, #F5F8FF 100%);
    }
    .rec-body p {
      margin: 0 0 7px;
      color: #334155;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.5;
    }
    .rec-body strong { color: #1E4FBF; }
    .rec-rank {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #EAF0FF;
      color: #1E4FBF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      flex-shrink: 0;
    }
    .rec-title-block { flex: 1; min-width: 0; }
    .rec-fit { color: #64748B; font-size: 14px; font-weight: 800; margin-top: 2px; }
    .inst-major-group { margin-bottom: 14px; }
    .inst-major-title {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 900;
      color: #1E4FBF;
    }
    .inst-card {
      border: 1px solid #D9E3F5;
      border-radius: 12px;
      padding: 11px 12px;
      margin-bottom: 8px;
      background: #fff;
    }
    .inst-card.inst-suggestion {
      border-style: dashed;
      border-color: #94A3B8;
      background: #F8FAFC;
    }
    .inst-card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .inst-card-name {
      font-size: 15px;
      font-weight: 900;
      color: #102A68;
      flex: 1;
    }
    .suggestion-badge {
      font-size: 14px;
      font-weight: 900;
      color: #475569;
      background: #E2E8F0;
      border-radius: 999px;
      padding: 3px 8px;
      white-space: nowrap;
    }
    .inst-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      margin-bottom: 6px;
      font-size: 14px;
      font-weight: 700;
      color: #334155;
    }
    .inst-k {
      color: #1E4FBF;
      font-weight: 900;
    }
    .inst-card-line {
      font-size: 14px;
      font-weight: 700;
      color: #475569;
      margin-top: 4px;
      line-height: 1.45;
    }
    .inst-card-link {
      margin-top: 5px;
      font-size: 14px;
      color: #1E4FBF;
      font-weight: 800;
      word-break: break-all;
    }
    .tips-list {
      margin: 0;
      padding: 0 18px 0 0;
      list-style: none;
    }
    .tips-list li {
      margin-bottom: 8px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      font-weight: 700;
      color: #334155;
    }
    .tip-num {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      background: #1E4FBF;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .report-footer {
      margin-top: 10px;
      padding-top: 12px;
      border-top: 1px solid #CBD5E1;
      color: #64748B;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      page-break-inside: avoid;
    }
    @media print {
      body, .pdf-root { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="pdf-root">
    <section class="cover avoid-break">
      <div class="brand-row">
        <div class="brand">
          <div class="brand-mark">i3</div>
          <div>i3dad / ${escapeHtml(L(lang, 'إعداد', 'הכנה', 'I3dad'))}</div>
        </div>
        <div class="cover-tag">${escapeHtml(L(lang, 'تقرير توجيهي أكاديمي', 'דוח הכוונה אקדמי', 'Academic guidance report'))}</div>
      </div>
      <h1>${escapeHtml(L(lang, 'تقرير الطالب', 'דו״ח תלמיד', 'Student Report'))}</h1>
      <div class="student-name">${escapeHtml(studentName)}</div>
      <div class="subtitle">${escapeHtml(
        L(
          lang,
          'ملخص شخصي للقدرات، الاهتمامات، والتوصيات التعليمية',
          'סיכום אישי של יכולות, תחומי עניין והמלצות לימודיות',
          'Personal summary of abilities, interests, and educational recommendations'
        )
      )}</div>
      <div class="cover-meta">
        <div class="meta-item">${escapeHtml(L(lang, 'تاريخ التقرير', 'תאריך הדוח', 'Report date'))}<strong>${escapeHtml(generatedAt)}</strong></div>
        <div class="meta-item">${escapeHtml(L(lang, 'اللغة', 'שפה', 'Language'))}<strong>${escapeHtml(languageLabel)}</strong></div>
        <div class="meta-item">${escapeHtml(L(lang, 'معرّف الطالب', 'מזהה תלמיד', 'Student ID'))}<strong>${escapeHtml(String(student?.id || student?.student_id || '—'))}</strong></div>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi-card avoid-break">
        <div class="kpi-icon">◎</div>
        <div class="kpi-label">${escapeHtml(L(lang, 'التطابق العام', 'התאמה כללית', 'Overall match'))}</div>
        <div class="kpi-value">${overallScore}%</div>
        <div class="kpi-hint">${escapeHtml(L(lang, 'مؤشر مركّب من الاختبار والتوصيات', 'מדד משולב ממבחן והמלצות', 'Combined index from test and recommendations'))}</div>
      </div>
      <div class="kpi-card avoid-break">
        <div class="kpi-icon">🎓</div>
        <div class="kpi-label">${escapeHtml(L(lang, 'مسارات مقترحة', 'מסלולים מומלצים', 'Recommended paths'))}</div>
        <div class="kpi-value">${recTop.length}</div>
        <div class="kpi-hint">${escapeHtml(L(lang, 'تخصصات جامعية مناسبة لملفك', 'תחומי לימוד מתאימים לפרופיל', 'Degree paths suited to your profile'))}</div>
      </div>
      <div class="kpi-card avoid-break">
        <div class="kpi-icon">🏛</div>
        <div class="kpi-label">${escapeHtml(L(lang, 'مؤسسات مقترحة', 'מוסדות מומלצים', 'Suggested institutions'))}</div>
        <div class="kpi-value">${institutionCount}</div>
        <div class="kpi-hint">${escapeHtml(L(lang, 'كليات وجامعات مرتبطة بالتخصصات', 'מכללות ואוניברסיטאות לפי תחומים', 'Colleges linked to recommended fields'))}</div>
      </div>
    </div>

    <section class="section-card avoid-break">
      <h2 class="section-title">${escapeHtml(L(lang, 'الملخص التنفيذي', 'סיכום מנהלים', 'Executive summary'))}</h2>
      <p class="summary-text">${escapeHtml(executiveSummary)}</p>
    </section>

    ${
      recommendationsHtml
        ? `<section class="section-card section-featured">
      <h2 class="section-title">${escapeHtml(L(lang, 'التخصصات والمسارات المقترحة', 'תחומי לימוד מומלצים', 'Recommended study fields'))}</h2>
      ${recommendationsHtml}
    </section>`
        : ''
    }

    <section class="section-card section-featured">
      <h2 class="section-title">${escapeHtml(L(lang, 'كليات وجامعات مقترحة', 'מוסדות לימוד מומלצים', 'Recommended Colleges and Universities'))}</h2>
      ${institutionsHtml}
    </section>

    <section class="section-card avoid-break">
      <h2 class="section-title">${escapeHtml(L(lang, 'توصيات عملية', 'המלצות מעשיות', 'Practical recommendations'))}</h2>
      <ul class="tips-list">${tipsHtml}</ul>
    </section>

    <footer class="report-footer avoid-break">
      <div>${escapeHtml(
        L(
          lang,
          'هذا التقرير مخصص للتوجيه الأولي ولا يستبدل الاستشارة المهنية.',
          'דוח זה מיועד להכוונה ראשונית ואינו מחליף ייעוץ מקצועי.',
          'This report is for guidance only and does not replace professional counseling.'
        )
      )}</div>
      <div>i3dad / ${escapeHtml(L(lang, 'إعداد', 'הכנה', 'I3dad'))}</div>
    </footer>
  </div>
</body>
</html>`;
}

/** @deprecated Use buildStudentReportHtml */
export function buildReportHtml(params) {
  return buildStudentReportHtml(params);
}
