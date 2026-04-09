import { DEFAULT_GAME_LANGUAGE, SUPPORTED_GAME_LANGUAGES } from './gameConstants';
import { GAME_DIRECTION } from '../types/gameSchemas';

export function isSupportedLanguage(language) {
  return SUPPORTED_GAME_LANGUAGES.includes(language);
}

export function resolveLanguage(language) {
  return isSupportedLanguage(language) ? language : DEFAULT_GAME_LANGUAGE;
}

export function getLocalizedText(value, language = DEFAULT_GAME_LANGUAGE) {
  if (!value) return '';

  if (typeof value === 'string') return value;

  const safeLanguage = resolveLanguage(language);

  return value[safeLanguage] || value.he || value.ar || value.en || '';
}

export function isRTL(language) {
  return language === 'ar' || language === 'he';
}

export function getDirection(language) {
  return isRTL(language) ? GAME_DIRECTION.RTL : GAME_DIRECTION.LTR;
}

export function getTextAlign(language) {
  return isRTL(language) ? 'right' : 'left';
}

export function getFlexDirection(language) {
  return isRTL(language) ? 'row-reverse' : 'row';
}

export function localizeArray(items = [], language = DEFAULT_GAME_LANGUAGE, mapper = (item) => item) {
  return items.map((item) => mapper(item, language));
}
