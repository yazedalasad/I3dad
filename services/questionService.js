/**
 * QUESTION SERVICE - Total Exam Ready
 *
 * Adds:
 *  - getNextQuestionForSubject() with exclusions (no repeats)
 *  - consistent language filtering (ar/he/both)
 *  - better cache behavior for sessions
 */

import { supabase } from '../config/supabase';

// In-memory cache for questions (per app runtime)
let questionCache = {
  bySubject: {}, // { [subjectId]: { items: Question[], lastUpdated: number } }
  byId: {},
};

/** Cache TTL */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function nowMs() {
  return Date.now();
}

function isCacheValid(lastUpdated) {
  return lastUpdated && (nowMs() - lastUpdated) < CACHE_TTL_MS;
}

/** Normalize language input */
function normalizeLanguage(language) {
  const lang = (language || 'both').toLowerCase();
  if (lang === 'ar' || lang === 'he') return lang;
  return 'both';
}

/** Filter by language and difficulty */
function filterQuestions(questions, { language, minDifficulty, maxDifficulty }) {
  const lang = normalizeLanguage(language);

  return questions.filter((q) => {
    // Language filter
    // DB: target_language in ('ar','he','both')
    if (lang !== 'both' && q.target_language !== 'both' && q.target_language !== lang) {
      return false;
    }

    // Difficulty filter
    const d = Number(q.difficulty);
    if (Number.isFinite(minDifficulty) && d < minDifficulty) return false;
    if (Number.isFinite(maxDifficulty) && d > maxDifficulty) return false;

    return true;
  });
}

/**
 * Get all subjects
 */
export async function getAllSubjects() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name_en', { ascending: true });

    if (error) throw error;

    return { success: true, subjects: data };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get subject by ID
 */
export async function getSubjectById(subjectId) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (error) throw error;

    return { success: true, subject: data };
  } catch (error) {
    console.error('Error fetching subject:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get questions for a subject (cached)
 *
 * options:
 *  - language: 'ar'|'he'|'both'
 *  - minDifficulty, maxDifficulty
 *  - limit
 *  - useCache
 */
export async function getQuestionsBySubject(subjectId, options = {}) {
  try {
    const {
      language = 'both',
      minDifficulty = -3,
      maxDifficulty = 3,
      limit = null,
      useCache = true,
      poolLimit = 80, // pull at most 80 into cache per subject to stay light
    } = options;

    // Cache check
    const cachedEntry = questionCache.bySubject[subjectId];
    if (useCache && cachedEntry?.items && isCacheValid(cachedEntry.lastUpdated)) {
      const filtered = filterQuestions(cachedEntry.items, { language, minDifficulty, maxDifficulty });
      return {
        success: true,
        questions: limit ? filtered.slice(0, limit) : filtered,
        fromCache: true,
      };
    }

    // Fetch fresh pool from DB
    let query = supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .limit(poolLimit);

    // Apply language at DB level (helps reduce payload)
    const lang = normalizeLanguage(language);
    if (lang !== 'both') {
      query = query.or(`target_language.eq.${lang},target_language.eq.both`);
    }

    // Apply difficulty bounds at DB level too
    query = query.gte('difficulty', minDifficulty).lte('difficulty', maxDifficulty);

    const { data, error } = await query;
    if (error) throw error;

    // Update caches
    questionCache.bySubject[subjectId] = { items: data || [], lastUpdated: nowMs() };
    (data || []).forEach((q) => {
      questionCache.byId[q.id] = q;
    });

    return {
      success: true,
      questions: limit ? (data || []).slice(0, limit) : (data || []),
      fromCache: false,
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get question by ID (cached)
 */
export async function getQuestionById(questionId) {
  try {
    if (questionCache.byId[questionId]) {
      return { success: true, question: questionCache.byId[questionId], fromCache: true };
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) throw error;

    questionCache.byId[questionId] = data;
    return { success: true, question: data, fromCache: false };
  } catch (error) {
    console.error('Error fetching question:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TOTAL EXAM helper:
 * Get next question for a subject with exclusion list.
 *
 * @param {Object} args
 *  - subjectId: string
 *  - language: 'ar'|'he'
 *  - excludeQuestionIds: string[]
 *  - minDifficulty, maxDifficulty
 *  - strategy: 'random' | 'closest_to_target'
 *  - targetDifficulty: number (for closest_to_target)
 */
export async function getNextQuestionForSubject(args) {
  const {
    subjectId,
    language = 'ar',
    excludeQuestionIds = [],
    minDifficulty = -3,
    maxDifficulty = 3,
    strategy = 'random',
    targetDifficulty = 0,
  } = args || {};

  if (!subjectId) return { success: false, error: 'MISSING_SUBJECT_ID' };

  // Fetch a pool (cached), then select locally. This avoids expensive NOT IN queries.
  const poolRes = await getQuestionsBySubject(subjectId, {
    language,
    minDifficulty,
    maxDifficulty,
    limit: null,
    useCache: true,
    poolLimit: 80,
  });

  if (!poolRes.success) return poolRes;

  const excluded = new Set(excludeQuestionIds || []);
  const available = (poolRes.questions || []).filter((q) => !excluded.has(q.id));

  if (available.length === 0) {
    // Try bypass cache once (fresh pull) in case cache was too small/old
    const freshRes = await getQuestionsBySubject(subjectId, {
      language,
      minDifficulty,
      maxDifficulty,
      limit: null,
      useCache: false,
      poolLimit: 150,
    });
    if (!freshRes.success) return freshRes;

    const availableFresh = (freshRes.questions || []).filter((q) => !excluded.has(q.id));
    if (availableFresh.length === 0) return { success: false, error: 'NO_UNUSED_QUESTIONS_FOUND' };

    return { success: true, question: pickQuestion(availableFresh, strategy, targetDifficulty) };
  }

  return { success: true, question: pickQuestion(available, strategy, targetDifficulty) };
}

function pickQuestion(list, strategy, targetDifficulty) {
  if (!list.length) return null;

  if (strategy === 'closest_to_target') {
    let best = list[0];
    let bestDist = Math.abs(Number(best.difficulty) - targetDifficulty);
    for (let i = 1; i < list.length; i++) {
      const d = Math.abs(Number(list[i].difficulty) - targetDifficulty);
      if (d < bestDist) {
        best = list[i];
        bestDist = d;
      }
    }
    return best;
  }

  // default random
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Update question usage statistics
 */
export async function updateQuestionStats(questionId, wasCorrect) {
  try {
    const { data: question } = await supabase
      .from('questions')
      .select('times_used, times_correct')
      .eq('id', questionId)
      .single();

    if (!question) return { success: false };

    const { error } = await supabase
      .from('questions')
      .update({
        times_used: (question.times_used || 0) + 1,
        times_correct: (question.times_correct || 0) + (wasCorrect ? 1 : 0),
      })
      .eq('id', questionId);

    if (error) throw error;

    // Invalidate this question only
    delete questionCache.byId[questionId];

    return { success: true };
  } catch (error) {
    console.error('Error updating question stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Diverse questions (2 per subject) - keep existing behavior
 */
export async function getDiverseQuestions(language = 'ar') {
  try {
    const lang = normalizeLanguage(language);

    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .eq('is_active', true);

    if (subjectsError) throw subjectsError;

    const allQuestions = [];

    for (const subject of subjects) {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .gte('difficulty', -1)
        .lte('difficulty', 1)
        .limit(2);

      if (lang !== 'both') {
        query = query.or(`target_language.eq.${lang},target_language.eq.both`);
      }

      const { data: questions, error: questionsError } = await query;
      if (questionsError) throw questionsError;

      allQuestions.push(...(questions || []));
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return { success: true, questions: shuffled };
  } catch (error) {
    console.error('Error fetching diverse questions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all caches
 */
export function clearQuestionCache() {
  questionCache = { bySubject: {}, byId: {} };
}

/**
 * Preload (force refresh)
 */
export async function preloadQuestions(subjectId) {
  return await getQuestionsBySubject(subjectId, { useCache: false });
}
