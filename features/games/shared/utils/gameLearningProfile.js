function safeNum(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

export function localizeGameText(copy, language) {
  const normalized = normalizeLanguage(language);
  return copy?.[normalized] || copy?.en || copy?.ar || copy?.he || '';
}

export const gameLearningProfiles = {
  doctor_soroka: {
    title: {
      ar: 'الطبيب في سوروكا',
      he: 'רופא בסורוקה',
      en: 'Doctor at Soroka',
    },
    topics: {
      ar: ['تشخيص طبي', 'أحياء', 'قراءة معطيات طبية', 'اتخاذ قرار'],
      he: ['אבחון רפואי', 'ביולוגיה', 'קריאת נתונים רפואיים', 'קבלת החלטות'],
      en: ['Medical diagnosis', 'Biology', 'Clinical data reading', 'Decision making'],
    },
    abilities: ['medical', 'biology', 'logic', 'focus', 'hebrew'],
    subjectWeights: { medicine: 5, biology: 3, psychology: 1, chemistry: 1 },
    skillBoosts: { medical: 16, hebrew: 10, logic: 8, focus: 7, scientific: 6 },
    focusArea: {
      ar: 'ميل طبي وتشخيصي',
      he: 'נטייה רפואית ואבחונית',
      en: 'Medical and diagnostic interest',
    },
    suggestedMajors: {
      ar: ['طب', 'تمريض', 'علوم طبية', 'أحياء'],
      he: ['רפואה', 'סיעוד', 'מדעי הרפואה', 'ביולוגיה'],
      en: ['Medicine', 'Nursing', 'Medical sciences', 'Biology'],
    },
    nextStep: {
      ar: 'أكمل نشاط أحياء أو تحليل حالة طبية قصيرة لتأكيد الميل الطبي.',
      he: 'השלימו פעילות ביולוגיה או ניתוח מקרה קצר כדי לאמת נטייה רפואית.',
      en: 'Complete a biology task or short case analysis to validate the medical path.',
    },
  },
  physics_lab: {
    title: {
      ar: 'مختبر الفيزياء',
      he: 'מעבדת פיזיקה',
      en: 'Physics Lab',
    },
    topics: {
      ar: ['سرعة', 'قوة واحتكاك', 'تسارع', 'نمذجة علمية'],
      he: ['מהירות', 'כוח וחיכוך', 'תאוצה', 'מודל מדעי'],
      en: ['Speed', 'Force and friction', 'Acceleration', 'Scientific modeling'],
    },
    abilities: ['scientific', 'problem_solving', 'logic', 'math', 'speed'],
    subjectWeights: { physics: 5, engineering: 3, math: 2 },
    skillBoosts: { scientific: 15, problem_solving: 13, logic: 9, speed: 6, math: 5 },
    focusArea: {
      ar: 'ميل هندسي وفيزيائي',
      he: 'נטייה הנדסית ופיזיקלית',
      en: 'Engineering and physics interest',
    },
    suggestedMajors: {
      ar: ['هندسة', 'فيزياء', 'هندسة ميكانيكية', 'علوم حاسوب'],
      he: ['הנדסה', 'פיזיקה', 'הנדסת מכונות', 'מדעי המחשב'],
      en: ['Engineering', 'Physics', 'Mechanical engineering', 'Computer science'],
    },
    nextStep: {
      ar: 'انتقل إلى مهمة فيزياء أعمق أو نشاط هندسي قصير.',
      he: 'המשיכו למשימת פיזיקה עמוקה יותר או פעילות הנדסית קצרה.',
      en: 'Move to a deeper physics task or a short engineering activity.',
    },
  },
  physics_bridge: {
    title: {
      ar: 'الجسر الفيزيائي',
      he: 'גשר פיזיקלי',
      en: 'Physics Bridge',
    },
    topics: {
      ar: ['ثبات الجسور', 'مثلثات ودعامات', 'ميزانية', 'تخطيط هندسي'],
      he: ['יציבות גשרים', 'משולשים ותמיכות', 'תקציב', 'תכנון הנדסי'],
      en: ['Bridge stability', 'Triangles and supports', 'Budgeting', 'Engineering planning'],
    },
    abilities: ['engineering', 'problem_solving', 'logic', 'spatial', 'planning'],
    subjectWeights: { engineering: 5, physics: 3, math: 2, design: 1 },
    skillBoosts: { problem_solving: 15, scientific: 10, logic: 10, focus: 6, math: 5 },
    focusArea: {
      ar: 'ميل للهندسة والتصميم البنيوي',
      he: 'נטייה להנדסה ותכנון מבנים',
      en: 'Structural engineering and design interest',
    },
    suggestedMajors: {
      ar: ['هندسة مدنية', 'هندسة معمارية', 'هندسة ميكانيكية', 'تصميم صناعي'],
      he: ['הנדסה אזרחית', 'אדריכלות', 'הנדסת מכונות', 'עיצוב תעשייתי'],
      en: ['Civil engineering', 'Architecture', 'Mechanical engineering', 'Industrial design'],
    },
    nextStep: {
      ar: 'جرّب مسألة هندسية أو تصميم نموذج جسر أصعب لمعرفة قوة التخطيط.',
      he: 'נסו בעיה הנדסית או דגם גשר קשה יותר כדי לבדוק יכולת תכנון.',
      en: 'Try a harder bridge model or engineering problem to test planning strength.',
    },
  },
  arabic_poet_puzzle: {
    title: {
      ar: 'كنوز الألفاظ',
      he: 'אוצר המילים',
      en: 'Word Treasures',
    },
    topics: {
      ar: ['مفردات عربية', 'معنى شعري', 'ذاكرة', 'فهم دلالي'],
      he: ['אוצר מילים בערבית', 'משמעות שירית', 'זיכרון', 'הבנה סמנטית'],
      en: ['Arabic vocabulary', 'Poetic meaning', 'Memory', 'Semantic understanding'],
    },
    abilities: ['arabic', 'memory', 'focus', 'language_reasoning'],
    subjectWeights: { arabic: 5, arabic_language: 5, literature: 4, education: 1 },
    skillBoosts: { arabic: 16, memory: 12, focus: 8, speed: 4 },
    focusArea: {
      ar: 'قوة لغوية وأدبية',
      he: 'חוזק שפתי וספרותי',
      en: 'Language and literature strength',
    },
    suggestedMajors: {
      ar: ['لغة عربية', 'تربية', 'إعلام', 'ترجمة'],
      he: ['ערבית', 'חינוך', 'תקשורת', 'תרגום'],
      en: ['Arabic language', 'Education', 'Media', 'Translation'],
    },
    nextStep: {
      ar: 'أضف نشاط قراءة أو كتابة قصيرة لتأكيد القوة اللغوية.',
      he: 'הוסיפו פעילות קריאה או כתיבה קצרה כדי לאמת חוזק שפתי.',
      en: 'Add a short reading or writing task to validate language strength.',
    },
  },
};

export function getGameLearningProfile(gameId) {
  return gameLearningProfiles[gameId] || null;
}

export function buildGameTopicSignals({ gameId, language, ability = 0, interest = 0, engagement = 0 }) {
  const profile = getGameLearningProfile(gameId);
  const topics = localizeGameText(profile?.topics, language);
  const subjectWeights = profile?.subjectWeights || {};
  const subjectEntries = Object.entries(subjectWeights).sort((a, b) => safeNum(b[1]) - safeNum(a[1]));

  return (Array.isArray(topics) ? topics : []).map((topic, index) => {
    const [, rawWeight = 1] = subjectEntries[index] || subjectEntries[subjectEntries.length - 1] || [];
    const topicWeight = clamp(safeNum(rawWeight, 1) * 12, 25, 100);
    const score = Math.round(
      clamp(ability * 0.45 + interest * 0.3 + engagement * 0.15 + topicWeight * 0.1)
    );

    return {
      topic,
      score,
      weight: topicWeight,
    };
  });
}

export function buildGameLearningHighlight(session, language) {
  const profile = getGameLearningProfile(session?.game_id);
  if (!profile) return null;

  const understanding = Math.round(
    clamp(
      safeNum(session?.trust_score, 0) * 0.45 +
        safeNum(session?.medical_reasoning_score, 0) * 0.25 +
        safeNum(session?.hebrew_score, 0) * 0.15 +
        safeNum(session?.engagement_score, 0) * 0.15
    )
  );
  const interest = Math.round(
    clamp(safeNum(session?.interest_signal, 0) * 0.6 + safeNum(session?.engagement_score, 0) * 0.4)
  );
  const ability = Math.round(clamp(understanding * 0.65 + interest * 0.35));
  const engagement = Math.round(clamp(safeNum(session?.engagement_score, 0)));
  const topicSignals = buildGameTopicSignals({
    gameId: session.game_id,
    language,
    ability,
    interest,
    engagement,
  });

  return {
    gameId: session.game_id,
    levelId: session.level_id,
    title: localizeGameText(profile.title, language),
    topics: localizeGameText(profile.topics, language),
    abilities: profile.abilities,
    focusArea: localizeGameText(profile.focusArea, language),
    suggestedMajors: localizeGameText(profile.suggestedMajors, language),
    nextStep: localizeGameText(profile.nextStep, language),
    score: ability,
    understanding,
    interest,
    ability,
    engagement,
    topicSignals,
    skillTags: localizeGameText(profile.topics, language),
  };
}

export function buildGameLearningSummary(sessions = [], language) {
  const highlights = sessions.map((session) => buildGameLearningHighlight(session, language)).filter(Boolean);
  if (!highlights.length) return null;

  const first = highlights[0];
  const playCount = highlights.length;
  const totalPlayTimeSeconds = sessions.reduce((sum, session) => {
    const started = session?.created_at ? new Date(session.created_at).getTime() : NaN;
    const ended = session?.ended_at ? new Date(session.ended_at).getTime() : NaN;
    const durationFromDates =
      Number.isFinite(started) && Number.isFinite(ended) && ended > started
        ? Math.round((ended - started) / 1000)
        : 0;
    return sum + Math.max(durationFromDates, safeNum(session?.total_time_seconds, 0));
  }, 0);
  const completedLevelIds = [...new Set(sessions.map((session) => session?.level_id).filter(Boolean))];
  const average = (field) =>
    Math.round(highlights.reduce((sum, item) => sum + safeNum(item?.[field], 0), 0) / playCount);
  const topicScores = new Map();

  highlights.forEach((highlight) => {
    (highlight.topicSignals || []).forEach((signal) => {
      const current = topicScores.get(signal.topic) || { topic: signal.topic, score: 0, weight: 0, count: 0 };
      topicScores.set(signal.topic, {
        topic: signal.topic,
        score: current.score + safeNum(signal.score, 0),
        weight: current.weight + safeNum(signal.weight, 0),
        count: current.count + 1,
      });
    });
  });

  const topicSignals = [...topicScores.values()]
    .map((signal) => ({
      topic: signal.topic,
      score: Math.round(signal.score / Math.max(1, signal.count)),
      weight: Math.round(signal.weight / Math.max(1, signal.count)),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    ...first,
    score: average('score'),
    understanding: average('understanding'),
    interest: average('interest'),
    ability: average('ability'),
    engagement: average('engagement'),
    playCount,
    totalPlayTimeSeconds,
    totalPlayMinutes: Math.round(totalPlayTimeSeconds / 60),
    completedLevelsCount: completedLevelIds.length,
    completedLevelIds,
    lastPlayedAt: sessions
      .map((session) => session?.ended_at || session?.created_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    topicSignals,
  };
}

export function getGameSkillBoosts(gameId) {
  return getGameLearningProfile(gameId)?.skillBoosts || {};
}
