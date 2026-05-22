export const REASON_FALLBACKS = {
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

export function normalizeReportLanguage(lang) {
  const value = String(lang || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('en')) return 'en';
  return 'ar';
}

export function getLocalizedReason(reason, language, translate) {
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
