function stripArabicDiacritics(value = '') {
  return String(value).replace(/[\u064B-\u0652\u0670\u0640]/g, '');
}

export function normalizeArabic(value = '') {
  return stripArabicDiacritics(value)
    .trim()
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A');
}

export function normalizeArabicLoose(value = '') {
  return normalizeArabic(value).replace(/\s+/g, '');
}

export function answersMatch(userAnswer = '', correctAnswer = '') {
  return normalizeArabicLoose(userAnswer) === normalizeArabicLoose(correctAnswer);
}

export function answersMatchReversed(userAnswer = '', correctAnswer = '') {
  const normalizedUserAnswer = normalizeArabicLoose(userAnswer);
  const normalizedCorrectAnswer = normalizeArabicLoose(correctAnswer);

  if (!normalizedUserAnswer || !normalizedCorrectAnswer) return false;

  return Array.from(normalizedUserAnswer).reverse().join('') === normalizedCorrectAnswer;
}
