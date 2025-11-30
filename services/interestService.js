/**
 * INTEREST SERVICE - Student Interest Tracking
 * 
 * Manages student interest profiles and engagement metrics
 */

import { supabase } from '../config/supabase';
import {
    classifyInterestLevel,
    compareInterests
} from '../utils/irt/interestProfiling';

/**
 * Get student interests across all subjects
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Interests data
 */
export async function getStudentInterests(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_interests')
      .select(`
        *,
        subjects (
          id,
          name_en,
          name_ar,
          name_he,
          code,
          category
        )
      `)
      .eq('student_id', studentId)
      .order('interest_score', { ascending: false });

    if (error) throw error;

    // Add interest level classification
    const interests = (data || []).map(interest => ({
      ...interest,
      interestLevel: classifyInterestLevel(interest.interest_score)
    }));

    return {
      success: true,
      interests
    };
  } catch (error) {
    console.error('Error fetching student interests:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get interest for specific subject
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Interest data
 */
export async function getSubjectInterest(studentId, subjectId) {
  try {
    const { data, error } = await supabase
      .from('student_interests')
      .select(`
        *,
        subjects (*)
      `)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          interest: null
        };
      }
      throw error;
    }

    return {
      success: true,
      interest: {
        ...data,
        interestLevel: classifyInterestLevel(data.interest_score)
      }
    };
  } catch (error) {
    console.error('Error fetching subject interest:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get top interests for a student
 * 
 * @param {string} studentId - Student ID
 * @param {number} count - Number of top interests
 * @returns {Array} Top interests
 */
export async function getTopInterests(studentId, count = 5) {
  try {
    const { interests } = await getStudentInterests(studentId);

    const topInterests = interests
      .filter(i => i.interest_score >= 40) // Minimum threshold
      .slice(0, count);

    return {
      success: true,
      topInterests
    };
  } catch (error) {
    console.error('Error fetching top interests:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compare interests across subjects
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Comparison data
 */
export async function compareSubjectInterests(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    if (!interests || interests.length === 0) {
      return {
        success: true,
        comparison: []
      };
    }

    // Create profiles object for comparison
    const profiles = {};
    interests.forEach(interest => {
      profiles[interest.subject_id] = {
        interestScore: interest.interest_score,
        questionsAttempted: interest.questions_attempted,
        avgTime: interest.avg_time_per_question,
        accuracy: interest.completion_rate
      };
    });

    const comparison = compareInterests(profiles);

    // Enrich with subject names
    const enriched = comparison.map(item => {
      const interest = interests.find(i => i.subject_id === item.subjectId);
      return {
        ...item,
        subjectName: interest?.subjects.name_en,
        subjectNameAr: interest?.subjects.name_ar,
        subjectNameHe: interest?.subjects.name_he,
        category: interest?.subjects.category
      };
    });

    return {
      success: true,
      comparison: enriched
    };
  } catch (error) {
    console.error('Error comparing interests:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get interest statistics
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Statistics
 */
export async function getInterestStatistics(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    if (!interests || interests.length === 0) {
      return {
        success: true,
        stats: {
          averageInterest: 0,
          highInterestCount: 0,
          lowInterestCount: 0,
          totalEngagementTime: 0
        }
      };
    }

    const avgInterest = interests.reduce((sum, i) => sum + i.interest_score, 0) / interests.length;
    const totalTime = interests.reduce((sum, i) => sum + i.time_spent_seconds, 0);
    const totalQuestions = interests.reduce((sum, i) => sum + i.questions_attempted, 0);

    const stats = {
      averageInterest: avgInterest,
      highInterestCount: interests.filter(i => i.interest_score >= 70).length,
      mediumInterestCount: interests.filter(i => i.interest_score >= 40 && i.interest_score < 70).length,
      lowInterestCount: interests.filter(i => i.interest_score < 40).length,
      totalEngagementTime: totalTime,
      totalQuestions,
      avgTimePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
      byCategory: calculateCategoryInterests(interests)
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error fetching interest statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate average interest by category
 * 
 * @param {Array} interests - Interests data
 * @returns {Object} Category averages
 */
function calculateCategoryInterests(interests) {
  const categories = {};

  interests.forEach(interest => {
    const category = interest.subjects.category;
    if (!categories[category]) {
      categories[category] = {
        total: 0,
        count: 0
      };
    }
    categories[category].total += interest.interest_score;
    categories[category].count += 1;
  });

  const result = {};
  for (const category in categories) {
    result[category] = categories[category].total / categories[category].count;
  }

  return result;
}

/**
 * Get engagement patterns
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID (optional)
 * @returns {Object} Engagement patterns
 */
export async function getEngagementPatterns(studentId, subjectId = null) {
  try {
    let query = supabase
      .from('student_responses')
      .select(`
        *,
        questions(subject_id, subjects(name_en, name_ar, name_he))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (subjectId) {
      query = query.eq('questions.subject_id', subjectId);
    }

    const { data: responses, error } = await query;

    if (error) throw error;

    if (!responses || responses.length === 0) {
      return {
        success: true,
        patterns: {
          trend: 'insufficient_data',
          consistency: 0
        }
      };
    }

    // Analyze time patterns
    const times = responses.map(r => r.time_taken_seconds);
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    
    // Calculate consistency (coefficient of variation)
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const consistency = avgTime > 0 ? Math.max(0, 100 - (stdDev / avgTime) * 100) : 0;

    // Analyze trend (recent vs early)
    const recentCount = Math.min(10, Math.floor(responses.length / 3));
    const recentResponses = responses.slice(-recentCount);
    const earlyResponses = responses.slice(0, recentCount);

    const recentAvgTime = recentResponses.reduce((sum, r) => sum + r.time_taken_seconds, 0) / recentResponses.length;
    const earlyAvgTime = earlyResponses.reduce((sum, r) => sum + r.time_taken_seconds, 0) / earlyResponses.length;

    let trend;
    const timeDiff = recentAvgTime - earlyAvgTime;
    if (timeDiff > 10) trend = 'increasing_engagement';
    else if (timeDiff < -10) trend = 'decreasing_engagement';
    else trend = 'stable';

    // Accuracy trend
    const recentAccuracy = recentResponses.filter(r => r.is_correct).length / recentResponses.length * 100;
    const earlyAccuracy = earlyResponses.filter(r => r.is_correct).length / earlyResponses.length * 100;

    const patterns = {
      trend,
      consistency,
      avgTime,
      recentAvgTime,
      earlyAvgTime,
      recentAccuracy,
      earlyAccuracy,
      accuracyImprovement: recentAccuracy - earlyAccuracy,
      totalResponses: responses.length
    };

    return {
      success: true,
      patterns
    };
  } catch (error) {
    console.error('Error analyzing engagement patterns:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get interest radar chart data
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Radar chart data
 */
export async function getInterestRadarData(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    const radarData = interests.map(interest => ({
      subject: interest.subjects.name_en,
      subjectAr: interest.subjects.name_ar,
      subjectHe: interest.subjects.name_he,
      score: interest.interest_score,
      level: interest.interestLevel
    }));

    return {
      success: true,
      radarData
    };
  } catch (error) {
    console.error('Error getting interest radar data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Track interest evolution over time
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Evolution data
 */
export async function trackInterestEvolution(studentId, subjectId) {
  try {
    // Get historical interest data from test sessions
    const { data: sessions, error } = await supabase
      .from('test_sessions')
      .select('completed_at')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (error) throw error;

    // Get current interest
    const { interest } = await getSubjectInterest(studentId, subjectId);

    if (!interest || !sessions || sessions.length < 2) {
      return {
        success: true,
        evolution: {
          trend: 'insufficient_data',
          dataPoints: []
        }
      };
    }

    // For now, return current state
    // In a full implementation, we'd track interest at each session
    const evolution = {
      trend: 'stable',
      currentScore: interest.interest_score,
      assessmentCount: sessions.length,
      firstAssessment: sessions[0].completed_at,
      lastAssessment: sessions[sessions.length - 1].completed_at
    };

    return {
      success: true,
      evolution
    };
  } catch (error) {
    console.error('Error tracking interest evolution:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getStudentInterests,
  getSubjectInterest,
  getTopInterests,
  compareSubjectInterests,
  getInterestStatistics,
  getEngagementPatterns,
  getInterestRadarData,
  trackInterestEvolution
};
