/**
 * ABILITY SERVICE - Student Ability Tracking
 * 
 * Manages student ability scores, history, and analytics
 */

import { supabase } from '../config/supabase';
import { thetaToPercentage } from '../utils/irt/irtCalculations';

/**
 * Get student abilities across all subjects
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Abilities data
 */
export async function getStudentAbilities(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_abilities')
      .select(`
        *,
        subjects (
          id,
          name_en,
          name_ar,
          name_he,
          code,
          category,
          point_level
        )
      `)
      .eq('student_id', studentId)
      .order('ability_score', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      abilities: data || []
    };
  } catch (error) {
    console.error('Error fetching student abilities:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get ability for specific subject
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Ability data
 */
export async function getSubjectAbility(studentId, subjectId) {
  try {
    const { data, error } = await supabase
      .from('student_abilities')
      .select(`
        *,
        subjects (*)
      `)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return {
          success: true,
          ability: null
        };
      }
      throw error;
    }

    return {
      success: true,
      ability: data
    };
  } catch (error) {
    console.error('Error fetching subject ability:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get ability history for a subject
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Array} History of assessments
 */
export async function getAbilityHistory(studentId, subjectId) {
  try {
    const { data, error } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('session_type', 'ability_assessment')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (error) throw error;

    // Format history
    const history = data.map(session => ({
      date: session.completed_at,
      theta: session.final_ability_estimate,
      abilityScore: thetaToPercentage(session.final_ability_estimate),
      standardError: session.standard_error,
      questionsAnswered: session.questions_answered,
      timeSpent: session.total_time_seconds
    }));

    return {
      success: true,
      history
    };
  } catch (error) {
    console.error('Error fetching ability history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate ability growth rate
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Growth metrics
 */
export async function calculateAbilityGrowth(studentId, subjectId) {
  try {
    const { history } = await getAbilityHistory(studentId, subjectId);

    if (!history || history.length < 2) {
      return {
        success: true,
        growth: {
          rate: 0,
          trend: 'insufficient_data',
          improvement: 0
        }
      };
    }

    const first = history[0];
    const last = history[history.length - 1];
    
    const improvement = last.abilityScore - first.abilityScore;
    const timeSpan = new Date(last.date) - new Date(first.date);
    const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
    
    // Growth rate per day
    const rate = daysSpan > 0 ? improvement / daysSpan : 0;

    // Determine trend
    let trend;
    if (improvement > 10) trend = 'strong_growth';
    else if (improvement > 5) trend = 'moderate_growth';
    else if (improvement > -5) trend = 'stable';
    else if (improvement > -10) trend = 'slight_decline';
    else trend = 'decline';

    // Recent improvement (last 2 assessments)
    const recentImprovement = history.length >= 2
      ? history[history.length - 1].abilityScore - history[history.length - 2].abilityScore
      : 0;

    return {
      success: true,
      growth: {
        rate,
        trend,
        improvement,
        recentImprovement,
        assessmentCount: history.length,
        firstScore: first.abilityScore,
        lastScore: last.abilityScore
      }
    };
  } catch (error) {
    console.error('Error calculating ability growth:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get ability statistics summary
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Statistics
 */
export async function getAbilityStatistics(studentId) {
  try {
    const { abilities } = await getStudentAbilities(studentId);

    if (!abilities || abilities.length === 0) {
      return {
        success: true,
        stats: {
          averageAbility: 0,
          strongestSubjects: [],
          weakestSubjects: [],
          totalAssessments: 0
        }
      };
    }

    const avgAbility = abilities.reduce((sum, a) => sum + a.ability_score, 0) / abilities.length;
    const totalQuestions = abilities.reduce((sum, a) => sum + a.total_questions_answered, 0);
    const totalCorrect = abilities.reduce((sum, a) => sum + a.correct_answers, 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Sort by ability score
    const sorted = [...abilities].sort((a, b) => b.ability_score - a.ability_score);

    const stats = {
      averageAbility: avgAbility,
      overallAccuracy,
      totalAssessments: abilities.length,
      totalQuestions,
      strongestSubjects: sorted.slice(0, 3).map(a => ({
        subjectId: a.subject_id,
        name: a.subjects.name_en,
        nameAr: a.subjects.name_ar,
        nameHe: a.subjects.name_he,
        score: a.ability_score,
        confidence: a.confidence_level
      })),
      weakestSubjects: sorted.slice(-3).reverse().map(a => ({
        subjectId: a.subject_id,
        name: a.subjects.name_en,
        nameAr: a.subjects.name_ar,
        nameHe: a.subjects.name_he,
        score: a.ability_score,
        confidence: a.confidence_level
      })),
      byCategory: calculateCategoryAverages(abilities)
    };

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Error fetching ability statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate average ability by category
 * 
 * @param {Array} abilities - Abilities data
 * @returns {Object} Category averages
 */
function calculateCategoryAverages(abilities) {
  const categories = {};

  abilities.forEach(ability => {
    const category = ability.subjects.category;
    if (!categories[category]) {
      categories[category] = {
        total: 0,
        count: 0
      };
    }
    categories[category].total += ability.ability_score;
    categories[category].count += 1;
  });

  const result = {};
  for (const category in categories) {
    result[category] = categories[category].total / categories[category].count;
  }

  return result;
}

/**
 * Compare student ability with grade-level expectations
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Comparison data
 */
export async function compareWithGradeLevel(studentId) {
  try {
    // Get student grade
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('grade')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // Get abilities
    const { abilities } = await getStudentAbilities(studentId);

    // Expected ability by grade (simplified model)
    const gradeExpectations = {
      7: 40, 8: 45, 9: 50,
      10: 55, 11: 60, 12: 65
    };

    const expectedAbility = gradeExpectations[student.grade] || 50;

    const comparison = abilities.map(ability => ({
      subjectId: ability.subject_id,
      subjectName: ability.subjects.name_en,
      actualAbility: ability.ability_score,
      expectedAbility,
      difference: ability.ability_score - expectedAbility,
      status: ability.ability_score >= expectedAbility ? 'above' : 'below'
    }));

    return {
      success: true,
      grade: student.grade,
      expectedAbility,
      comparison
    };
  } catch (error) {
    console.error('Error comparing with grade level:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get radar chart data for abilities
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Radar chart data
 */
export async function getAbilityRadarData(studentId) {
  try {
    const { abilities } = await getStudentAbilities(studentId);

    const radarData = abilities.map(ability => ({
      subject: ability.subjects.name_en,
      subjectAr: ability.subjects.name_ar,
      subjectHe: ability.subjects.name_he,
      score: ability.ability_score,
      confidence: ability.confidence_level
    }));

    return {
      success: true,
      radarData
    };
  } catch (error) {
    console.error('Error getting radar data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  getStudentAbilities,
  getSubjectAbility,
  getAbilityHistory,
  calculateAbilityGrowth,
  getAbilityStatistics,
  compareWithGradeLevel,
  getAbilityRadarData
};
