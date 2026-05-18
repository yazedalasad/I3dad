import { supabase } from '../../config/supabase';
import { GAME_TOPIC_MAPPINGS } from '../../services/gameCareerSignalService';
import { getMajorProfileForRow, majorProfiles, normalizeMajorKey } from '../data/majorProfiles';
import { getInstitutionsForMajor } from './institutionMatchingService';

const DEFAULT_WEIGHTS = {
  assessment: 0.45,
  interests: 0.2,
  personality: 0.15,
  games: 0.15,
  potential: 0.05,
};

const CONFIDENCE_MESSAGES = {
  low: {
    ar: 'توصية أولية فقط — أكمل الاختبار الشامل للحصول على نتيجة أدق',
    he: 'המלצה ראשונית בלבד — השלם את המבחן המקיף כדי לקבל תוצאה מדויקת יותר',
    en: 'Preliminary recommendation only. Complete the comprehensive test for a more accurate result.',
  },
  medium: {
    ar: 'توصية جيدة، لكن يمكن تحسينها بإكمال باقي الخطوات',
    he: 'המלצה טובה, אך ניתן לשפר אותה באמצעות השלמת שלבים נוספים',
    en: 'Good recommendation, but it can improve by completing the remaining steps.',
  },
  high: {
    ar: 'توصية قوية مبنية على عدة مصادر',
    he: 'המלצה חזקה המבוססת על כמה מקורות מידע',
    en: 'Strong recommendation based on multiple data sources.',
  },
};

const MISSING_STEP_COPY = {
  comprehensive_test: {
    ar: 'ابدأ الاختبار الشامل',
    he: 'התחל את המבחן המקיף',
    en: 'Start the comprehensive test',
  },
  personality_test: {
    ar: 'أكمل اختبار الشخصية لتحسين التوصية',
    he: 'השלם את מבחן האישיות כדי לשפר את ההמלצה',
    en: 'Complete the personality test to improve the recommendation',
  },
  interests: {
    ar: 'حدّث اهتماماتك في الملف الشخصي',
    he: 'עדכן תחומי עניין בפרופיל',
    en: 'Update your interests in the profile',
  },
  games: {
    ar: 'جرّب لعبة تعليمية لدعم ملفك',
    he: 'נסה משחק לימודי כדי לחזק את הפרופיל',
    en: 'Try an educational game to support your profile',
  },
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeScore100(value, fallback = 0) {
  const number = safeNum(value, fallback);
  if (!Number.isFinite(number)) return fallback;
  if (number > 0 && number <= 1) return number * 100;
  return number;
}

function normalizeLang(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function localized(copy, language) {
  const lang = normalizeLang(language);
  return copy?.[lang] || copy?.en || copy?.ar || copy?.he || '';
}

function textToSkillKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  const directAliases = {
    رياضيات: 'math',
    الرياضيات: 'math',
    מתמטיקה: 'math',
    فيزياء: 'physics',
    الفيزياء: 'physics',
    פיזיקה: 'physics',
    احياء: 'biology',
    أحياء: 'biology',
    الاحياء: 'biology',
    الأحياء: 'biology',
    ביולוגיה: 'biology',
    كيمياء: 'chemistry',
    الكيمياء: 'chemistry',
    כימיה: 'chemistry',
    'علوم الحاسوب': 'technology',
    'מדעי המחשב': 'technology',
    ערבית: 'language',
    עברית: 'language',
    ספרות: 'humanities',
    ادب: 'humanities',
    أدب: 'humanities',
    'تفسير المعطيات': 'data_interpretation',
    'פירוש נתונים': 'data_interpretation',
    'التفكير المنطقي والمجرد': 'logic',
    'חשיבה לוגית ומופשטת': 'logic',
    'الاستدلال الكمي': 'math',
    'הסקה כמותית': 'math',
    'الاستدلال اللفظي': 'language',
    'הסקה מילולית': 'language',
    'اكتشاف الميول': 'interests',
    'גילוי תחומי עניין': 'interests',
    'نمط التعلم والقيم': 'planning',
    'פרופיל למידה וערכים': 'planning',
  };
  if (directAliases[raw]) return directAliases[raw];

  const key = normalizeMajorKey(value);
  const aliases = {
    qr: 'math',
    lr: 'logic',
    di: 'data_interpretation',
    vr: 'language',
    id: 'interests',
    lp: 'planning',
    mathematics: 'math',
    maths: 'math',
    statistics: 'math',
    analytics: 'data_interpretation',
    data_interpretation: 'data_interpretation',
    quantitative_reasoning: 'math',
    logical_abstract_reasoning: 'logic',
    logical_and_abstract_reasoning: 'logic',
    verbal_reasoning: 'language',
    learning_profile_values: 'planning',
    learning_profile_and_values: 'planning',
    interest_discovery: 'interests',
    computer: 'technology',
    computers: 'technology',
    computer_science: 'technology',
    programming: 'technology',
    software: 'technology',
    physics_reasoning: 'physics',
    applied_physics: 'physics',
    mechanical_reasoning: 'engineering',
    engineering_planning: 'planning',
    force_distribution: 'physics',
    scientific_modeling: 'science',
    scientific_prediction: 'science',
    scientific_reasoning: 'science',
    math_logic: 'math',
    logical_reasoning: 'logic',
    graph_reading: 'data_interpretation',
    data_analysis: 'data_interpretation',
    data_reading: 'data_interpretation',
    visual_planning: 'spatial_reasoning',
    budget_thinking: 'planning',
    cost_control: 'planning',
    medical_reasoning: 'medical',
    clinical_reading: 'medical',
    biology_reasoning: 'biology',
    chemistry_reasoning: 'chemistry',
    biology_knowledge: 'biology',
    body_systems: 'biology',
    pressure_handling: 'emotional_stability',
    fast_decision: 'decision_making',
    empathy: 'empathy',
    hebrew_comprehension: 'language',
    arabic_vocabulary: 'language',
    semantic_understanding: 'language',
    reading_comprehension: 'language',
    semantic_reasoning: 'language',
    interpretation: 'humanities',
    fast_recall: 'memory',
    writing: 'communication',
    expression: 'communication',
    linguistic_logic: 'logic',
    pattern_recognition: 'logic',
    semantic_analysis: 'logic',
    hebrew: 'language',
    arabic: 'language',
    english: 'language',
    biology: 'biology',
    chemistry: 'chemistry',
    physics: 'physics',
    science: 'science',
    civics: 'social',
    citizenship: 'social',
    literature: 'humanities',
  };
  return aliases[key] || key;
}

function addSignal(vector, key, value, weight = 1) {
  if (!key) return;
  const normalizedKey = textToSkillKey(key);
  const score = clamp(normalizeScore100(value), 0, 100) / 100;
  const current = vector[normalizedKey] || { sum: 0, weight: 0 };
  vector[normalizedKey] = {
    sum: current.sum + score * weight,
    weight: current.weight + weight,
  };
}

function finalizeVector(weightedVector) {
  return Object.fromEntries(
    Object.entries(weightedVector).map(([key, value]) => [key, clamp01(value.sum / Math.max(1e-9, value.weight))])
  );
}

function dotProfile(studentVector = {}, majorVector = {}) {
  const entries = Object.entries(majorVector || {}).filter(([key]) => studentVector[key] !== undefined);
  if (!entries.length) return 0;
  let sum = 0;
  let weight = 0;
  entries.forEach(([key, importance]) => {
    const w = safeNum(importance, 0);
    if (w <= 0) return;
    sum += w * safeNum(studentVector[key], 0);
    weight += w;
  });
  return clamp01(sum / Math.max(1e-9, weight));
}

function scoreSourceAgainstProfile(studentVector = {}, majorVector = {}) {
  const entries = Object.entries(majorVector || {}).filter(([key]) => studentVector[key] !== undefined);
  if (!entries.length) return null;
  let sum = 0;
  let weight = 0;
  const totalProfileWeight = Object.values(majorVector || {})
    .reduce((total, importance) => total + Math.max(0, safeNum(importance, 0)), 0);
  const matchedSignals = [];
  entries.forEach(([key, importance]) => {
    const w = safeNum(importance, 0);
    if (w <= 0) return;
    const value = safeNum(studentVector[key], 0);
    sum += w * value;
    weight += w;
    if (value >= 0.55) matchedSignals.push(key);
  });
  const coverage = totalProfileWeight > 0 ? weight / totalProfileWeight : 1;
  const coverageMultiplier = coverage >= 0.33 ? 1 : 0.5 + coverage;
  return {
    score: clamp01((sum / Math.max(1e-9, weight)) * coverageMultiplier),
    matchedSignals,
  };
}

function redistributeWeights(available, gamesCap = DEFAULT_WEIGHTS.games) {
  const weights = {};
  const sourceKeys = ['assessment', 'interests', 'personality', 'games', 'potential'].filter((key) => available[key]);
  if (!sourceKeys.length) {
    return { assessment: 0, interests: 0, personality: 0, games: 0, potential: 0 };
  }

  const defaultSum = sourceKeys.reduce((sum, key) => sum + DEFAULT_WEIGHTS[key], 0);
  sourceKeys.forEach((key) => {
    weights[key] = defaultSum > 0 ? DEFAULT_WEIGHTS[key] / defaultSum : 0;
  });

  ['assessment', 'interests', 'personality', 'games', 'potential'].forEach((key) => {
    if (!weights[key]) weights[key] = 0;
  });
  return weights;
}

const SIGNAL_LABELS = {
  math: { ar: 'الرياضيات', he: 'מתמטיקה', en: 'math' },
  logic: { ar: 'التفكير المنطقي', he: 'חשיבה לוגית', en: 'logical thinking' },
  technology: { ar: 'الميول التقنية', he: 'עניין טכנולוגי', en: 'technology interest' },
  physics: { ar: 'الفيزياء', he: 'פיזיקה', en: 'physics' },
  chemistry: { ar: 'الكيمياء', he: 'כימיה', en: 'chemistry' },
  biology: { ar: 'الأحياء', he: 'ביולוגיה', en: 'biology' },
  science: { ar: 'التفكير العلمي', he: 'חשיבה מדעית', en: 'scientific reasoning' },
  spatial_reasoning: { ar: 'التفكير المكاني', he: 'חשיבה מרחבית', en: 'spatial reasoning' },
  engineering: { ar: 'الميول الهندسية', he: 'עניין הנדסי', en: 'engineering signals' },
  creativity: { ar: 'الإبداع', he: 'יצירתיות', en: 'creativity' },
  planning: { ar: 'التخطيط', he: 'תכנון', en: 'planning' },
  social: { ar: 'التواصل الاجتماعي', he: 'חברתיות', en: 'social fit' },
  communication: { ar: 'التواصل', he: 'תקשורת', en: 'communication' },
  language: { ar: 'اللغة', he: 'שפה', en: 'language' },
  humanities: { ar: 'الإنسانيات', he: 'מדעי הרוח', en: 'humanities' },
  business: { ar: 'الإدارة والأعمال', he: 'ניהול ועסקים', en: 'business' },
  medical: { ar: 'الميول الطبية', he: 'נטייה רפואית', en: 'medical fit' },
  research: { ar: 'البحث والتجارب', he: 'מחקר וניסויים', en: 'research' },
  decision_making: { ar: 'اتخاذ القرار', he: 'קבלת החלטות', en: 'decision making' },
  problem_solving: { ar: 'حل المشكلات', he: 'פתרון בעיות', en: 'problem solving' },
  optimization: { ar: 'تحسين الأنظمة', he: 'אופטימיזציה', en: 'optimization' },
  patience: { ar: 'الصبر', he: 'סבלנות', en: 'patience' },
  memory: { ar: 'الذاكرة', he: 'זיכרון', en: 'memory' },
  responsibility: { ar: 'المسؤولية', he: 'אחריות', en: 'responsibility' },
  accuracy: { ar: 'الدقة', he: 'דיוק', en: 'accuracy' },
  emotional_stability: { ar: 'ثبات الضغط', he: 'יציבות רגשית', en: 'emotional stability' },
  leadership: { ar: 'القيادة', he: 'מנהיגות', en: 'leadership' },
  empathy: { ar: 'التعاطف', he: 'אמפתיה', en: 'empathy' },
};

const MAJOR_DEMAND = {
  computer_science: 2.1,
  software_engineering: 2,
  data_science: 1.9,
  cyber_security: 1.8,
  medicine: 1.8,
  nursing: 1.5,
  civil_engineering: 1.6,
  electrical_engineering: 1.7,
  mechanical_engineering: 1.5,
  industrial_engineering: 1.5,
  architecture: 1.3,
  physics: 1.2,
  mathematics: 1.2,
  chemistry: 1.1,
  biology: 1.1,
  business_management: 1.3,
  economics: 1.1,
  law: 1.2,
  education: 1.1,
};

function signalLabel(key, language) {
  const lang = normalizeLang(language);
  return SIGNAL_LABELS[key]?.[lang] || key.replace(/_/g, ' ');
}

function sourceHasSignal(vector = {}, skillProfile = {}, threshold = 0.55) {
  return Object.entries(skillProfile)
    .filter(([key, importance]) => safeNum(importance, 0) > 0 && safeNum(vector[key], 0) >= threshold)
    .sort((left, right) => safeNum(right[1], 0) * safeNum(vector[right[0]], 0) - safeNum(left[1], 0) * safeNum(vector[left[0]], 0))
    .map(([key]) => key);
}

function tieBreaker(profile = {}, studentProfile = {}, parts = {}) {
  const key = profile.key || '';
  const skillProfile = profile.skillProfile || {};
  const assessmentHits = sourceHasSignal(studentProfile.vectors.assessment, skillProfile, 0.7).length;
  const interestHits = sourceHasSignal(studentProfile.vectors.interests, skillProfile, 0.65).length;
  const gameHits = sourceHasSignal(studentProfile.vectors.games, skillProfile, 0.65).length;
  const demand = MAJOR_DEMAND[key] || 1;
  const sourceSpread = Object.values(parts).filter((value) => safeNum(value, 0) >= 0.55).length;
  return Math.min(4, demand + assessmentHits * 0.45 + interestHits * 0.35 + gameHits * 0.2 + sourceSpread * 0.15);
}

function scoreForConfidence(normalizedScore, _confidenceLevel, hasAnyEvidence) {
  if (!hasAnyEvidence) return 0;
  return clamp(normalizedScore * 100, 0, 96);
}

function calibrateMatchScore(rawPercent, { confidenceScore, availableSources, hasAssessment }) {
  let score = rawPercent;
  const sourceCount = availableSources.filter((source) => source.score >= 0.45).length;
  const onlyGames = availableSources.length === 1 && availableSources[0]?.key === 'games';

  if (hasAssessment && !onlyGames && sourceCount >= 2) {
    if (confidenceScore >= 80 && rawPercent >= 65) score = Math.max(score, 70);
    else if (confidenceScore >= 70 && rawPercent >= 55) score = Math.max(score, 60);
  }

  if (rawPercent < 45) score = Math.min(score, 44);
  if (onlyGames) score = Math.min(score, 60);
  return clamp(score, 0, 96);
}

function confidenceScoreForEvidence(evidence = {}) {
  if (evidence.hasGames && !evidence.hasAssessment && !evidence.hasInterests && !evidence.hasPersonality && !evidence.hasPotential) {
    return safeNum(evidence.completedGameCount, 0) > 1 ? 35 : 25;
  }
  let score = 0;
  if (evidence.hasAssessment) score += 40;
  if (evidence.hasInterests) score += 20;
  if (evidence.hasPersonality) score += 20;
  if (evidence.hasGames) score += 10;
  if (safeNum(evidence.completedGameCount, 0) > 1) score += 10;
  if (evidence.hasPotential) score += 5;
  return clamp(score, evidence.hasAssessment ? 55 : evidence.hasGames ? 25 : 0, 100);
}

function hasAnyEvidence(evidence = {}) {
  return ['hasAssessment', 'hasPersonality', 'hasInterests', 'hasPotential', 'hasGames'].some((key) => evidence[key]);
}

function isGameOnlyProfile(studentProfile = {}) {
  const evidence = studentProfile.evidence || {};
  return !!evidence.hasGames && !evidence.hasAssessment && !evidence.hasInterests && !evidence.hasPersonality && !evidence.hasPotential;
}

function gameFamilyFromProfile(studentProfile = {}) {
  const gameIds = (studentProfile.gameSessions || [])
    .filter((session) => session.status === 'completed')
    .map((session) => normalizeMajorKey(session.game_id));
  if (gameIds.some((id) => id.includes('doctor') || id.includes('medical'))) return 'medical';
  if (gameIds.some((id) => id.includes('arabic') || id.includes('poet') || id.includes('word') || id.includes('language'))) return 'language';
  if (gameIds.some((id) => id.includes('bridge'))) return 'bridge';
  if (gameIds.some((id) => id.includes('physics'))) return 'physics';
  return 'general';
}

const GAME_ONLY_ALLOWED_MAJORS = {
  physics: ['physics', 'mechanical_engineering', 'electrical_engineering', 'civil_engineering', 'industrial_engineering', 'mathematics'],
  bridge: ['civil_engineering', 'architecture', 'mechanical_engineering', 'industrial_engineering', 'physics', 'mathematics'],
  medical: ['medicine', 'nursing', 'medical_laboratory_science', 'biology', 'chemistry'],
  language: ['arabic_language', 'law', 'education'],
  general: ['physics', 'mechanical_engineering', 'computer_science', 'data_science', 'mathematics'],
};

const GAME_ONLY_SCORE_CEILINGS = {
  physics: {
    physics: 55,
    mechanical_engineering: 52,
    electrical_engineering: 50,
    civil_engineering: 48,
    industrial_engineering: 45,
    mathematics: 44,
  },
  bridge: {
    civil_engineering: 55,
    architecture: 53,
    mechanical_engineering: 50,
    industrial_engineering: 48,
    physics: 45,
    mathematics: 42,
  },
  medical: {
    medicine: 55,
    medical_laboratory_science: 53,
    nursing: 50,
    biology: 47,
    chemistry: 45,
  },
  language: {
    arabic_language: 55,
    law: 48,
    education: 47,
  },
  general: {
    computer_science: 54,
    data_science: 52,
    mechanical_engineering: 50,
    electrical_engineering: 48,
    civil_engineering: 46,
    architecture: 45,
    industrial_engineering: 44,
    physics: 43,
    mathematics: 42,
  },
};

function isAllowedGameOnlyMajor(profileKey, studentProfile, parts = {}) {
  const family = gameFamilyFromProfile(studentProfile);
  const allowed = GAME_ONLY_ALLOWED_MAJORS[family] || GAME_ONLY_ALLOWED_MAJORS.general;
  if (allowed.includes(profileKey)) return true;

  const gameVector = studentProfile.vectors?.games || {};
  const hasComputingSignal = safeNum(gameVector.technology, 0) >= 0.6 || safeNum(gameVector.data_interpretation, 0) >= 0.6;
  if (hasComputingSignal && ['computer_science', 'software_engineering', 'data_science', 'cyber_security'].includes(profileKey)) {
    return safeNum(parts.games, 0) >= 0.45;
  }
  const hasEngineeringSignal =
    safeNum(gameVector.engineering, 0) >= 0.55 ||
    safeNum(gameVector.spatial_reasoning, 0) >= 0.55 ||
    safeNum(gameVector.physics, 0) >= 0.55;
  if (
    hasEngineeringSignal &&
    ['civil_engineering', 'architecture', 'mechanical_engineering', 'industrial_engineering', 'electrical_engineering', 'physics', 'mathematics'].includes(profileKey)
  ) {
    return safeNum(parts.games, 0) >= 0.3;
  }
  return false;
}

function calibrateGameOnlyScore(profileKey, rawPercent, studentProfile, parts = {}) {
  const family = gameFamilyFromProfile(studentProfile);
  const ceilings = GAME_ONLY_SCORE_CEILINGS[family] || {};
  const ceiling = ceilings[profileKey] ?? GAME_ONLY_SCORE_CEILINGS.general[profileKey] ?? 42;
  const baseByFamily = family === 'language' ? 30 : family === 'medical' ? 32 : 34;
  const demand = MAJOR_DEMAND[profileKey] || 1;
  const score = baseByFamily + rawPercent * 0.28 + Math.min(5, safeNum(parts.games, 0) * 5) + demand * 0.6;
  return clamp(score, 0, ceiling);
}

function gameOnlyExplanation(majorKey, studentProfile, language) {
  const lang = normalizeLang(language);
  const family = gameFamilyFromProfile(studentProfile);
  const copy = {
    physics: {
      physics: {
        ar: 'لعبة الفيزياء أظهرت مؤشراً أولياً على التفكير الفيزيائي وحل المشكلات.',
        he: 'משחק הפיזיקה הצביע על יכולת ראשונית בחשיבה פיזיקלית ופתרון בעיות.',
        en: 'The physics game showed an early signal for physical reasoning and problem solving.',
      },
      mechanical_engineering: {
        ar: 'لعبة الفيزياء أعطت إشارة أولية للتفكير الميكانيكي وفهم القوى والحركة.',
        he: 'משחק הפיזיקה נתן אות ראשוני לחשיבה מכנית והבנת כוחות ותנועה.',
        en: 'The physics game gave an early signal for mechanical reasoning and understanding forces and motion.',
      },
      electrical_engineering: {
        ar: 'لعبة الفيزياء دعمت بشكل جزئي التفكير التقني، لكن يلزم اختبار شامل لتأكيد الملاءمة.',
        he: 'משחק הפיזיקה נתן תמיכה חלקית לחשיבה טכנית, אך נדרש מבחן מלא לחיזוק ההתאמה.',
        en: 'The physics game partially supported technical thinking, but the full assessment is needed to confirm fit.',
      },
      civil_engineering: {
        ar: 'لعبة الفيزياء أعطت مؤشراً أولياً لفهم القوى والتخطيط الهندسي.',
        he: 'משחק הפיזיקה נתן אות ראשוני להבנת כוחות ותכנון הנדסי.',
        en: 'The physics game gave an early signal for understanding forces and engineering planning.',
      },
      industrial_engineering: {
        ar: 'لعبة الفيزياء أظهرت إشارة محدودة لحل المشكلات وتحسين الأنظمة.',
        he: 'משחק הפיזיקה הראה אות מוגבל לפתרון בעיות ושיפור מערכות.',
        en: 'The physics game showed a limited signal for problem solving and system optimization.',
      },
      mathematics: {
        ar: 'لعبة الفيزياء أظهرت مؤشراً ثانوياً للتفكير الكمي والمنطقي.',
        he: 'משחק הפיזיקה הראה אות משני לחשיבה כמותית ולוגית.',
        en: 'The physics game showed a secondary signal for quantitative and logical thinking.',
      },
    },
    bridge: {
      default: {
        ar: 'لعبة الجسر أعطت إشارة أولية للتفكير المكاني والتخطيط الهندسي.',
        he: 'משחק הגשר נתן אות ראשוני לחשיבה מרחבית ותכנון הנדסי.',
        en: 'The bridge game gave an early signal for spatial reasoning and engineering planning.',
      },
    },
    medical: {
      default: {
        ar: 'اللعبة الطبية أعطت إشارة أولية للتفكير الطبي وقراءة المعطيات.',
        he: 'המשחק הרפואי נתן אות ראשוני לחשיבה רפואית וקריאת נתונים.',
        en: 'The medical game gave an early signal for medical reasoning and reading data.',
      },
    },
    language: {
      default: {
        ar: 'لعبة اللغة أعطت إشارة أولية للفهم اللغوي والتعبير.',
        he: 'משחק השפה נתן אות ראשוני להבנה לשונית והבעה.',
        en: 'The language game gave an early signal for language comprehension and expression.',
      },
    },
  };
  return copy[family]?.[majorKey]?.[lang] || copy[family]?.default?.[lang] || copy.physics.physics[lang];
}

function gameCapForCount(count) {
  if (count <= 0) return 0;
  if (count === 1) return 0.1;
  if (count === 2) return 0.08;
  return 0.15;
}

function profileFromPersonality(personality) {
  if (!personality) return {};
  const openness = normalizeScore100(personality.openness);
  const conscientiousness = normalizeScore100(personality.conscientiousness);
  const extraversion = normalizeScore100(personality.extraversion);
  const agreeableness = normalizeScore100(personality.agreeableness);
  const neuroticism = normalizeScore100(personality.neuroticism, 50);
  const emotionalStability = 100 - neuroticism;
  return {
    creativity: clamp01(openness / 100),
    research: clamp01((openness + conscientiousness) / 200),
    planning: clamp01(conscientiousness / 100),
    responsibility: clamp01(conscientiousness / 100),
    accuracy: clamp01(conscientiousness / 100),
    leadership: clamp01((extraversion + conscientiousness) / 200),
    business: clamp01((extraversion + conscientiousness) / 200),
    social: clamp01((extraversion + agreeableness) / 200),
    communication: clamp01((extraversion + agreeableness) / 200),
    empathy: clamp01(agreeableness / 100),
    patience: clamp01((conscientiousness + agreeableness) / 200),
    emotional_stability: clamp01(emotionalStability / 100),
    decision_making: clamp01((conscientiousness + emotionalStability) / 200),
  };
}

function buildGameVectorFromSessions(sessions = [], careerSignals = [], gameSkillRows = [], gameInterestRows = []) {
  const weighted = {};
  const completed = sessions.filter((session) => session?.status === 'completed');
  completed.forEach((session) => {
    const gameKey = normalizeMajorKey(session.game_id);
    const mapping = GAME_TOPIC_MAPPINGS[gameKey];
    const strength = Math.max(
      safeNum(session.interest_signal, 0),
      safeNum(session.engagement_score, 0),
      safeNum(session.trust_score, 0),
      safeNum(session.score, 0),
      50
    );
    Object.values(mapping?.topics || {}).forEach((topic) => {
      (topic.skill_tags || []).forEach((tag) => addSignal(weighted, tag, strength, safeNum(topic.signal_weight, 1)));
      (topic.related_subjects || []).forEach((subject) => addSignal(weighted, subject, strength, 0.75));
    });
  });

  (careerSignals || []).forEach((signal) => {
    addSignal(weighted, signal.degree_code || signal.topic_key || signal.topic || signal.skill_tag, signal.career_signal || signal.score || 50, 0.35);
    const metadata = signal.metadata || {};
    (metadata.skill_tags || []).forEach((tag) => addSignal(weighted, tag, signal.ability_signal || signal.career_signal || 50, 0.25));
    (metadata.related_subjects || []).forEach((subject) => addSignal(weighted, subject, signal.interest_signal || signal.career_signal || 50, 0.25));
  });

  (gameSkillRows || []).forEach((row) => {
    addSignal(weighted, row.skill_tag, row.signal_strength || row.ability_signal || 50, 0.75);
    const metadata = row.metadata || {};
    (metadata.related_subjects || []).forEach((subject) => addSignal(weighted, subject, row.interest_signal || row.signal_strength || 50, 0.35));
  });

  (gameInterestRows || []).forEach((row) => {
    addSignal(weighted, row.related_subject, row.interest_signal || row.ability_signal || 50, safeNum(row.signal_weight, 0.6));
    const metadata = row.metadata || {};
    (metadata.skill_tags || []).forEach((tag) => addSignal(weighted, tag, row.ability_signal || row.interest_signal || 50, 0.25));
  });

  return finalizeVector(weighted);
}

async function maybeQuery(run, fallback = []) {
  try {
    const { data, error } = await run();
    if (error) return fallback;
    return data || fallback;
  } catch {
    return fallback;
  }
}

async function loadMajors() {
  const degrees = await maybeQuery(() =>
    supabase
      .from('degrees')
      .select('id, code, name_ar, name_he, name_en, category, is_active, degree_subject_weights(subject_id, weight)')
      .eq('is_active', true)
  );
  if (degrees.length) return degrees.map((row) => ({ ...row, source_table: 'degrees' }));

  const majors = await maybeQuery(() =>
    supabase
      .from('majors')
      .select('id, key, code, name_ar, name_he, name_en, category, is_active')
      .eq('is_active', true)
  );
  if (majors.length) return majors.map((row) => ({ ...row, source_table: 'majors' }));

  return majorProfiles.map((profile) => ({
    id: profile.key,
    key: profile.key,
    code: profile.key,
    name_ar: profile.name_ar,
    name_he: profile.name_he,
    name_en: profile.name_en,
    category: profile.key,
    is_active: true,
    source_table: 'majorProfiles',
  }));
}

export async function buildStudentRecommendationProfile(studentId) {
  if (!studentId) throw new Error('studentId is required');

  const [
    studentRows,
    completedSessionRows,
    sessionSubjectRows,
    responseRows,
    abilityRows,
    interestRows,
    personalityRows,
    potentialRows,
    gameRows,
    careerRows,
    gameSkillRows,
    gameInterestRows,
  ] = await Promise.all([
    maybeQuery(() => supabase.from('students').select('*').eq('id', studentId).limit(1)),
    maybeQuery(() =>
      supabase
        .from('test_sessions')
        .select('id, status, session_type, completed_at, final_score, metadata')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
    ),
    maybeQuery(() =>
      supabase
        .from('test_session_subjects')
        .select('*, subjects(*)')
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
    ),
    maybeQuery(() =>
      supabase
        .from('student_responses')
        .select('id, session_id, is_correct')
        .eq('student_id', studentId)
        .limit(500)
    ),
    maybeQuery(() => supabase.from('student_abilities').select('*, subjects(*)').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_interests').select('*, subjects(*)').eq('student_id', studentId)),
    maybeQuery(() =>
      supabase
        .from('student_personality_profiles')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
    ),
    maybeQuery(() => supabase.from('student_learning_potential').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('game_sessions').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_career_signals').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_game_skills').select('*').eq('student_id', studentId)),
    maybeQuery(() => supabase.from('student_game_interests').select('*').eq('student_id', studentId)),
  ]);

  const latestCompletedSessionId = completedSessionRows[0]?.id || null;
  const latestSessionSubjects = latestCompletedSessionId
    ? sessionSubjectRows.filter((row) => row.session_id === latestCompletedSessionId)
    : sessionSubjectRows;
  const latestResponses = latestCompletedSessionId
    ? responseRows.filter((row) => row.session_id === latestCompletedSessionId)
    : responseRows;

  const abilityWeighted = {};
  abilityRows.forEach((row) => {
    const subjectName = row.subjects?.code || row.subjects?.name_en || row.subjects?.name_ar || row.subjects?.name_he || row.subject_id;
    addSignal(abilityWeighted, subjectName, row.ability_score ?? row.accuracy_rate ?? 50);
  });

  if (!abilityRows.length) {
    latestSessionSubjects
      .filter((row) => row.questions_answered > 0)
      .forEach((row) => {
        const subjectName = row.subjects?.code || row.subjects?.name_en || row.subjects?.name_ar || row.subjects?.name_he || row.subject_id;
        const accuracyScore = safeNum(row.correct_answers, 0) / Math.max(1, safeNum(row.questions_answered, 0));
        const thetaScore = row.theta_estimate === null || row.theta_estimate === undefined
          ? null
          : clamp(50 + safeNum(row.theta_estimate, 0) * 18, 0, 100);
        addSignal(abilityWeighted, subjectName, thetaScore ?? accuracyScore * 100);
      });
  }

  const interestWeighted = {};
  interestRows.forEach((row) => {
    const subjectName = row.subjects?.code || row.subjects?.name_en || row.subjects?.name_ar || row.subjects?.name_he || row.subject_id;
    addSignal(interestWeighted, subjectName, row.interest_score ?? 50);
  });

  const potentialWeighted = {};
  potentialRows.forEach((row) => {
    addSignal(potentialWeighted, row.subject_code || row.subject_id || row.area || row.skill, row.potential_score || row.score || 50);
  });

  const personality = personalityRows[0] || null;
  const completedGames = gameRows.filter((row) => row.status === 'completed');
  const hasCompletedAssessment = completedSessionRows.length > 0;
  const evidence = {
    hasAssessment:
      hasCompletedAssessment ||
      abilityRows.some((row) => safeNum(row.total_questions_answered, 0) > 0 || row.ability_score !== null) ||
      latestSessionSubjects.some((row) => safeNum(row.questions_answered, 0) > 0) ||
      latestResponses.length > 0,
    hasPersonality: !!personality,
    hasInterests: interestRows.length > 0,
    hasPotential: potentialRows.length > 0,
    hasGames: completedGames.length > 0 || careerRows.length > 0 || gameSkillRows.length > 0 || gameInterestRows.length > 0,
    completedGameCount: new Set(completedGames.map((row) => normalizeMajorKey(row.game_id))).size,
  };

  const available = {
    assessment: evidence.hasAssessment,
    personality: evidence.hasPersonality,
    interests: evidence.hasInterests,
    potential: evidence.hasPotential,
    games: evidence.hasGames,
  };

  const debugEnabled =
    globalThis.__I3DAD_RECOMMENDATION_DEBUG__ ||
    (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_RECOMMENDATION_DEBUG === 'true');
  if (debugEnabled) {
    console.info('[recommendationEngine] inputs', {
      studentId,
      latestCompletedAssessmentSessionId: latestCompletedSessionId,
      abilitiesLoaded: abilityRows.length,
      interestsLoaded: interestRows.length,
      personalityFound: !!personality,
      completedGames: completedGames.length,
      sessionSubjectsLoaded: latestSessionSubjects.length,
      responsesLoaded: latestResponses.length,
      careerSignalsLoaded: careerRows.length,
      gameSkillsLoaded: gameSkillRows.length,
      gameInterestsLoaded: gameInterestRows.length,
      potentialLoaded: potentialRows.length,
      weights: redistributeWeights(available, gameCapForCount(evidence.completedGameCount)),
    });
  }

  return {
    studentId,
    student: studentRows[0] || null,
    completedAssessmentSession: completedSessionRows[0] || null,
    abilityRows,
    sessionSubjectRows: latestSessionSubjects,
    responseRows: latestResponses,
    interestRows,
    potentialRows,
    gameSessions: gameRows,
    careerSignals: careerRows,
    gameSkillRows,
    gameInterestRows,
    personality,
    vectors: {
      assessment: finalizeVector(abilityWeighted),
      interests: finalizeVector(interestWeighted),
      potential: finalizeVector(potentialWeighted),
      personality: profileFromPersonality(personality),
      games: buildGameVectorFromSessions(gameRows, careerRows, gameSkillRows, gameInterestRows),
    },
    evidence,
    weights: redistributeWeights(available, gameCapForCount(evidence.completedGameCount)),
  };
}

export function calculateConfidence(studentProfile) {
  const evidence = studentProfile?.evidence || {};
  let level = 'low';

  if (evidence.hasAssessment && (evidence.hasPersonality || evidence.hasInterests) && (evidence.hasPotential || evidence.hasGames || evidence.hasInterests)) {
    level = 'high';
  } else if (evidence.hasAssessment || (evidence.hasPersonality && evidence.hasInterests)) {
    level = 'medium';
  }

  return {
    confidence_level: level,
    confidence_reason: CONFIDENCE_MESSAGES[level],
    is_preliminary: level === 'low' || !evidence.hasAssessment,
  };
}

export function getMissingRecommendationSteps(studentProfile) {
  const evidence = studentProfile?.evidence || {};
  const missing = [];
  if (!evidence.hasAssessment) missing.push({ key: 'comprehensive_test', label: MISSING_STEP_COPY.comprehensive_test });
  if (!evidence.hasPersonality) missing.push({ key: 'personality_test', label: MISSING_STEP_COPY.personality_test });
  if (!evidence.hasInterests) missing.push({ key: 'interests', label: MISSING_STEP_COPY.interests });
  if (!evidence.hasGames) missing.push({ key: 'games', label: MISSING_STEP_COPY.games });
  return missing;
}

export function calculateMajorScores(studentProfile, majors = []) {
  const confidence = calculateConfidence(studentProfile);
  const missing_steps = getMissingRecommendationSteps(studentProfile);
  const hasEvidence = hasAnyEvidence(studentProfile.evidence || {});
  const debugEnabled =
    globalThis.__I3DAD_RECOMMENDATION_DEBUG__ ||
    (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_RECOMMENDATION_DEBUG === 'true');
  const confidenceScore = confidenceScoreForEvidence(studentProfile.evidence || {});
  const dataSourcesUsed = Object.entries({
    assessment: studentProfile.evidence?.hasAssessment,
    interests: studentProfile.evidence?.hasInterests,
    personality: studentProfile.evidence?.hasPersonality,
    games: studentProfile.evidence?.hasGames,
    potential: studentProfile.evidence?.hasPotential,
  }).filter(([, enabled]) => enabled).map(([key]) => key);

  const gameOnly = isGameOnlyProfile(studentProfile);

  return majors.map((major, index) => {
    const profile = getMajorProfileForRow(major) || majorProfiles.find((item) => item.key === normalizeMajorKey(major.code));
    const fallbackKey = normalizeMajorKey(major.key || major.category || major.code || major.name_en || major.name_ar || major.name_he || major.id);
    const resolvedProfile = profile || {
      key: fallbackKey,
      aliases: [],
      name_ar: major.name_ar || major.name_en || fallbackKey,
      name_he: major.name_he || major.name_en || fallbackKey,
      name_en: major.name_en || major.name_he || major.name_ar || fallbackKey,
      skillProfile: {},
      related_subjects: [],
    };
    const skillProfile = resolvedProfile?.skillProfile || {};
    const sourceMatches = {
      assessment: studentProfile.evidence?.hasAssessment ? scoreSourceAgainstProfile(studentProfile.vectors.assessment, skillProfile) : null,
      interests: studentProfile.evidence?.hasInterests ? scoreSourceAgainstProfile(studentProfile.vectors.interests, skillProfile) : null,
      personality: studentProfile.evidence?.hasPersonality ? scoreSourceAgainstProfile(studentProfile.vectors.personality, skillProfile) : null,
      games: studentProfile.evidence?.hasGames ? scoreSourceAgainstProfile(studentProfile.vectors.games, skillProfile) : null,
      potential: studentProfile.evidence?.hasPotential ? scoreSourceAgainstProfile(studentProfile.vectors.potential, skillProfile) : null,
    };
    const parts = Object.fromEntries(
      Object.entries(sourceMatches).map(([key, value]) => [key, value?.score ?? 0])
    );
    const availableSources = Object.entries(sourceMatches)
      .filter(([, value]) => value && Number.isFinite(value.score))
      .map(([key, value]) => ({
        key,
        score: value.score,
        baseWeight: DEFAULT_WEIGHTS[key],
        matchedSignals: value.matchedSignals || [],
      }));
    const rawScore = availableSources.reduce((sum, source) => sum + source.score * source.baseWeight, 0);
    const totalWeight = availableSources.reduce((sum, source) => sum + source.baseWeight, 0);
    const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0;
    const recalculatedWeights = Object.fromEntries(
      ['assessment', 'interests', 'personality', 'games', 'potential'].map((key) => [
        key,
        totalWeight > 0 && sourceMatches[key] ? DEFAULT_WEIGHTS[key] / totalWeight : 0,
      ])
    );
    const hasMajorEvidence = availableSources.length > 0;
    const majorDataSourcesUsed = availableSources.map((source) => source.key);
    const gameWeight = recalculatedWeights.games || 0;
    const gamePoints = Math.round(parts.games * gameWeight * 100);
    const rawMatchPercent = scoreForConfidence(normalizedScore, confidence.confidence_level, hasEvidence && hasMajorEvidence);
    const calibratedScore = calibrateMatchScore(rawMatchPercent, {
      confidenceScore,
      availableSources,
      hasAssessment: !!studentProfile.evidence?.hasAssessment,
    });
    const gameOnlyAllowed = !gameOnly || isAllowedGameOnlyMajor(resolvedProfile.key, studentProfile, parts);
    const gameOnlyScore = gameOnly
      ? calibrateGameOnlyScore(resolvedProfile.key, rawMatchPercent, studentProfile, parts)
      : null;
    let matchPercentage = Math.round(
      clamp(
        (gameOnly ? gameOnlyScore : calibratedScore) +
          (!gameOnly && hasEvidence && hasMajorEvidence ? tieBreaker(resolvedProfile, studentProfile, parts) : 0) -
          index * 0.05,
        0,
        gameOnly ? 55 : studentProfile.evidence?.hasAssessment ? 96 : confidence.confidence_level === 'low' ? 54 : 96
      )
    );
    if (!gameOnly && confidence.confidence_level === 'low' && studentProfile.evidence?.hasGames && !studentProfile.evidence?.hasAssessment && matchPercentage === 45) {
      matchPercentage += tieBreaker(profile, studentProfile, parts) >= 2 ? 1 : -1;
    }

    if (debugEnabled) {
      console.info('[recommendationEngine] major score', {
        studentId: studentProfile.studentId,
        majorKey: resolvedProfile.key,
        gameOnly,
        gameOnlyAllowed,
        availableSources: availableSources.map((source) => ({
          key: source.key,
          rawScore: Number((source.score * 100).toFixed(2)),
          baseWeight: source.baseWeight,
          effectiveWeight: Number(((recalculatedWeights[source.key] || 0) * 100).toFixed(2)),
          matchedSignals: source.matchedSignals,
        })),
        rawScore: Number(rawMatchPercent.toFixed(2)),
        calibratedScore: Number(calibratedScore.toFixed(2)),
        normalizedScore: Number((normalizedScore * 100).toFixed(2)),
        confidenceScore,
        finalScore: matchPercentage,
      });
    }

    return {
      degree_id: major.id || resolvedProfile.key,
      major_id: major.id || resolvedProfile.key,
      major_key: resolvedProfile.key,
      matching_major_keys: [resolvedProfile.key, ...(resolvedProfile.aliases || [])].map(normalizeMajorKey),
      code: major.code || major.key || resolvedProfile.key,
      name_ar: major.name_ar || resolvedProfile.name_ar,
      name_he: major.name_he || resolvedProfile.name_he,
      name_en: major.name_en || resolvedProfile.name_en,
      category: major.category || resolvedProfile.key,
      score: Number((matchPercentage / 100).toFixed(4)),
      score_percent: matchPercentage,
      match_score: matchPercentage,
      match_percentage: matchPercentage,
      confidence_score: confidenceScore,
      confidence_level: confidence.confidence_level,
      confidence_reason: confidence.confidence_reason,
      is_preliminary: confidence.is_preliminary,
      is_game_only_preliminary: gameOnly,
      game_only_allowed: gameOnlyAllowed,
      missing_steps,
      usedWeights: recalculatedWeights,
      data_sources_used: majorDataSourcesUsed.length ? majorDataSourcesUsed : dataSourcesUsed,
      related_subjects: resolvedProfile?.related_subjects || [],
      game_signal_bonus: Math.min(gamePoints, Math.round(gameCapForCount(studentProfile.evidence.completedGameCount) * 100)),
      breakdown: {
        sources: parts,
        weights: recalculatedWeights,
        available_sources: availableSources.map((source) => ({
          key: source.key,
          score: Number((source.score * 100).toFixed(2)),
          baseWeight: source.baseWeight,
          effectiveWeight: Number(((recalculatedWeights[source.key] || 0) * 100).toFixed(2)),
          matchedSignals: source.matchedSignals,
        })),
        normalized_score: Number(normalizedScore.toFixed(4)),
        raw_score_percent: Number(rawMatchPercent.toFixed(2)),
        calibrated_score_percent: Number(calibratedScore.toFixed(2)),
        game_only_score_percent: gameOnlyScore === null ? null : Number(gameOnlyScore.toFixed(2)),
        game: {
          bonus_percent: Math.min(gamePoints, Math.round(gameCapForCount(studentProfile.evidence.completedGameCount) * 100)),
          completed_game_count: studentProfile.evidence.completedGameCount,
        },
        evidence: studentProfile.evidence,
      },
      profile: resolvedProfile,
    };
  }).filter((score) => {
    if (!gameOnly) return true;
    return score.game_only_allowed && score.match_percentage >= 30;
  }).sort((left, right) => {
    if (right.match_percentage !== left.match_percentage) return right.match_percentage - left.match_percentage;
    return (MAJOR_DEMAND[right.major_key] || 0) - (MAJOR_DEMAND[left.major_key] || 0);
  });
}

export function explainMajorRecommendation(major, studentProfile, signals = {}, language = 'ar') {
  const lang = normalizeLang(language);
  const name = major[`name_${lang}`] || major.name_en || major.name_ar || major.name_he || major.code;
  const skillProfile = major.profile?.skillProfile || {};
  if (major.is_game_only_preliminary || isGameOnlyProfile(studentProfile)) {
    const explanation = gameOnlyExplanation(major.major_key, studentProfile, lang);
    return {
      explanation,
      top_reasons: [explanation],
      related_game_signals: signals.gameSignals || [],
    };
  }
  const assessmentSignals = sourceHasSignal(studentProfile.vectors.assessment, skillProfile, 0.5).slice(0, 2);
  const interestSignals = sourceHasSignal(studentProfile.vectors.interests, skillProfile, 0.55).slice(0, 2);
  const personalitySignals = sourceHasSignal(studentProfile.vectors.personality, skillProfile, 0.5).slice(0, 2);
  const gameSignals = sourceHasSignal(studentProfile.vectors.games, skillProfile, 0.55).slice(0, 2);
  const strongSources = Object.entries(major.breakdown?.sources || {})
    .filter(([, value]) => value >= 0.42)
    .sort((left, right) => safeNum(right[1], 0) - safeNum(left[1], 0))
    .map(([key]) => key);
  const gameSupported = safeNum(major.game_signal_bonus, 0) > 0;
  const assessmentExists = !!studentProfile.evidence?.hasAssessment;
  const hasPersonality = !!studentProfile.evidence?.hasPersonality && personalitySignals.length > 0;
  const hasInterests = !!studentProfile.evidence?.hasInterests && interestSignals.length > 0;
  const primarySignals = [...assessmentSignals, ...interestSignals, ...personalitySignals, ...gameSignals]
    .filter((value, index, arr) => value && arr.indexOf(value) === index)
    .slice(0, 4);
  const signalText = primarySignals.map((signal) => signalLabel(signal, lang)).join(lang === 'he' || lang === 'en' ? ', ' : '، ');
  const assessmentText = assessmentSignals.map((signal) => signalLabel(signal, lang)).join(lang === 'he' || lang === 'en' ? ', ' : '، ');
  const personalityText = personalitySignals.map((signal) => signalLabel(signal, lang)).join(lang === 'he' || lang === 'en' ? ', ' : '، ');
  const gameText = gameSignals.map((signal) => signalLabel(signal, lang)).join(lang === 'he' || lang === 'en' ? ', ' : '، ');

  const text = {
    ar: assessmentExists && signalText
      ? `تم اقتراح ${name} لأن الملاءمة تعتمد على دمج نتائج الاختبار${hasPersonality ? '، ملف الشخصية' : ''}${hasInterests ? '، والاهتمامات' : ''}${gameSupported ? '، وإشارات الألعاب' : ''}. ${assessmentText ? `نتائج الاختبار أظهرت قوة في ${assessmentText}.` : ''}${personalityText ? ` وظهر دعم من الشخصية في ${personalityText}.` : ''}${gameText ? ` الألعاب أضافت دعماً جزئياً في ${gameText}.` : ''}`
      : signalText
      ? `تم اقتراح ${name} لأن ملفك يُظهر إشارات مناسبة في ${signalText}.${gameSupported ? ' نتائج الألعاب دعمت هذا الاتجاه بشكل محدود وليست المصدر المركزي.' : ''}`
      : `تم اقتراح ${name} كخيار أولي لأن البيانات الحالية قليلة؛ أكمل الاختبار الشامل لرفع دقة التوصية.`,
    he: assessmentExists && signalText
      ? `${name} הומלץ כי ההתאמה מבוססת על שילוב של תוצאות המבחן${hasPersonality ? ', פרופיל האישיות' : ''}${hasInterests ? ' ותחומי העניין' : ''}${gameSupported ? ' ואותות המשחקים' : ''}. ${assessmentText ? `תוצאות המבחן הצביעו על חוזק ב-${assessmentText}.` : ''}${personalityText ? ` פרופיל האישיות תמך ב-${personalityText}.` : ''}${gameText ? ` המשחקים הוסיפו תמיכה חלקית ב-${gameText}.` : ''}`
      : signalText
      ? `${name} הומלץ כי הפרופיל שלך מצביע על התאמה ב-${signalText}.${gameSupported ? ' תוצאות המשחקים תמכו בכיוון זה באופן מוגבל ואינן המקור המרכזי.' : ''}`
      : `${name} מוצג כהמלצה ראשונית כי כרגע יש מעט נתונים; השלימו את המבחן המקיף כדי לשפר דיוק.`,
    en: assessmentExists && signalText
      ? `${name} is recommended because this fit combines assessment results${hasPersonality ? ', personality' : ''}${hasInterests ? ', interests' : ''}${gameSupported ? ', and game signals' : ''}. ${assessmentText ? `The assessment showed strength in ${assessmentText}.` : ''}${personalityText ? ` Personality supported ${personalityText}.` : ''}${gameText ? ` Games added partial support in ${gameText}.` : ''}`
      : signalText
      ? `${name} was suggested because your profile shows relevant signals in ${signalText}.${gameSupported ? ' Game results lightly supported this direction but were not the central source.' : ''}`
      : `${name} is shown as a preliminary option because current data is limited; complete the comprehensive test to improve accuracy.`,
  };

  const topReasons = [
    ...assessmentSignals.slice(0, 2).map((signal) => localized({
      ar: `نتائج الاختبار تدعم ${signalLabel(signal, 'ar')}`,
      he: `תוצאות המבחן תומכות ב-${signalLabel(signal, 'he')}`,
      en: `Assessment supports ${signalLabel(signal, 'en')}`,
    }, lang)),
    ...interestSignals.slice(0, 2).map((signal) => localized({
      ar: `اهتماماتك تميل إلى ${signalLabel(signal, 'ar')}`,
      he: `תחומי העניין שלך נוטים ל-${signalLabel(signal, 'he')}`,
      en: `Your interests lean toward ${signalLabel(signal, 'en')}`,
    }, lang)),
    ...personalitySignals.slice(0, 1).map((signal) => localized({
      ar: `ملف الشخصية يدعم ${signalLabel(signal, 'ar')}`,
      he: `פרופיל האישיות תומך ב-${signalLabel(signal, 'he')}`,
      en: `Personality profile supports ${signalLabel(signal, 'en')}`,
    }, lang)),
    ...gameSignals.slice(0, 1).map((signal) => localized({
      ar: `إشارات الألعاب عززت ${signalLabel(signal, 'ar')} بشكل خفيف`,
      he: `אותות המשחקים חיזקו מעט את ${signalLabel(signal, 'he')}`,
      en: `Game signals lightly reinforced ${signalLabel(signal, 'en')}`,
    }, lang)),
  ].filter(Boolean);

  return {
    explanation: text[lang],
    top_reasons: topReasons.length ? topReasons.slice(0, 4) : strongSources.slice(0, 3).map((source) => localized({
      ar: source === 'assessment' ? 'نتائج الاختبار الشامل تدعم هذا المسار' : source === 'games' ? 'إشارات الألعاب داعمة بشكل محدود' : `مصدر ${source} يدعم هذا المسار`,
      he: source === 'assessment' ? 'תוצאות המבחן המקיף תומכות במסלול' : source === 'games' ? 'אותות המשחקים תומכים באופן מוגבל' : `מקור ${source} תומך במסלול`,
      en: source === 'assessment' ? 'Comprehensive test results support this path' : source === 'games' ? 'Game signals lightly support this path' : `${source} supports this path`,
    }, lang)),
    related_game_signals: signals.gameSignals || [],
  };
}

export async function getRecommendedMajors(studentId, options = {}) {
  const language = normalizeLang(options.language);
  const limit = Math.max(1, Math.min(20, safeNum(options.limit, 5)));
  const studentProfile = await buildStudentRecommendationProfile(studentId);
  if (!hasAnyEvidence(studentProfile.evidence)) return [];
  const majors = await loadMajors();
  const scores = calculateMajorScores(studentProfile, majors).slice(0, limit);

  return scores.map((major) => {
    const explanation = explainMajorRecommendation(major, studentProfile, {}, language);
    const name = major[`name_${language}`] || major.name_en || major.name_ar || major.name_he || major.code;
    return {
      ...major,
      name,
      ...explanation,
    };
  });
}

export async function getRecommendedMajorsWithInstitutions(studentId, options = {}) {
  const language = normalizeLang(options.language);
  const recommendations = await getRecommendedMajors(studentId, options);
  const studentProfile = await buildStudentRecommendationProfile(studentId);
  const location = options.studentLocation || {
    city: studentProfile.student?.city || studentProfile.student?.city_ar || studentProfile.student?.city_he || studentProfile.student?.school_name,
    region: studentProfile.student?.region,
    latitude: studentProfile.student?.latitude,
    longitude: studentProfile.student?.longitude,
    languagePreference: language,
  };

  const enriched = await Promise.all(recommendations.map(async (major) => ({
    ...major,
    institutions: await getInstitutionsForMajor(major.degree_id || major.major_key || major.code, location, {
      language,
      majorKey: major.major_key || major.code,
      code: major.code,
      name_ar: major.name_ar,
      name_he: major.name_he,
      name_en: major.name_en,
    }),
  })));

  return enriched;
}

export default {
  buildStudentRecommendationProfile,
  calculateMajorScores,
  calculateConfidence,
  getMissingRecommendationSteps,
  explainMajorRecommendation,
  getRecommendedMajors,
  getRecommendedMajorsWithInstitutions,
};
