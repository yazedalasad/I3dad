export const GAME_LANGUAGES = {
  AR: 'ar',
  HE: 'he',
  EN: 'en',
};

export const GAME_DIRECTION = {
  LTR: 'ltr',
  RTL: 'rtl',
};

export const GAME_SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

export const GAME_ACTION_TYPES = {
  START: 'start',
  CHOICE: 'choice',
  SWIPE: 'swipe',
  ANSWER: 'answer',
  COMPLETE: 'complete',
  PAUSE: 'pause',
  RESUME: 'resume',
  VIEW: 'view',
  SKIP: 'skip',
  HINT: 'hint',
};

export const GAME_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

export const SUBJECT_CODES = {
  MATH: 'math',
  BIOLOGY: 'biology',
  CHEMISTRY: 'chemistry',
  PHYSICS: 'physics',
  COMPUTER_SCIENCE: 'computer_science',
  BUSINESS: 'business',
  LAW: 'law',
  PSYCHOLOGY: 'psychology',
  MEDICINE: 'medicine',
  ENGINEERING: 'engineering',
  DESIGN: 'design',
  EDUCATION: 'education',
};

export const SUPPORTED_SUBJECT_CODES = Object.values(SUBJECT_CODES);

export function createLocalizedText({ ar = '', he = '', en = '' } = {}) {
  return { ar, he, en };
}

export function createGameChoice({
  id,
  title,
  description = createLocalizedText(),
  subjectWeights = {},
  nextSceneId = null,
  isOptimal = false,
  metadata = {},
}) {
  return {
    id,
    title,
    description,
    subjectWeights,
    nextSceneId,
    isOptimal,
    metadata,
  };
}

export function createGameScene({
  id,
  title,
  body,
  image = null,
  choices = [],
  metadata = {},
}) {
  return {
    id,
    title,
    body,
    image,
    choices,
    metadata,
  };
}

export function createGameLevel({
  id,
  gameId,
  title,
  difficulty = GAME_DIFFICULTY.BEGINNER,
  estimatedMinutes = 5,
  scenes = [],
  metadata = {},
}) {
  return {
    id,
    gameId,
    title,
    difficulty,
    estimatedMinutes,
    scenes,
    metadata,
  };
}

export function createSubjectScoreMap() {
  return {
    math: 0,
    biology: 0,
    chemistry: 0,
    physics: 0,
    computer_science: 0,
    business: 0,
    law: 0,
    psychology: 0,
    medicine: 0,
    engineering: 0,
    design: 0,
    education: 0,
  };
}
