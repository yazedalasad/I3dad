import { getStudentAbilities } from './abilityService';
import { recommendTopDegrees } from './recommendationService';
import { getStudentGameSessions } from '../features/games/shared/services/gameSessionService';
import {
  buildGameLearningHighlight,
  buildGameLearningSummary,
} from '../features/games/shared/utils/gameLearningProfile';

function safeNum(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function localize(copy, language) {
  const normalizedLanguage = normalizeLanguage(language);
  return copy?.[normalizedLanguage] || copy?.en || copy?.ar || copy?.he || '';
}

function normalizeMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function calculateGameDegreeFit(recommendation, gameHighlights = []) {
  const degreeText = normalizeMatchText(
    [
      recommendation?.name,
      recommendation?.name_ar,
      recommendation?.name_he,
      recommendation?.name_en,
      recommendation?.category,
      recommendation?.code,
    ].filter(Boolean).join(' ')
  );

  if (!degreeText) return 0;

  return gameHighlights.reduce((bestFit, game) => {
    const candidateTerms = [
      ...(game?.suggestedMajors || []),
      game?.focusArea,
      ...(game?.topics || []),
      ...(game?.topicSignals || []).map((signal) => signal.topic),
    ]
      .map(normalizeMatchText)
      .filter((term) => term.length >= 3);

    const matched = candidateTerms.some(
      (term) => degreeText.includes(term) || term.includes(degreeText)
    );

    if (!matched) return bestFit;

    const bestTopicSignal = (game?.topicSignals || []).reduce(
      (best, signal) => Math.max(best, safeNum(signal?.score, 0)),
      0
    );
    const gameWeight = Math.max(safeNum(game?.score, 0), bestTopicSignal) / 100;
    return Math.max(bestFit, Math.round(12 * gameWeight));
  }, 0);
}

const gameProfileMap = {
  doctor_soroka: {
    title: {
      ar: 'الطبيب في سوروكا',
      he: 'רופא בסורוקה',
      en: 'Doctor at Soroka',
    },
    skillTags: {
      ar: ['العبرية', 'المنطق التشخيصي', 'اتخاذ القرار'],
      he: ['עברית', 'חשיבה אבחונית', 'קבלת החלטות'],
      en: ['Hebrew', 'Diagnostic reasoning', 'Decision making'],
    },
    focusArea: {
      ar: 'الميل الطبي',
      he: 'נטייה רפואית',
      en: 'Medical interest',
    },
    nextStep: {
      ar: 'جرّب أسئلة أحياء قصيرة بعد اللعبة لتأكيد الميل الطبي.',
      he: 'נסו שאלות ביולוגיה קצרות אחרי המשחק כדי לאמת את הנטייה הרפואית.',
      en: 'Try a short biology quiz after the game to validate the medical track.',
    },
  },
  physics_lab: {
    title: {
      ar: 'مختبر الفيزياء',
      he: 'מעבדת פיזיקה',
      en: 'Physics Lab',
    },
    skillTags: {
      ar: ['الفيزياء', 'حل المشكلات', 'التفكير العلمي'],
      he: ['פיזיקה', 'פתרון בעיות', 'חשיבה מדעית'],
      en: ['Physics', 'Problem solving', 'Scientific thinking'],
    },
    focusArea: {
      ar: 'الميل الهندسي',
      he: 'נטייה הנדסית',
      en: 'Engineering interest',
    },
    nextStep: {
      ar: 'كمّل بمهمة فيزياء أعمق أو مسار هندسي قصير.',
      he: 'המשיכו למשימת פיזיקה עמוקה יותר או למסלול הנדסי קצר.',
      en: 'Follow with a deeper physics activity or a short engineering path.',
    },
  },
  arabic_poet_puzzle: {
    title: {
      ar: 'كنوز الألفاظ',
      he: 'אוצר המילים',
      en: 'Word Treasures',
    },
    skillTags: {
      ar: ['العربية', 'المفردات', 'الذاكرة'],
      he: ['ערבית', 'אוצר מילים', 'זיכרון'],
      en: ['Arabic', 'Vocabulary', 'Memory'],
    },
    focusArea: {
      ar: 'القوة اللغوية',
      he: 'חוזקה שפתית',
      en: 'Language strength',
    },
    nextStep: {
      ar: 'أضف نشاط قراءة أو كتابة قصيرة لتطوير القوة اللغوية.',
      he: 'הוסיפו פעילות קריאה או כתיבה קצרה כדי לפתח את החוזקה השפתית.',
      en: 'Add a short reading or writing task to grow language strength.',
    },
  },
};

function localizeSubjectName(subject, language, fallbackIndex = 0) {
  return (
    localize(
      {
        ar: subject?.subjects?.name_ar,
        he: subject?.subjects?.name_he,
        en: subject?.subjects?.name_en,
      },
      language
    ) ||
    localize(
      {
        ar: `مهارة ${fallbackIndex + 1}`,
        he: `יכולת ${fallbackIndex + 1}`,
        en: `Skill ${fallbackIndex + 1}`,
      },
      language
    )
  );
}

function buildReasonLines(recommendation, language) {
  const topSubjects = recommendation?.breakdown?.ability?.top_subjects || [];
  const topTraits = recommendation?.breakdown?.personality?.top_traits || [];

  const subjectReasons = topSubjects.slice(0, 3).map((subject) => {
    const subjectName = localize(
      {
        ar: subject?.subject_name_ar,
        he: subject?.subject_name_he,
        en: subject?.subject_name_en,
      },
      language
    );

    const percent = Math.round(clamp(safeNum(subject?.signal, 0) * 100, 0, 100));

    return localize(
      {
        ar: `${subjectName} ظهر عندك كقوة بنسبة ${percent}%`,
        he: `${subjectName} הופיע אצלך כחוזקה של ${percent}%`,
        en: `${subjectName} appeared as a ${percent}% strength`,
      },
      language
    );
  });

  const traitReasons = topTraits.slice(0, 2).map((trait) => {
    const traitMap = {
      O: { ar: 'الانفتاح', he: 'פתיחות', en: 'Openness' },
      C: { ar: 'الانضباط', he: 'מצפוניות', en: 'Conscientiousness' },
      E: { ar: 'الانبساط', he: 'מוחצנות', en: 'Extraversion' },
      A: { ar: 'التوافق', he: 'נעימות', en: 'Agreeableness' },
      N: { ar: 'إدارة الضغط', he: 'ניהול לחץ', en: 'Stress regulation' },
    };

    const traitName = localize(traitMap[trait?.trait], language);
    const closeness = Math.round(clamp(safeNum(trait?.closeness, 0) * 100, 0, 100));

    return localize(
      {
        ar: `${traitName} يدعم هذا المسار بنسبة توافق ${closeness}%`,
        he: `${traitName} תומך במסלול הזה עם התאמה של ${closeness}%`,
        en: `${traitName} supports this path with ${closeness}% alignment`,
      },
      language
    );
  });

  return [...subjectReasons, ...traitReasons].filter(Boolean);
}

function buildImprovementLines(recommendation, weakestAbilities, language) {
  const lowestSubject = weakestAbilities[0];
  const degreeName = recommendation?.name || recommendation?.name_en || recommendation?.name_ar || recommendation?.name_he;

  const items = [];

  if (lowestSubject) {
    items.push(
      localize(
        {
          ar: `تقوية ${lowestSubject.label} سترفع جاهزيتك لمسار ${degreeName}.`,
          he: `חיזוק ${lowestSubject.label} ישפר את המוכנות שלך למסלול ${degreeName}.`,
          en: `Improving ${lowestSubject.label} will strengthen your readiness for ${degreeName}.`,
        },
        language
      )
    );
  }

  items.push(
    localize(
      {
        ar: 'أكمل اختبارًا أعمق في المادة الأقرب لهذا التخصص.',
        he: 'השלימו מבחן עמוק יותר במקצוע הקרוב למסלול הזה.',
        en: 'Complete a deeper test in the subject closest to this degree.',
      },
      language
    )
  );

  return items;
}

function buildRoadmap(recommendation, gameHighlights, strongestAbilities, language) {
  const topGame = gameHighlights[0];
  const topAbility = strongestAbilities[0];

  const steps = [];

  if (topGame) {
    steps.push(
      localize(
        {
          ar: `ابدأ من ${topGame.title} لأنه يعكس ${topGame.focusArea}.`,
          he: `התחילו ב-${topGame.title} כי הוא משקף ${topGame.focusArea}.`,
          en: `Start with ${topGame.title} because it reflects ${topGame.focusArea}.`,
        },
        language
      )
    );
  }

  if (topAbility) {
    steps.push(
      localize(
        {
          ar: `ابنِ على قوتك في ${topAbility.label} من خلال أسئلة أعمق أو نشاط قصير.`,
          he: `בנו על החוזקה שלכם ב-${topAbility.label} דרך שאלות עמוקות יותר או משימה קצרה.`,
          en: `Build on your strength in ${topAbility.label} through a deeper quiz or short task.`,
        },
        language
      )
    );
  }

  steps.push(
    localize(
      {
        ar: `راجع شروط القبول والمسار الدراسي لتخصص ${recommendation?.name || recommendation?.name_he || recommendation?.name_ar || recommendation?.name_en}.`,
        he: `בדקו את תנאי הקבלה ואת מסלול הלימודים של ${recommendation?.name || recommendation?.name_he || recommendation?.name_ar || recommendation?.name_en}.`,
        en: `Review admission requirements and study path for ${recommendation?.name || recommendation?.name_he || recommendation?.name_ar || recommendation?.name_en}.`,
      },
      language
    )
  );

  steps.push(
    localize(
      {
        ar: 'احفظ هذا المسار في المفضلة ثم افتح التقرير الكامل للمقارنة مع الخيارين التاليين.',
        he: 'שמרו את המסלול הזה במועדפים ואז פתחו את הדוח המלא כדי להשוות עם שתי האפשרויות הבאות.',
        en: 'Save this path as a favorite, then open the full report to compare it with the next two options.',
      },
      language
    )
  );

  return steps;
}

function buildGameHighlight(session, language) {
  const learningHighlight = buildGameLearningHighlight(session, language);
  if (learningHighlight) return learningHighlight;

  const profile = gameProfileMap[session?.game_id];
  if (!profile) return null;

  const metrics = [
    safeNum(session?.engagement_score, NaN),
    safeNum(session?.interest_signal, NaN),
    safeNum(session?.trust_score, NaN),
    safeNum(session?.hebrew_score, NaN),
    safeNum(session?.medical_reasoning_score, NaN),
  ].filter(Number.isFinite);

  const averageScore = metrics.length
    ? Math.round(metrics.reduce((sum, value) => sum + value, 0) / metrics.length)
    : 0;

  return {
    gameId: session.game_id,
    title: localize(profile.title, language),
    focusArea: localize(profile.focusArea, language),
    score: averageScore,
    engagement: Math.round(clamp(safeNum(session?.engagement_score, 0), 0, 100)),
    interest: Math.round(clamp(safeNum(session?.interest_signal, 0), 0, 100)),
    skillTags: localize(profile.skillTags, language),
    nextStep: localize(profile.nextStep, language),
  };
}

function buildGameHighlightsByGame(sessions = [], language) {
  const grouped = new Map();
  sessions.forEach((session) => {
    if (!session?.game_id) return;
    grouped.set(session.game_id, [...(grouped.get(session.game_id) || []), session]);
  });

  return [...grouped.values()]
    .map((items) => buildGameLearningSummary(items, language) || buildGameHighlight(items[0], language))
    .filter(Boolean)
    .sort((left, right) => {
      const rightScore = safeNum(right.score, 0) + Math.min(safeNum(right.playCount, 1) - 1, 4);
      const leftScore = safeNum(left.score, 0) + Math.min(safeNum(left.playCount, 1) - 1, 4);
      return rightScore - leftScore;
    });
}

export async function getStudentJourneySnapshot(studentId, options = {}) {
  if (!studentId) {
    return { success: false, error: 'studentId is required' };
  }

  const language = normalizeLanguage(options.language);

  try {
    const [abilityRes, recommendationRes, gameSessions] = await Promise.all([
      getStudentAbilities(studentId),
      recommendTopDegrees(studentId, { language, limit: 3 }),
      getStudentGameSessions(studentId),
    ]);

    const abilities = abilityRes?.success ? abilityRes.abilities || [] : [];
    const recommendations = recommendationRes?.success ? recommendationRes.data || [] : [];
    const completedGames = (gameSessions || []).filter((session) => session.status === 'completed');

    const strongestAbilities = abilities
      .slice()
      .sort((left, right) => safeNum(right?.ability_score) - safeNum(left?.ability_score))
      .slice(0, 4)
      .map((ability, index) => ({
        subjectId: ability.subject_id,
        label: localizeSubjectName(ability, language, index),
        score: Math.round(clamp(safeNum(ability?.ability_score, 0), 0, 100)),
        accuracy: Math.round(clamp(safeNum(ability?.accuracy_rate, 0), 0, 100)),
      }));

    const weakestAbilities = abilities
      .slice()
      .sort((left, right) => safeNum(left?.ability_score) - safeNum(right?.ability_score))
      .slice(0, 3)
      .map((ability, index) => ({
        subjectId: ability.subject_id,
        label: localizeSubjectName(ability, language, index),
        score: Math.round(clamp(safeNum(ability?.ability_score, 0), 0, 100)),
      }));

    const gameHighlights = buildGameHighlightsByGame(completedGames, language);

    const enrichedRecommendations = recommendations
      .map((recommendation) => {
        const baseScorePercent =
          recommendation?.score_percent ??
          Math.round(clamp(safeNum(recommendation?.score, 0) * 100, 0, 100));
        const gameFitBoost = calculateGameDegreeFit(recommendation, gameHighlights);
        const scorePercent = Math.round(clamp(baseScorePercent + gameFitBoost, 0, 100));

        return {
          ...recommendation,
          baseScorePercent,
          gameFitBoost,
          scorePercent,
          score_percent: scorePercent,
          reasons: buildReasonLines(recommendation, language),
          improvementAreas: buildImprovementLines(recommendation, weakestAbilities, language),
        };
      })
      .sort((left, right) => safeNum(right.scorePercent) - safeNum(left.scorePercent));

    const topRecommendation = enrichedRecommendations[0] || null;

    return {
      success: true,
      data: {
        strongestAbilities,
        weakestAbilities,
        gameHighlights,
        recommendations: enrichedRecommendations,
        topRecommendation: topRecommendation
          ? {
              ...topRecommendation,
              roadmap: buildRoadmap(
                topRecommendation,
                gameHighlights,
                strongestAbilities,
                language
              ),
            }
          : null,
      },
    };
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to build student snapshot' };
  }
}

export default {
  getStudentJourneySnapshot,
};
