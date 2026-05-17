import { supabase } from '../../config/supabase';

const RECENT_LIMIT = 80;

function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLang(language) {
  const value = String(language || 'ar').toLowerCase();
  return value.startsWith('he') ? 'he' : 'ar';
}

function shuffle(items = []) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function pickRandomCandidate(candidates = [], difficultyTarget = null) {
  if (!candidates.length) return null;
  const target = safeNum(difficultyTarget, NaN);
  if (!Number.isFinite(target)) return shuffle(candidates)[0];

  const sorted = shuffle(candidates).sort((left, right) => {
    const leftDistance = Math.abs(safeNum(left.difficulty, 0) - target);
    const rightDistance = Math.abs(safeNum(right.difficulty, 0) - target);
    return leftDistance - rightDistance;
  });

  const bestDistance = Math.abs(safeNum(sorted[0].difficulty, 0) - target);
  const nearBest = sorted.filter((question) => Math.abs(safeNum(question.difficulty, 0) - target) <= bestDistance + 0.35);
  return shuffle(nearBest)[0] || sorted[0];
}

export async function getCurrentSessionQuestionIds(sessionId) {
  if (!sessionId) return [];
  const [responses, subjects] = await Promise.all([
    supabase.from('student_responses').select('question_id').eq('session_id', sessionId),
    supabase.from('test_session_subjects').select('metadata').eq('session_id', sessionId),
  ]);

  const ids = new Set();
  if (!responses.error) {
    (responses.data || []).forEach((row) => {
      if (row.question_id) ids.add(row.question_id);
    });
  }
  if (!subjects.error) {
    (subjects.data || []).forEach((row) => {
      (row.metadata?.usedQuestionIds || []).forEach((id) => ids.add(id));
    });
  }
  return [...ids];
}

export async function getRecentlyAnsweredQuestionIds(studentId, subjectId) {
  if (!studentId || !subjectId) return [];
  const { data, error } = await supabase
    .from('student_responses')
    .select('question_id, questions(subject_id)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) return [];
  return (data || [])
    .filter((row) => !subjectId || row.questions?.subject_id === subjectId)
    .map((row) => row.question_id)
    .filter(Boolean);
}

async function loadCandidates({ subjectId, language, difficultyTarget }) {
  const lang = normalizeLang(language);
  let query = supabase
    .from('questions')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .limit(300);
  query = query.or(`target_language.eq.${lang},target_language.eq.both`);
  const { data, error } = await query;
  if (error) throw error;

  const target = safeNum(difficultyTarget, NaN);
  if (!Number.isFinite(target)) return data || [];

  const candidates = (data || []).filter((question) => Math.abs(safeNum(question.difficulty, 0) - target) <= 1.25);
  return candidates.length ? candidates : data || [];
}

export async function getNextDiverseQuestion({
  studentId,
  sessionId,
  subjectId,
  difficultyTarget,
  language = 'ar',
  usedQuestionIds = [],
  candidates = null,
}) {
  if (!subjectId) throw new Error('subjectId is required');

  const [currentIds, recentIds, loadedCandidates] = await Promise.all([
    getCurrentSessionQuestionIds(sessionId),
    getRecentlyAnsweredQuestionIds(studentId, subjectId),
    candidates ? Promise.resolve(candidates) : loadCandidates({ subjectId, language, difficultyTarget }),
  ]);

  const current = new Set([...(usedQuestionIds || []), ...currentIds].filter(Boolean));
  const recent = new Set(recentIds.filter(Boolean));
  const activeCandidates = loadedCandidates || [];

  let available = activeCandidates.filter((question) => !current.has(question.id));
  const withoutRecent = available.filter((question) => !recent.has(question.id));
  if (withoutRecent.length >= 3) available = withoutRecent;

  if (!available.length) {
    available = activeCandidates.filter((question) => !current.has(question.id));
  }
  if (!available.length) {
    available = activeCandidates;
  }

  const question = pickRandomCandidate(available, difficultyTarget);
  return {
    question,
    selectionMeta: {
      currentSessionExcluded: current.size,
      recentExcluded: recent.size,
      candidateCount: activeCandidates.length,
      usedRecentFilter: withoutRecent.length >= 3,
      selectedQuestionId: question?.id || null,
    },
  };
}

export default {
  getNextDiverseQuestion,
  getRecentlyAnsweredQuestionIds,
  getCurrentSessionQuestionIds,
  pickRandomCandidate,
};
