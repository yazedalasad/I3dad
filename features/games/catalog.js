const gameHubItems = [
  {
    key: 'doctor-soroka',
    title: {
      ar: 'طبيب في سوروكا',
      he: 'רופא בסורוקה',
      en: 'Doctor at Soroka',
    },
    description: {
      ar: 'لعبة تشخيص سريري بالعبرية فيها حالات وأسئلة وقرارات سريعة.',
      he: 'משחק אבחון קליני בעברית עם מקרים, שאלות והחלטות מהירות.',
      en: 'A fast clinical diagnosis game in Hebrew with cases, questions, and quick decisions.',
    },
    longDescription: {
      ar: 'ادخل في دور طبيب يقرأ الحالة، يختار الفحوصات، ثم يبني قرارا سريريا خطوة بخطوة.',
      he: 'היכנסו לתפקיד רופא, קראו את המקרה, בחרו בדיקות, ובנו החלטה קלינית שלב אחרי שלב.',
      en: 'Step into the doctor role, read the case, choose tests, and build a clinical decision step by step.',
    },
    icon: 'stethoscope',
    iconBg: '#0f766e',
    buttonBg: '#0f766e',
    accentSoft: '#ccfbf1',
    gradient: ['#0f766e', '#14b8a6'],
    screen: 'DoctorSorokaHome',
    badge: {
      ar: 'سريري',
      he: 'קליני',
      en: 'Clinical',
    },
  },
  {
    key: 'physics-lab',
    title: {
      ar: 'مختبر الفيزياء',
      he: 'מעבדת פיזיקה',
      en: 'Physics Lab',
    },
    description: {
      ar: 'جرّب القوة والسرعة والتسارع في تجربة تفاعلية مناسبة للويب.',
      he: 'נסו כוח, מהירות ותאוצה בחוויה אינטראקטיבית שמתאימה לאתר.',
      en: 'Explore force, speed, and acceleration in an interactive web-friendly lab.',
    },
    longDescription: {
      ar: 'بدّل القيم، شغّل المحاكاة، وتعلّم من التغذية الراجعة السريعة في كل محاولة.',
      he: 'שנו ערכים, הפעילו את הסימולציה, ולמדו ממשוב מהיר אחרי כל ניסיון.',
      en: 'Adjust the values, run the simulation, and learn from quick feedback after each attempt.',
    },
    icon: 'flask',
    iconBg: '#2563eb',
    buttonBg: '#2563eb',
    accentSoft: '#dbeafe',
    gradient: ['#2563eb', '#06b6d4'],
    screen: 'PhysicsLabHome',
    badge: {
      ar: 'علوم',
      he: 'מדע',
      en: 'Science',
    },
  },
  {
    key: 'arabic-poet-puzzle',
    title: {
      ar: 'كنوز الألفاظ',
      he: 'אוצר המילים',
      en: 'Word Treasures',
    },
    description: {
      ar: 'لعبة كلمات عربية بطابع شعري مع مستوى جاهز للبدء من الموقع.',
      he: 'משחק מילים בערבית עם אופי פיוטי ורמה מוכנה להתחלה מהאתר.',
      en: 'An Arabic word game with a poetic style and a ready level to start from the site.',
    },
    longDescription: {
      ar: 'اختر الكلمات من الشبكة، اقرأ التلميح، ثم اكتب الجواب الصحيح في تجربة لغوية ممتعة.',
      he: 'בחרו מילים מהרשת, קראו את הרמז, ואז כתבו את התשובה הנכונה בחוויה לשונית מהנה.',
      en: 'Pick words from the grid, read the clue, then write the correct answer in a playful language challenge.',
    },
    icon: 'book',
    iconBg: '#b45309',
    buttonBg: '#b45309',
    accentSoft: '#fef3c7',
    gradient: ['#b45309', '#f97316'],
    screen: 'ArabicPoetPuzzleHome',
    badge: {
      ar: 'لغة',
      he: 'שפה',
      en: 'Language',
    },
  },
  {
    key: 'physics-bridge-game',
    title: {
      ar: 'مهندس الجسور',
      he: 'מהנדס הגשרים',
      en: 'Bridge Engineer',
    },
    description: {
      ar: 'ابنِ جسراً ثابتاً بالعوارض والدعامات، ثم اختبره ضمن ميزانية محدودة.',
      he: 'בנו גשר יציב עם קורות ותמיכות, ואז בדקו אותו בתוך תקציב מוגבל.',
      en: 'Build a stable bridge with beams and supports, then test it within a limited budget.',
    },
    longDescription: {
      ar: 'لعبة تعليمية بالعربية والعبرية تشرح كيف تساعد المثلثات والدعامات على توزيع القوة وتحسين ثبات الجسر.',
      he: 'משחק לימודי בערבית ובעברית שמסביר איך משולשים ותמיכות עוזרים לחלק את הכוח ולשפר את יציבות הגשר.',
      en: 'A bilingual educational game that shows how triangles and supports distribute force and improve bridge stability.',
    },
    icon: 'road',
    iconBg: '#7c3aed',
    buttonBg: '#7c3aed',
    accentSoft: '#ddd6fe',
    gradient: ['#7c3aed', '#2563eb'],
    screen: 'physicsBridgeLevelSelect',
    badge: {
      ar: 'هندسة',
      he: 'הנדסה',
      en: 'Engineering',
    },
  },
];

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function localizeField(field, language) {
  if (!field || typeof field !== 'object') return field;
  const normalizedLanguage = normalizeLanguage(language);
  return field[normalizedLanguage] || field.en || field.ar || '';
}

export function getGameHubItems(language) {
  return gameHubItems.map((item) => ({
    ...item,
    title: localizeField(item.title, language),
    description: localizeField(item.description, language),
    longDescription: localizeField(item.longDescription, language),
    badge: localizeField(item.badge, language),
  }));
}

export { gameHubItems };
