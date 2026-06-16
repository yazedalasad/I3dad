import { supabase } from '../config/supabase';

const MIN_SAMPLES_FOR_FULL_LEARNING = 8;
const INFORMATIVE_RATE_TARGET = 0.55;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Score how useful a question is for adaptive assessment (0-100).
 * Peaks when observed correct-rate is informative (~55%) and discrimination is high.
 */
export function computeSelectionPriority(question = {}) {
  const used = Math.max(0, Math.floor(safeNum(question.times_used, 0)));
  const correct = Math.max(0, Math.floor(safeNum(question.times_correct, 0)));
  const discrimination = Math.max(0.1, safeNum(question.discrimination, 1));
  const weight = Math.max(0.1, safeNum(question.weight, 1));

  if (used <= 0) {
    return clamp(48 + weight * 2 + discrimination * 2, 0, 100);
  }

  const observedRate = clamp(correct / used, 0, 1);
  const informativeness = clamp(1 - Math.abs(observedRate - INFORMATIVE_RATE_TARGET) / INFORMATIVE_RATE_TARGET, 0, 1);
  const sampleBlend = Math.min(1, used / MIN_SAMPLES_FOR_FULL_LEARNING);
  const discriminationFactor = clamp(discrimination / 1.8, 0.2, 1);
  const weightFactor = clamp(weight / 2, 0.5, 1.5);

  const learnedCore =
    20 +
    informativeness * 45 +
    discriminationFactor * 25 +
    (weightFactor - 0.5) * 10;

  return clamp(Math.round((1 - sampleBlend) * 50 + sampleBlend * learnedCore), 0, 100);
}

function nextAverageTime(previousAvg, previousCount, nextSeconds) {
  const seconds = Math.max(0, safeNum(nextSeconds, 0));
  if (previousCount <= 0) return Number(seconds.toFixed(2));
  const blended = (previousAvg * previousCount + seconds) / (previousCount + 1);
  return Number(blended.toFixed(2));
}

/**
 * Record one answer outcome and refresh learning fields on the question row.
 */
export async function recordQuestionOutcome({
  questionId,
  isCorrect = false,
  timeTakenSeconds = null,
} = {}) {
  if (!questionId) return { success: false, error: 'questionId is required' };

  try {
    const { data: question, error: readError } = await supabase
      .from('questions')
      .select('id, subject_id, times_used, times_correct, avg_time_seconds, discrimination, weight')
      .eq('id', questionId)
      .maybeSingle();

    if (readError) throw readError;
    if (!question) return { success: false, error: 'question not found' };

    const used = safeNum(question.times_used, 0) + 1;
    const correct = safeNum(question.times_correct, 0) + (isCorrect ? 1 : 0);
    const avgTime = Number.isFinite(safeNum(timeTakenSeconds, NaN))
      ? nextAverageTime(safeNum(question.avg_time_seconds, 0), safeNum(question.times_used, 0), timeTakenSeconds)
      : question.avg_time_seconds ?? null;

    const nextQuestion = {
      ...question,
      times_used: used,
      times_correct: correct,
      avg_time_seconds: avgTime,
    };
    const selection_priority = computeSelectionPriority(nextQuestion);

    const updatePayload = {
      times_used: used,
      times_correct: correct,
      avg_time_seconds: avgTime,
      selection_priority,
      updated_at: new Date().toISOString(),
    };

    let { error: updateError } = await supabase
      .from('questions')
      .update(updatePayload)
      .eq('id', questionId);

    if (updateError && /selection_priority|avg_time_seconds/i.test(updateError.message || '')) {
      const fallbackPayload = {
        times_used: used,
        times_correct: correct,
        updated_at: updatePayload.updated_at,
      };
      ({ error: updateError } = await supabase.from('questions').update(fallbackPayload).eq('id', questionId));
    }

    if (updateError) throw updateError;

    return {
      success: true,
      selection_priority,
      times_used: used,
      times_correct: correct,
      subject_id: question.subject_id,
    };
  } catch (error) {
    console.warn('recordQuestionOutcome failed:', error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Recompute selection_priority for all active questions in a subject.
 */
export async function refreshSubjectLearningPriorities(subjectId) {
  if (!subjectId) return { success: false, error: 'subjectId is required', updated: 0 };

  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, times_used, times_correct, discrimination, weight, selection_priority')
      .eq('subject_id', subjectId)
      .eq('is_active', true);

    if (error) throw error;

    let updated = 0;
    for (const question of questions || []) {
      const selection_priority = computeSelectionPriority(question);
      if (safeNum(question.selection_priority, 50) === selection_priority) continue;

      const { error: updateError } = await supabase
        .from('questions')
        .update({ selection_priority, updated_at: new Date().toISOString() })
        .eq('id', question.id);

      if (!updateError) updated += 1;
    }

    return { success: true, updated, total: (questions || []).length };
  } catch (error) {
    console.warn('refreshSubjectLearningPriorities failed:', error?.message || error);
    return { success: false, error: error?.message || String(error), updated: 0 };
  }
}

export async function refreshSubjectsLearningPriorities(subjectIds = []) {
  const uniqueIds = [...new Set((subjectIds || []).filter(Boolean))];
  const results = await Promise.all(uniqueIds.map((id) => refreshSubjectLearningPriorities(id)));
  return {
    success: results.every((row) => row.success),
    updated: results.reduce((sum, row) => sum + safeNum(row.updated, 0), 0),
    subjects: uniqueIds.length,
  };
}

export default {
  computeSelectionPriority,
  recordQuestionOutcome,
  refreshSubjectLearningPriorities,
  refreshSubjectsLearningPriorities,
};
