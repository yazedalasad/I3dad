/**
 * ABILITY SERVICE - Student Ability Tracking (COMPREHENSIVE EXAMS ONLY)
 * 
 * Updated to focus exclusively on comprehensive exam data
 * Enhanced for 2-questions-per-subject format and < 40 minute exams
 */

import { supabase } from '../config/supabase';

/**
 * Get student abilities from comprehensive exams only
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Comprehensive exam abilities data
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
      .eq('metadata->>examType', 'comprehensive_short') // Only comprehensive exams
      .order('ability_score', { ascending: false });

    if (error) throw error;

    // Enhance with comprehensive exam metrics
    const enhancedAbilities = (data || []).map(ability => ({
      ...ability,
      examType: 'comprehensive_short',
      questionsPerSubject: ability.metadata?.questionsPerSubject || 2,
      timePerQuestion: ability.metadata?.avgTimePerQuestion || 60,
      examEfficiency: calculateExamEfficiency(ability)
    }));

    return {
      success: true,
      abilities: enhancedAbilities
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
 * Calculate exam efficiency for comprehensive format
 */
function calculateExamEfficiency(ability) {
  const avgTime = ability.metadata?.avgTimePerQuestion || 60;
  const accuracy = ability.accuracy_rate || 0;
  
  // Target: < 60 seconds per question with > 70% accuracy
  let efficiency = 'optimal';
  let color = '#27ae60';
  
  if (avgTime > 90 || accuracy < 50) {
    efficiency = 'needs_improvement';
    color = '#e74c3c';
  } else if (avgTime > 75 || accuracy < 65) {
    efficiency = 'moderate';
    color = '#f39c12';
  } else if (avgTime > 60 || accuracy < 70) {
    efficiency = 'good';
    color = '#3498db';
  }
  
  return { level: efficiency, color, avgTime, accuracy };
}

/**
 * Get subject ability from comprehensive exams
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Subject ability data
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
      .eq('metadata->>examType', 'comprehensive_short')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          ability: null,
          message: 'Complete a comprehensive exam to establish ability score'
        };
      }
      throw error;
    }

    return {
      success: true,
      ability: {
        ...data,
        examType: 'comprehensive_short',
        questionsAnswered: data.total_questions_answered || 2,
        timePerQuestion: data.metadata?.avgTimePerQuestion || 60
      }
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
 * Get comprehensive exam history for a subject
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Array} Comprehensive exam history
 */
export async function getAbilityHistory(studentId, subjectId) {
  try {
    const { data: sessions, error } = await supabase
      .from('test_sessions')
      .select(`
        id,
        completed_at,
        total_time_seconds,
        questions_answered,
        metadata
      `)
      .eq('student_id', studentId)
      .eq('session_type', 'comprehensive_assessment')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        history: [],
        message: 'No comprehensive exams completed'
      };
    }

    const history = [];
    
    sessions.forEach(session => {
      if (session.metadata?.results) {
        const subjectResult = session.metadata.results.find(
          r => r.subjectId === subjectId
        );
        if (subjectResult) {
          history.push({
            examId: session.id,
            date: session.completed_at,
            abilityScore: subjectResult.abilityScore,
            accuracy: subjectResult.accuracy,
            questionsAnswered: subjectResult.questionsAnswered,
            timeSpent: session.total_time_seconds,
            timePerQuestion: session.total_time_seconds / subjectResult.questionsAnswered,
            examType: 'comprehensive'
          });
        }
      }
    });

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
 * Calculate ability growth from comprehensive exams only
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
          trend: 'insufficient_data',
          assessmentCount: history?.length || 0,
          recommendation: 'Complete at least 2 comprehensive exams to track growth'
        }
      };
    }

    const first = history[0];
    const last = history[history.length - 1];
    
    const improvement = last.abilityScore - first.abilityScore;
    const timeSpan = new Date(last.date) - new Date(first.date);
    const daysSpan = Math.max(1, timeSpan / (1000 * 60 * 60 * 24));
    
    const rate = (improvement / daysSpan).toFixed(2);
    const timeImprovement = ((first.timePerQuestion - last.timePerQuestion) / first.timePerQuestion) * 100;
    const accuracyImprovement = last.accuracy - first.accuracy;

    let trend, color, summary;
    
    if (improvement > 10 && timeImprovement > 10 && accuracyImprovement > 5) {
      trend = 'excellent_growth';
      color = '#27ae60';
      summary = 'Outstanding improvement in score, time, and accuracy';
    } else if (improvement > 5) {
      trend = 'steady_growth';
      color = '#3498db';
      summary = 'Steady improvement in ability score';
    } else if (improvement > -5) {
      trend = 'stable';
      color = '#f39c12';
      summary = 'Performance remains stable';
    } else if (improvement > -10) {
      trend = 'slight_decline';
      color = '#e74c3c';
      summary = 'Slight decline in performance';
    } else {
      trend = 'significant_decline';
      color = '#c0392b';
      summary = 'Significant decline in performance';
    }

    return {
      success: true,
      growth: {
        trend,
        color,
        summary,
        improvement: improvement.toFixed(1),
        rate,
        timeImprovement: timeImprovement.toFixed(1),
        accuracyImprovement: accuracyImprovement.toFixed(1),
        assessmentCount: history.length,
        firstScore: first.abilityScore,
        lastScore: last.abilityScore,
        firstDate: first.date,
        lastDate: last.date,
        avgDaysBetweenExams: (daysSpan / (history.length - 1)).toFixed(1)
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
 * Get comprehensive exam statistics
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Comprehensive exam statistics
 */
export async function getAbilityStatistics(studentId) {
  try {
    const { abilities } = await getStudentAbilities(studentId);

    if (!abilities || abilities.length === 0) {
      return {
        success: true,
        stats: {
          examType: 'comprehensive_short',
          averageAbility: 0,
          totalSubjectsAssessed: 0,
          totalComprehensiveExams: 0,
          message: 'Complete your first comprehensive exam to see statistics'
        }
      };
    }

    // Get unique comprehensive exam sessions
    const { data: sessions } = await supabase
      .from('test_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_type', 'comprehensive_assessment')
      .eq('status', 'completed');

    const comprehensiveExamCount = sessions?.length || 0;
    const avgAbility = abilities.reduce((sum, a) => sum + a.ability_score, 0) / abilities.length;
    const avgQuestions = abilities.reduce((sum, a) => sum + (a.total_questions_answered || 2), 0) / abilities.length;
    const avgTime = abilities.reduce((sum, a) => sum + (a.metadata?.avgTimePerQuestion || 60), 0) / abilities.length;
    const avgAccuracy = abilities.reduce((sum, a) => sum + (a.accuracy_rate || 0), 0) / abilities.length;

    // Sort for strongest/weakest
    const sorted = [...abilities].sort((a, b) => b.ability_score - a.ability_score);

    // Calculate exam efficiency categories
    const efficiencyCounts = {
      optimal: 0,
      good: 0,
      moderate: 0,
      needs_improvement: 0
    };

    abilities.forEach(ability => {
      const efficiency = calculateExamEfficiency(ability);
      efficiencyCounts[efficiency.level] = (efficiencyCounts[efficiency.level] || 0) + 1;
    });

    const stats = {
      examType: 'comprehensive_short',
      averageAbility: Math.round(avgAbility),
      totalSubjectsAssessed: abilities.length,
      totalComprehensiveExams: comprehensiveExamCount,
      averageTimePerQuestion: Math.round(avgTime),
      averageAccuracy: Math.round(avgAccuracy),
      averageQuestionsPerSubject: Math.round(avgQuestions),
      strongestSubjects: sorted.slice(0, 3).map(a => ({
        subjectId: a.subject_id,
        name: a.subjects?.name_ar || a.subjects?.name_en,
        score: Math.round(a.ability_score),
        efficiency: calculateExamEfficiency(a)
      })),
      weakestSubjects: sorted.slice(-3).reverse().map(a => ({
        subjectId: a.subject_id,
        name: a.subjects?.name_ar || a.subjects?.name_en,
        score: Math.round(a.ability_score),
        efficiency: calculateExamEfficiency(a),
        recommendation: a.ability_score < 50 ? 'Focus on fundamentals' : 'Practice time management'
      })),
      efficiencyBreakdown: efficiencyCounts,
      byCategory: calculateCategoryAverages(abilities),
      examPerformance: {
        overallEfficiency: avgTime <= 60 && avgAccuracy >= 70 ? 'optimal' : 
                         avgTime <= 75 && avgAccuracy >= 60 ? 'good' : 
                         avgTime <= 90 && avgAccuracy >= 50 ? 'moderate' : 'needs_improvement',
        timeManagement: avgTime <= 60 ? 'excellent' : 
                       avgTime <= 75 ? 'good' : 
                       avgTime <= 90 ? 'moderate' : 'needs_improvement',
        accuracyConsistency: avgAccuracy >= 70 ? 'high' : 
                            avgAccuracy >= 60 ? 'moderate' : 'needs_improvement'
      }
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
 * Compare with grade level expectations (comprehensive format)
 */
export async function compareWithGradeLevel(studentId) {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('grade')
      .eq('id', studentId)
      .single();

    const { abilities } = await getStudentAbilities(studentId);

    // Adjusted expectations for 2-question comprehensive format
    const gradeExpectations = {
      7: { target: 40, min: 30, max: 50 },
      8: { target: 45, min: 35, max: 55 },
      9: { target: 50, min: 40, max: 60 },
      10: { target: 55, min: 45, max: 65 },
      11: { target: 60, min: 50, max: 70 },
      12: { target: 65, min: 55, max: 75 }
    };

    const expectations = gradeExpectations[student?.grade] || { target: 55, min: 45, max: 65 };

    const comparison = abilities.map(ability => {
      const actual = ability.ability_score;
      let status, color, feedback;
      
      if (actual >= expectations.max) {
        status = 'exceeds_expectations';
        color = '#27ae60';
        feedback = 'Performing above grade level in comprehensive exams';
      } else if (actual >= expectations.target) {
        status = 'meets_expectations';
        color = '#3498db';
        feedback = 'Meeting grade level expectations in comprehensive exams';
      } else if (actual >= expectations.min) {
        status = 'approaching_expectations';
        color = '#f39c12';
        feedback = 'Approaching grade level expectations';
      } else {
        status = 'below_expectations';
        color = '#e74c3c';
        feedback = 'Below grade level expectations in comprehensive exams';
      }

      return {
        subjectId: ability.subject_id,
        subjectName: ability.subjects?.name_ar || ability.subjects?.name_en,
        actualScore: Math.round(actual),
        targetScore: expectations.target,
        difference: Math.round(actual - expectations.target),
        status,
        color,
        feedback,
        examData: {
          questions: ability.total_questions_answered || 2,
          avgTime: ability.metadata?.avgTimePerQuestion || 60,
          lastExam: ability.last_assessed_at
        }
      };
    });

    return {
      success: true,
      grade: student?.grade || 'unknown',
      expectations,
      comparison,
      summary: `Based on ${comparison.length} subjects assessed in comprehensive exams`
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
 * Get radar chart data for comprehensive exams
 */
export async function getAbilityRadarData(studentId) {
  try {
    const { abilities } = await getStudentAbilities(studentId);

    const radarData = abilities.map(ability => ({
      subject: ability.subjects?.name_en,
      subjectAr: ability.subjects?.name_ar,
      subjectHe: ability.subjects?.name_he,
      score: ability.ability_score,
      confidence: ability.confidence_level,
      examType: 'comprehensive_short',
      timeEfficiency: calculateExamEfficiency(ability).level,
      lastAssessed: ability.last_assessed_at
    }));

    return {
      success: true,
      radarData,
      examFormat: '2 questions per subject, < 40 minutes total'
    };
  } catch (error) {
    console.error('Error getting radar data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get comprehensive exam performance trends
 */
export async function getExamPerformanceTrends(studentId) {
  try {
    const { data: sessions } = await supabase
      .from('test_sessions')
      .select('id, completed_at, total_time_seconds, questions_answered, metadata')
      .eq('student_id', studentId)
      .eq('session_type', 'comprehensive_assessment')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        trends: {
          examCount: 0,
          trend: 'no_data',
          recommendation: 'Start with your first comprehensive exam'
        }
      };
    }

    const trends = sessions.map(session => ({
      date: session.completed_at,
      totalTime: session.total_time_seconds,
      questions: session.questions_answered,
      avgTimePerQuestion: session.total_time_seconds / session.questions_answered,
      overallScore: session.metadata?.overallScore || 0,
      overallAccuracy: session.metadata?.overallAccuracy || 0
    }));

    // Calculate improvement trends
    let timeTrend = 'stable';
    let scoreTrend = 'stable';
    let efficiencyTrend = 'stable';

    if (trends.length >= 2) {
      const first = trends[0];
      const last = trends[trends.length - 1];
      
      const timeChange = ((first.avgTimePerQuestion - last.avgTimePerQuestion) / first.avgTimePerQuestion) * 100;
      const scoreChange = last.overallScore - first.overallScore;
      const efficiencyScore = (last.overallScore / last.avgTimePerQuestion) - (first.overallScore / first.avgTimePerQuestion);
      
      timeTrend = timeChange > 10 ? 'improving' : timeChange < -10 ? 'declining' : 'stable';
      scoreTrend = scoreChange > 5 ? 'improving' : scoreChange < -5 ? 'declining' : 'stable';
      efficiencyTrend = efficiencyScore > 0.1 ? 'improving' : efficiencyScore < -0.1 ? 'declining' : 'stable';
    }

    return {
      success: true,
      trends: {
        examCount: sessions.length,
        timeTrend,
        scoreTrend,
        efficiencyTrend,
        averageTimePerQuestion: trends.reduce((sum, t) => sum + t.avgTimePerQuestion, 0) / trends.length,
        averageScore: trends.reduce((sum, t) => sum + t.overallScore, 0) / trends.length,
        totalExams: sessions.length,
        firstExamDate: sessions[0].completed_at,
        lastExamDate: sessions[sessions.length - 1].completed_at,
        examFrequency: calculateExamFrequency(sessions)
      }
    };
  } catch (error) {
    console.error('Error getting exam performance trends:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper: Calculate exam frequency
 */
function calculateExamFrequency(sessions) {
  if (sessions.length < 2) return 'infrequent';
  
  const dates = sessions.map(s => new Date(s.completed_at)).sort((a, b) => a - b);
  const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  const examsPerMonth = (sessions.length / totalDays) * 30;
  
  if (examsPerMonth >= 4) return 'very_frequent';
  if (examsPerMonth >= 2) return 'frequent';
  if (examsPerMonth >= 1) return 'moderate';
  return 'infrequent';
}

/**
 * Helper: Calculate category averages
 */
function calculateCategoryAverages(abilities) {
  const categories = {};

  abilities.forEach(ability => {
    const category = ability.subjects?.category;
    if (category) {
      if (!categories[category]) {
        categories[category] = { total: 0, count: 0, subjects: [] };
      }
      categories[category].total += ability.ability_score;
      categories[category].count += 1;
      categories[category].subjects.push({
        name: ability.subjects?.name_ar || ability.subjects?.name_en,
        score: ability.ability_score
      });
    }
  });

  const result = {};
  for (const category in categories) {
    result[category] = {
      average: categories[category].total / categories[category].count,
      subjectCount: categories[category].count,
      subjects: categories[category].subjects
    };
  }

  return result;
}

export default {
  getStudentAbilities,
  getSubjectAbility,
  getAbilityHistory,
  calculateAbilityGrowth,
  getAbilityStatistics,
  compareWithGradeLevel,
  getAbilityRadarData,
  getExamPerformanceTrends
};
