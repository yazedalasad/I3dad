import { useMemo, useState } from 'react';
import { DEFAULT_GAME_LANGUAGE } from '../utils/gameConstants';
import { getDirection, getLocalizedText, isRTL } from '../utils/gameLanguage';

export function useGameLanguage(initialLanguage = DEFAULT_GAME_LANGUAGE) {
  const [language, setLanguage] = useState(initialLanguage);

  const direction = useMemo(() => getDirection(language), [language]);
  const rtl = useMemo(() => isRTL(language), [language]);

  function t(value) {
    return getLocalizedText(value, language);
  }

  return {
    language,
    setLanguage,
    direction,
    isRTL: rtl,
    t,
  };
}
