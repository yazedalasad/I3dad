export function normalizeAnswerLetter(value) {
  const letter = String(value || '').trim().toUpperCase();
  return ['A', 'B', 'C', 'D'].includes(letter) ? letter : '';
}

function pickLocalizedText(question, lang) {
  const isArabic = !String(lang || '').toLowerCase().startsWith('he');
  const pick = (ar, he) => {
    if (isArabic) return ar ?? he ?? '';
    return he ?? ar ?? '';
  };

  return {
    A: pick(question?.option_a_ar, question?.option_a_he),
    B: pick(question?.option_b_ar, question?.option_b_he),
    C: pick(question?.option_c_ar, question?.option_c_he),
    D: pick(question?.option_d_ar, question?.option_d_he),
  };
}

export function resolveCorrectAnswerLetter(question, lang = 'ar') {
  const direct = normalizeAnswerLetter(question?.correct_answer);
  if (direct) return direct;

  const raw = String(question?.correct_answer || '').trim();
  if (!raw) return '';

  const options = pickLocalizedText(question, lang);
  const match = Object.entries(options).find(
    ([, text]) => String(text || '').trim() === raw
  );
  return match ? match[0] : '';
}

export function isAdaptiveAnswerCorrect(question, selectedAnswer, lang = 'ar') {
  const correct = resolveCorrectAnswerLetter(question, lang);
  const picked = normalizeAnswerLetter(selectedAnswer);
  if (!correct || !picked) return false;
  return correct === picked;
}
