import { GAME_LANGUAGES } from '../types/gameSchemas';

export const DEFAULT_GAME_LANGUAGE = GAME_LANGUAGES.HE;

export const SUPPORTED_GAME_LANGUAGES = [GAME_LANGUAGES.AR, GAME_LANGUAGES.HE, GAME_LANGUAGES.EN];

export const DEFAULT_TIMER_INTERVAL = 1000;

export const GAME_SCORE_LIMITS = {
  MIN: 0,
  MAX: 100,
};

export const GAME_DOMAIN_KEYS = {
  INTEREST: 'interest',
  ABILITY: 'ability',
  ENGAGEMENT: 'engagement',
};

export const STORAGE_KEYS = {
  GAME_LANGUAGE: 'game_language',
};

export const GAME_UI = {
  CARD_RADIUS: 20,
  BUTTON_RADIUS: 14,
  SCREEN_PADDING: 16,
  HEADER_GAP: 12,
};

export const FEEDBACK_LABELS = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'neutral',
};

export const DEFAULT_GAME_METRICS = {
  engagementScore: 0,
  trustScore: 0,
  interestSignal: 0,
};

export const SWIPE_DIRECTIONS = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
};
