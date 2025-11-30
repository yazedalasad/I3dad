/**
 * QUESTION SERVICE - Question Management
 * 
 * Handles fetching, caching, and managing questions from the database
 */

import { supabase } from '../config/supabase';

// In-memory cache for questions
let questionCache = {
  bySubject: {},
  byId: {},
  lastUpdated: null
};

/**
 * Get all subjects
 * 
 * @returns {Array} List of subjects
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

    return {
      success: true,
      subjects: data
    };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get subject by ID
 * 
 * @param {string} subjectId - Subject ID
 * @returns {Object} Subject data
 */
export async function getSubjectById(subjectId) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (error) throw error;

    return {
      success: true,
      subject: data
    };
  } catch (error) {
    console.error('Error fetching subject:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get questions for a subject
 * 
 * @param {string} subjectId - Subject ID
 * @param {Object} options - Query options
 * @returns {Array} Questions
 */
export async function getQuestionsBySubject(subjectId, options = {}) {
  try {
    const {
      language = 'both',
      minDifficulty = -3,
      maxDifficulty = 3,
      limit = null,
      useCache = true
    } = options;

    // Check cache
    if (useCache && questionCache.bySubject[subjectId]) {
      const cached = questionCache.bySubject[subjectId];
      const cacheAge = Date.now() - (questionCache.lastUpdated || 0);
      
      // Cache valid for 5 minutes
      if (cacheAge < 5 * 60 * 1000) {
        return {
          success: true,
          questions: filterQuestions(cached, { language, minDifficulty, maxDifficulty, limit }),
          fromCache: true
        };
      }
    }

    // Fetch from database
    let query = supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .gte('difficulty', minDifficulty)
      .lte('difficulty', maxDifficulty);

    if (language !== 'both') {
      query = query.or(`target_language.eq.${language},target_language.eq.both`);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Update cache
    questionCache.bySubject[subjectId] = data;
    questionCache.lastUpdated = Date.now();

    // Cache by ID as well
    data.forEach(q => {
      questionCache.byId[q.id] = q;
    });

    return {
      success: true,
      questions: data,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get question by ID
 * 
 * @param {string} questionId - Question ID
 * @returns {Object} Question data
 */
export async function getQuestionById(questionId) {
  try {
    // Check cache
    if (questionCache.byId[questionId]) {
      return {
        success: true,
        question: questionCache.byId[questionId],
        fromCache: true
      };
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) throw error;

    // Update cache
    questionCache.byId[questionId] = data;

    return {
      success: true,
      question: data,
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching question:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get diverse questions for interest discovery
 * 2 questions from each subject
 * 
 * @param {string} language - Language preference
 * @returns {Array} Diverse questions
 */
export async function getDiverseQuestions(language = 'ar') {
  try {
    // Get all subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .eq('is_active', true);

    if (subjectsError) throw subjectsError;

    const allQuestions = [];

    // Get 2 questions from each subject
    for (const subject of subjects) {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subject.id)
        .eq('is_active', true)
        .or(`target_language.eq.${language},target_language.eq.both`)
        .gte('difficulty', -1)
        .lte('difficulty', 1)
        .limit(2);

      if (questionsError) throw questionsError;

      allQuestions.push(...questions);
    }

    // Shuffle questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);

    return {
      success: true,
      questions: shuffled
    };
  } catch (error) {
    console.error('Error fetching diverse questions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update question usage statistics
 * 
 * @param {string} questionId - Question ID
 * @param {boolean} wasCorrect - Whether answer was correct
 * @returns {Object} Result
 */
export async function updateQuestionStats(questionId, wasCorrect) {
  try {
    // Get current stats
    const { data: question } = await supabase
      .from('questions')
      .select('times_used, times_correct')
      .eq('id', questionId)
      .single();

    if (!question) return { success: false };

    // Update stats
    const { error } = await supabase
      .from('questions')
      .update({
        times_used: (question.times_used || 0) + 1,
        times_correct: (question.times_correct || 0) + (wasCorrect ? 1 : 0)
      })
      .eq('id', questionId);

    if (error) throw error;

    // Invalidate cache for this question
    delete questionCache.byId[questionId];

    return { success: true };
  } catch (error) {
    console.error('Error updating question stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Filter questions based on criteria
 * 
 * @param {Array} questions - Questions to filter
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered questions
 */
function filterQuestions(questions, criteria) {
  const { language, minDifficulty, maxDifficulty, limit } = criteria;

  let filtered = questions.filter(q => {
    // Language filter
    if (language !== 'both' && q.target_language !== 'both' && q.target_language !== language) {
      return false;
    }

    // Difficulty filter
    if (q.difficulty < minDifficulty || q.difficulty > maxDifficulty) {
      return false;
    }

    return true;
  });

  // Apply limit
  if (limit && filtered.length > limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Clear question cache
 */
export function clearQuestionCache() {
  questionCache = {
    bySubject: {},
    byId: {},
    lastUpdated: null
  };
}

/**
 * Preload questions for a subject (for better performance)
 * 
 * @param {string} subjectId - Subject ID
 * @returns {Object} Result
 */
export async function preloadQuestions(subjectId) {
  return await getQuestionsBySubject(subjectId, { useCache: false });
}

/**
 * Get question statistics
 * 
 * @param {string} subjectId - Subject ID (optional)
 * @returns {Object} Statistics
 */
export async function getQuestionStatistics(subjectId = null) {
  try {
    let query = supabase
      .from('questions')
      .select('difficulty, discrimination, times_used, times_correct, subject_id');

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats = {
      totalQuestions: data.length,
      avgDifficulty: data.reduce((sum, q) => sum + q.difficulty, 0) / data.length,
      avgDiscrimination: data.reduce((sum, q) => sum + q.discrimination, 0) / data.length,
      totalUsage: data.reduce((sum, q) => sum + (q.times_used || 0), 0),
      avgAccuracy: data.reduce((sum, q) => {
        const accuracy = q.times_used > 0 ? (q.times_correct / q.times_used) * 100 : 0;
        return sum + accuracy;
      }, 0) / data.length,
      difficultyDistribution: {
        veryEasy: data.filter(q => q.difficulty < -1.5).length,
        easy: data.filter(q => q.difficulty >= -1.5 && q.difficulty < -0.5).length,
        medium: data.filter(q => q.difficulty >= -0.5 && q.difficulty < 0.5).length,
        hard: data.filter(q => q.difficulty >= 0.5 && q.difficulty < 1.5).length,
        veryHard: data.filter(q => q.difficulty >= 1.5).length
      }
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error fetching question statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getAllSubjects,
  getSubjectById,
  getQuestionsBySubject,
  getQuestionById,
  getDiverseQuestions,
  updateQuestionStats,
  clearQuestionCache,
  preloadQuestions,
  getQuestionStatistics
};
