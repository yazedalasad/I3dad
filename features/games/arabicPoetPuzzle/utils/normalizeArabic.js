export function normalizeArabic(value = '') {
  return String(value)
    .trim()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function normalizeArabicLoose(value = '') {
  return normalizeArabic(value).replace(/\s+/g, '');
}

export function answersMatch(userAnswer = '', correctAnswer = '') {
  return normalizeArabicLoose(userAnswer) === normalizeArabicLoose(correctAnswer);
}
