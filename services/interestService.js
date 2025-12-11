/**
 * INTEREST SERVICE - Time-Based Interest Analysis for Comprehensive Exams
 * 
 * Enhanced with advanced time analysis for 2-question-per-subject comprehensive exams
 * Focus on response time patterns, engagement metrics, and time-based interest scoring
 */

import { supabase } from '../config/supabase';
import {
  classifyInterestLevel
} from '../utils/irt/interestProfiling';

// Time analysis constants for 2-question comprehensive exams
const TIME_ANALYSIS_CONFIG = {
    OPTIMAL_TIME: 45, // seconds (target for optimal performance)
    FAST_THRESHOLD: 30, // seconds (very fast)
    SLOW_THRESHOLD: 60, // seconds (slow)
    MAX_TIME: 120, // seconds (timeout threshold)
    BASELINE_TIME: 60 // seconds (average expected time)
};

/**
 * Get student interests with comprehensive time-based analysis
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Interests with time-based metrics
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
          category,
          point_level
        )
      `)
      .eq('student_id', studentId)
      .order('interest_score', { ascending: false });

    if (error) throw error;

    // Enhanced interest classification with time analysis
    const interests = (data || []).map(interest => {
      const interestLevel = classifyInterestLevel(interest.interest_score);
      const examData = interest.metadata || {};
      const avgTime = interest.avg_time_per_question || 0;
      
      // Comprehensive time analysis for 2-question format
      const timeAnalysis = analyzeComprehensiveResponseTime(avgTime, interest.completion_rate || 0);
      const engagementScore = calculateComprehensiveEngagementScore(interest);
      const timeConsistency = calculateTimeConsistency(interest);
      
      return {
        ...interest,
        interestLevel,
        timeAnalysis,
        engagementScore,
        timeConsistency,
        examMetrics: {
          totalComprehensiveExams: examData.totalExams || 1,
          averageAccuracy: examData.averageAccuracy || interest.completion_rate,
          averageTimePerQuestion: avgTime,
          totalQuestions: interest.questions_attempted || 2,
          questionEfficiency: calculateQuestionEfficiency(avgTime, interest.completion_rate || 0)
        },
        recommendations: generateTimeBasedRecommendations(interest, timeAnalysis)
      };
    });

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
 * Advanced time analysis for comprehensive exam responses
 */
function analyzeComprehensiveResponseTime(avgTime, accuracy) {
  if (!avgTime || avgTime === 0) {
    return {
      category: 'no_data',
      description: 'No time data available',
      color: '#94A3B8',
      timeEfficiency: 0,
      accuracyImpact: 'unknown'
    };
  }
  
  // Time efficiency score (0-100)
  const timeEfficiency = Math.max(0, 100 - ((avgTime - TIME_ANALYSIS_CONFIG.OPTIMAL_TIME) / TIME_ANALYSIS_CONFIG.OPTIMAL_TIME) * 50);
  
  // Combined performance score (time + accuracy)
  const performanceScore = (timeEfficiency * 0.4) + (accuracy * 0.6);
  
  let category, description, color, timePattern, accuracyImpact;
  
  if (avgTime <= TIME_ANALYSIS_CONFIG.FAST_THRESHOLD) {
    category = 'very_fast';
    color = accuracy > 70 ? '#27ae60' : '#f39c12';
    timePattern = 'quick_responder';
    accuracyImpact = accuracy > 70 ? 'high_accuracy' : 'low_accuracy';
    description = accuracy > 70 
      ? 'Quick responses with high accuracy - indicates strong mastery'
      : 'Quick responses but lower accuracy - may indicate guessing';
  } else if (avgTime <= TIME_ANALYSIS_CONFIG.OPTIMAL_TIME) {
    category = 'optimal';
    color = '#3498db';
    timePattern = 'balanced';
    accuracyImpact = 'optimal';
    description = 'Ideal balance of speed and accuracy';
  } else if (avgTime <= TIME_ANALYSIS_CONFIG.SLOW_THRESHOLD) {
    category = 'moderate';
    color = accuracy > 60 ? '#f39c12' : '#e67e22';
    timePattern = 'cautious';
    accuracyImpact = accuracy > 60 ? 'accurate_cautious' : 'inaccurate_slow';
    description = accuracy > 60 
      ? 'Cautious approach maintaining good accuracy'
      : 'Slow responses with accuracy issues';
  } else if (avgTime <= TIME_ANALYSIS_CONFIG.MAX_TIME) {
    category = 'slow';
    color = '#e74c3c';
    timePattern = 'very_slow';
    accuracyImpact = 'time_constrained';
    description = 'Very slow responses - may indicate difficulty or hesitation';
  } else {
    category = 'timeout_risk';
    color = '#c0392b';
    timePattern = 'at_risk';
    accuracyImpact = 'high_risk';
    description = 'Response times approaching timeout limit';
  }
  
  return {
    category,
    description,
    color,
    timeEfficiency: Math.round(timeEfficiency),
    performanceScore: Math.round(performanceScore),
    avgTime: Math.round(avgTime),
    timePattern,
    accuracyImpact,
    improvementTarget: calculateTimeImprovementTarget(avgTime, accuracy)
  };
}

/**
 * Calculate improvement targets based on time and accuracy
 */
function calculateTimeImprovementTarget(avgTime, accuracy) {
  const targets = [];
  
  if (avgTime > TIME_ANALYSIS_CONFIG.SLOW_THRESHOLD) {
    targets.push({
      type: 'time_reduction',
      current: avgTime,
      target: TIME_ANALYSIS_CONFIG.SLOW_THRESHOLD - 10,
      priority: 'high',
      strategy: 'Practice time-limited questions to build speed'
    });
  }
  
  if (accuracy < 60) {
    targets.push({
      type: 'accuracy_improvement',
      current: accuracy,
      target: 70,
      priority: avgTime < TIME_ANALYSIS_CONFIG.FAST_THRESHOLD ? 'high' : 'medium',
      strategy: 'Focus on understanding concepts before attempting speed'
    });
  }
  
  if (avgTime <= TIME_ANALYSIS_CONFIG.FAST_THRESHOLD && accuracy > 75) {
    targets.push({
      type: 'advanced_challenge',
      priority: 'low',
      strategy: 'Ready for more challenging questions or reduced time limits'
    });
  }
  
  return targets;
}

/**
 * Calculate comprehensive engagement score (0-100)
 * Factors: interest, time efficiency, accuracy, consistency
 */
function calculateComprehensiveEngagementScore(interest) {
  const factors = {
    interestScore: (interest.interest_score || 50) / 100,
    accuracy: (interest.completion_rate || 50) / 100,
    timeEfficiency: calculateTimeEfficiency(interest.avg_time_per_question || 0),
    consistency: calculateTimeConsistency(interest) / 100,
    questionsAttempted: Math.min(1, (interest.questions_attempted || 0) / 10)
  };
  
  // Weighted scoring for comprehensive exams
  const weights = {
    interestScore: 0.3,
    accuracy: 0.25,
    timeEfficiency: 0.25,
    consistency: 0.15,
    questionsAttempted: 0.05
  };
  
  const score = Object.keys(factors).reduce((sum, key) => 
    sum + (factors[key] * (weights[key] || 0)), 0
  ) * 100;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate time efficiency score (0-1)
 */
function calculateTimeEfficiency(avgTime) {
  if (!avgTime) return 0.5;
  
  // Efficiency curve: optimal around 45 seconds
  const diff = Math.abs(avgTime - TIME_ANALYSIS_CONFIG.OPTIMAL_TIME);
  const maxDiff = TIME_ANALYSIS_CONFIG.MAX_TIME - TIME_ANALYSIS_CONFIG.OPTIMAL_TIME;
  
  return Math.max(0, 1 - (diff / maxDiff));
}

/**
 * Calculate time consistency across responses
 */
function calculateTimeConsistency(interest) {
  const timeData = interest.metadata?.timePatterns || {};
  const times = Object.values(timeData);
  
  if (times.length === 0) return 50; // Default moderate consistency
  
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? (stdDev / avg) * 100 : 100;
  
  // Convert to 0-100 scale (lower CV = higher consistency)
  return Math.max(0, 100 - cv);
}

/**
 * Calculate question efficiency (time vs accuracy tradeoff)
 */
function calculateQuestionEfficiency(avgTime, accuracy) {
  if (!avgTime || avgTime === 0) return 'unknown';
  
  const timeScore = Math.max(0, 100 - ((avgTime - TIME_ANALYSIS_CONFIG.OPTIMAL_TIME) / 30) * 100);
  const combinedScore = (timeScore * 0.4) + (accuracy * 0.6);
  
  if (combinedScore >= 80) return 'highly_efficient';
  if (combinedScore >= 65) return 'efficient';
  if (combinedScore >= 50) return 'moderate';
  if (combinedScore >= 35) return 'inefficient';
  return 'very_inefficient';
}

/**
 * Generate time-based recommendations
 */
function generateTimeBasedRecommendations(interest, timeAnalysis) {
  const recommendations = [];
  const score = interest.interest_score || 0;
  const accuracy = interest.completion_rate || 0;
  const avgTime = interest.avg_time_per_question || 0;
  const engagementScore = calculateComprehensiveEngagementScore(interest);

  // Time-based recommendations
  if (timeAnalysis.category === 'very_fast') {
    if (accuracy >= 75) {
      recommendations.push({
        type: 'advanced_challenge',
        title: 'Ready for Advanced Challenges',
        description: 'Your quick and accurate responses show strong mastery. Try more challenging questions.',
        priority: 'low',
        action: 'Increase question difficulty'
      });
    } else {
      recommendations.push({
        type: 'accuracy_focus',
        title: 'Focus on Accuracy',
        description: 'You respond quickly but accuracy could improve. Take an extra moment to verify answers.',
        priority: 'medium',
        action: 'Practice checking work before submitting'
      });
    }
  }

  if (timeAnalysis.category === 'slow' || timeAnalysis.category === 'timeout_risk') {
    recommendations.push({
      type: 'time_management',
      title: 'Improve Time Management',
      description: 'Response times are slow, affecting your ability to complete exams. Practice timed exercises.',
      priority: 'high',
      action: 'Set time limits for practice questions'
    });
    
    if (accuracy < 60) {
      recommendations.push({
        type: 'foundational_review',
        title: 'Review Foundational Concepts',
        description: 'Slow responses with low accuracy suggest you may need to review basic concepts.',
        priority: 'high',
        action: 'Focus on core concepts before speed'
      });
    }
  }

  if (timeAnalysis.category === 'optimal' && engagementScore >= 70) {
    recommendations.push({
      type: 'maintain_performance',
      title: 'Maintain Current Approach',
      description: 'Your time management and accuracy are well balanced. Continue with your current strategies.',
      priority: 'low',
      action: 'Regular practice to maintain skills'
    });
  }

  // Engagement-based recommendations
  if (engagementScore < 50) {
    recommendations.push({
      type: 'engagement_boost',
      title: 'Increase Engagement',
      description: 'Overall engagement is low. Try to connect subject matter to personal interests.',
      priority: 'medium',
      action: 'Explore real-world applications of the subject'
    });
  }

  // Add specific improvement targets from time analysis
  timeAnalysis.improvementTarget?.forEach(target => {
    recommendations.push({
      type: 'targeted_improvement',
      title: `${target.type === 'time_reduction' ? 'Reduce Response Time' : 'Improve Accuracy'}`,
      description: `Current: ${Math.round(target.current)}${target.type === 'time_reduction' ? 's' : '%'}, Target: ${target.target}${target.type === 'time_reduction' ? 's' : '%'}`,
      priority: target.priority,
      action: target.strategy
    });
  });

  return recommendations;
}

/**
 * Get subject interest with detailed time analysis
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @returns {Object} Interest with comprehensive time analysis
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
          interest: null,
          recommendation: 'Complete comprehensive exam to establish interest profile'
        };
      }
      throw error;
    }

    const interestLevel = classifyInterestLevel(data.interest_score);
    const timeAnalysis = analyzeComprehensiveResponseTime(data.avg_time_per_question, data.completion_rate);
    const engagementScore = calculateComprehensiveEngagementScore(data);
    const timeConsistency = calculateTimeConsistency(data);

    return {
      success: true,
      interest: {
        ...data,
        interestLevel,
        timeAnalysis,
        engagementScore,
        timeConsistency,
        examSummary: {
          totalExams: data.metadata?.totalExams || 1,
          totalQuestions: data.questions_attempted || 0,
          averageTime: data.avg_time_per_question || 0,
          averageAccuracy: data.completion_rate || 0,
          lastAssessed: data.last_updated
        },
        recommendations: generateTimeBasedRecommendations(data, timeAnalysis),
        improvementPlan: generateTimeBasedImprovementPlan(data, timeAnalysis)
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
 * Generate time-based improvement plan
 */
function generateTimeBasedImprovementPlan(interest, timeAnalysis) {
  const plan = {
    focusAreas: [],
    weeklyGoals: [],
    strategies: []
  };

  // Determine focus areas based on time analysis
  if (timeAnalysis.category === 'very_fast' && interest.completion_rate < 70) {
    plan.focusAreas.push('Accuracy Improvement');
    plan.strategies.push('Implement a 5-second verification step before answering');
    plan.weeklyGoals.push('Increase accuracy to 75% while maintaining speed');
  }

  if (timeAnalysis.category === 'slow' || timeAnalysis.category === 'timeout_risk') {
    plan.focusAreas.push('Time Management');
    plan.strategies.push('Practice with 45-second time limits per question');
    plan.strategies.push('Use skimming techniques for question comprehension');
    plan.weeklyGoals.push('Reduce average response time by 15%');
  }

  if (timeAnalysis.performanceScore < 60) {
    plan.focusAreas.push('Balanced Performance');
    plan.strategies.push('Work on both speed and accuracy simultaneously');
    plan.weeklyGoals.push('Improve combined performance score by 10 points');
  }

  // Add engagement focus if needed
  if ((interest.interest_score || 0) < 50) {
    plan.focusAreas.push('Engagement Building');
    plan.strategies.push('Connect subject matter to personal interests');
    plan.strategies.push('Set small, achievable goals for each study session');
    plan.weeklyGoals.push('Complete 5 engaging practice questions');
  }

  return plan;
}

/**
 * Get top interests with time-based prioritization
 * 
 * @param {string} studentId - Student ID
 * @param {number} count - Number of top interests
 * @returns {Array} Top interests with time metrics
 */
export async function getTopInterests(studentId, count = 5) {
  try {
    const { interests } = await getStudentInterests(studentId);

    // Prioritize by engagement score (time + interest + accuracy)
    const prioritized = interests
      .sort((a, b) => {
        // Primary: Engagement score
        const engagementA = a.engagementScore || calculateComprehensiveEngagementScore(a);
        const engagementB = b.engagementScore || calculateComprehensiveEngagementScore(b);
        if (engagementB !== engagementA) return engagementB - engagementA;
        
        // Secondary: Performance score (time + accuracy)
        const perfA = a.timeAnalysis?.performanceScore || 0;
        const perfB = b.timeAnalysis?.performanceScore || 0;
        if (perfB !== perfA) return perfB - perfA;
        
        // Tertiary: Interest score
        return b.interest_score - a.interest_score;
      })
      .slice(0, count);

    return {
      success: true,
      topInterests: prioritized.map(interest => ({
        subjectId: interest.subject_id,
        subjectName: interest.subjects.name_ar || interest.subjects.name_en,
        interestScore: interest.interest_score,
        engagementScore: interest.engagementScore || calculateComprehensiveEngagementScore(interest),
        timeAnalysis: interest.timeAnalysis,
        performanceScore: interest.timeAnalysis?.performanceScore || 0,
        recommendations: interest.recommendations,
        examMetrics: interest.examMetrics
      }))
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
 * Compare subject interests with time-based metrics
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Comparison with time analysis
 */
export async function compareSubjectInterests(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    if (!interests || interests.length === 0) {
      return {
        success: true,
        comparison: [],
        insights: ['Complete comprehensive exams to generate comparisons']
      };
    }

    // Enhanced comparison with time metrics
    const comparison = interests.map(interest => {
      const engagementScore = calculateComprehensiveEngagementScore(interest);
      const timeAnalysis = analyzeComprehensiveResponseTime(
        interest.avg_time_per_question, 
        interest.completion_rate
      );
      
      return {
        subjectId: interest.subject_id,
        subjectName: interest.subjects.name_ar || interest.subjects.name_en,
        category: interest.subjects.category,
        interestScore: interest.interest_score,
        engagementScore,
        performanceScore: timeAnalysis.performanceScore,
        timeEfficiency: timeAnalysis.timeEfficiency,
        timeCategory: timeAnalysis.category,
        accuracy: interest.completion_rate,
        questionsAttempted: interest.questions_attempted,
        relativeStrength: calculateRelativeStrength(interest, interests),
        timeBasedInsights: generateTimeBasedInsights(interest, timeAnalysis)
      };
    });

    // Sort by engagement score
    comparison.sort((a, b) => b.engagementScore - a.engagementScore);

    // Generate comparative insights
    const insights = generateComparativeTimeInsights(comparison);

    return {
      success: true,
      comparison,
      insights,
      timeAnalysisSummary: generateTimeAnalysisSummary(comparison)
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
 * Calculate relative strength compared to other subjects
 */
function calculateRelativeStrength(subjectInterest, allInterests) {
  const subjectScore = calculateComprehensiveEngagementScore(subjectInterest);
  const avgScore = allInterests.reduce((sum, i) => 
    sum + calculateComprehensiveEngagementScore(i), 0
  ) / allInterests.length;
  
  return subjectScore / avgScore;
}

/**
 * Generate time-based insights for a subject
 */
function generateTimeBasedInsights(interest, timeAnalysis) {
  const insights = [];
  
  if (timeAnalysis.category === 'very_fast') {
    if (interest.completion_rate > 75) {
      insights.push('Exceptional speed and accuracy combination');
    } else {
      insights.push('Fast responses but accuracy needs attention');
    }
  }
  
  if (timeAnalysis.category === 'optimal') {
    insights.push('Excellent time management skills');
  }
  
  if (timeAnalysis.category === 'slow') {
    insights.push('Response time is affecting overall performance');
  }
  
  if (timeAnalysis.timeEfficiency >= 80) {
    insights.push('Highly efficient use of time');
  }
  
  if (timeAnalysis.performanceScore >= 75) {
    insights.push('Strong overall performance');
  }
  
  if (interest.completion_rate < 60) {
    insights.push('Accuracy is a primary area for improvement');
  }
  
  return insights;
}

/**
 * Generate comparative time insights across subjects
 */
function generateComparativeTimeInsights(comparison) {
  if (comparison.length < 2) return [];
  
  const insights = [];
  
  // Find best and worst performers
  const best = comparison[0];
  const worst = comparison[comparison.length - 1];
  
  // Time efficiency comparison
  const avgTimeEfficiency = comparison.reduce((sum, c) => sum + c.timeEfficiency, 0) / comparison.length;
  const timeEfficientSubjects = comparison.filter(c => c.timeEfficiency >= 80);
  const timeInefficientSubjects = comparison.filter(c => c.timeEfficiency < 60);
  
  if (timeEfficientSubjects.length > timeInefficientSubjects.length) {
    insights.push('Generally good time management across subjects');
  } else if (timeInefficientSubjects.length > timeEfficientSubjects.length) {
    insights.push('Time management needs improvement across multiple subjects');
  }
  
  // Performance patterns
  const highPerformingSubjects = comparison.filter(c => c.performanceScore >= 70);
  const lowPerformingSubjects = comparison.filter(c => c.performanceScore < 50);
  
  if (highPerformingSubjects.length >= comparison.length * 0.5) {
    insights.push('Strong overall performance across subjects');
  }
  
  if (lowPerformingSubjects.length >= comparison.length * 0.3) {
    insights.push('Several subjects show room for improvement');
  }
  
  // Time category distribution
  const timeCategories = {};
  comparison.forEach(c => {
    timeCategories[c.timeCategory] = (timeCategories[c.timeCategory] || 0) + 1;
  });
  
  if (timeCategories['very_fast'] >= comparison.length * 0.3) {
    insights.push('Many subjects show quick response patterns');
  }
  
  if (timeCategories['slow'] >= comparison.length * 0.3) {
    insights.push('Multiple subjects show slow response patterns');
  }
  
  return insights;
}

/**
 * Generate time analysis summary
 */
function generateTimeAnalysisSummary(comparison) {
  if (comparison.length === 0) return null;
  
  const avgTimeEfficiency = comparison.reduce((sum, c) => sum + c.timeEfficiency, 0) / comparison.length;
  const avgPerformance = comparison.reduce((sum, c) => sum + c.performanceScore, 0) / comparison.length;
  const avgAccuracy = comparison.reduce((sum, c) => sum + c.accuracy, 0) / comparison.length;
  
  // Time category distribution
  const categories = {};
  comparison.forEach(c => {
    categories[c.timeCategory] = (categories[c.timeCategory] || 0) + 1;
  });
  
  return {
    avgTimeEfficiency: Math.round(avgTimeEfficiency),
    avgPerformance: Math.round(avgPerformance),
    avgAccuracy: Math.round(avgAccuracy),
    categoryDistribution: categories,
    efficiencyRating: avgTimeEfficiency >= 75 ? 'high' : avgTimeEfficiency >= 60 ? 'moderate' : 'low',
    performanceRating: avgPerformance >= 70 ? 'strong' : avgPerformance >= 50 ? 'average' : 'needs_improvement'
  };
}

/**
 * Get interest statistics with time-based analysis
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Statistics with time metrics
 */
export async function getInterestStatistics(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    if (!interests || interests.length === 0) {
      return {
        success: true,
        stats: {
          message: 'Complete comprehensive exams to generate statistics',
          examBased: true
        }
      };
    }

    const avgInterest = interests.reduce((sum, i) => sum + i.interest_score, 0) / interests.length;
    const avgEngagement = interests.reduce((sum, i) => 
      sum + (i.engagementScore || calculateComprehensiveEngagementScore(i)), 0) / interests.length;
    
    const totalTime = interests.reduce((sum, i) => sum + i.time_spent_seconds, 0);
    const totalQuestions = interests.reduce((sum, i) => sum + i.questions_attempted, 0);
    const avgTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;
    
    // Time pattern analysis
    const timePatterns = analyzeTimePatterns(interests);

    const stats = {
      averageInterest: Math.round(avgInterest),
      averageEngagement: Math.round(avgEngagement),
      timeAnalysis: {
        averageTimePerQuestion: Math.round(avgTimePerQuestion),
        totalEngagementTime: Math.round(totalTime / 60), // minutes
        timeEfficiency: Math.round(calculateTimeEfficiency(avgTimePerQuestion) * 100),
        patternDistribution: timePatterns,
        optimalSubjects: countOptimalSubjects(interests)
      },
      performanceMetrics: {
        highInterestCount: interests.filter(i => i.interest_score >= 70).length,
        highEngagementCount: interests.filter(i => 
          (i.engagementScore || calculateComprehensiveEngagementScore(i)) >= 70
        ).length,
        efficientSubjects: interests.filter(i => {
          const analysis = analyzeComprehensiveResponseTime(i.avg_time_per_question, i.completion_rate);
          return analysis.timeEfficiency >= 75;
        }).length
      },
      byCategory: calculateCategoryInterests(interests),
      examBased: true,
      dataQuality: calculateDataQuality(interests),
      improvementOpportunities: identifyImprovementOpportunities(interests)
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
 * Analyze time patterns across subjects
 */
function analyzeTimePatterns(interests) {
  const patterns = {
    very_fast: { count: 0, avgAccuracy: 0 },
    optimal: { count: 0, avgAccuracy: 0 },
    moderate: { count: 0, avgAccuracy: 0 },
    slow: { count: 0, avgAccuracy: 0 },
    timeout_risk: { count: 0, avgAccuracy: 0 }
  };
  
  interests.forEach(interest => {
    const analysis = analyzeComprehensiveResponseTime(interest.avg_time_per_question, interest.completion_rate);
    patterns[analysis.category].count++;
    patterns[analysis.category].avgAccuracy += interest.completion_rate || 0;
  });
  
  // Calculate average accuracy for each pattern
  Object.keys(patterns).forEach(key => {
    if (patterns[key].count > 0) {
      patterns[key].avgAccuracy = Math.round(patterns[key].avgAccuracy / patterns[key].count);
    }
  });
  
  return patterns;
}

/**
 * Count subjects with optimal time patterns
 */
function countOptimalSubjects(interests) {
  return interests.filter(interest => {
    const analysis = analyzeComprehensiveResponseTime(interest.avg_time_per_question, interest.completion_rate);
    return analysis.category === 'optimal' || 
           (analysis.category === 'very_fast' && (interest.completion_rate || 0) > 70);
  }).length;
}

/**
 * Calculate data quality score
 */
function calculateDataQuality(interests) {
  if (interests.length === 0) return 0;
  
  const qualityFactors = interests.map(interest => {
    let score = 0;
    
    // Sufficient questions attempted
    if (interest.questions_attempted >= 5) score += 1;
    else if (interest.questions_attempted >= 2) score += 0.5;
    
    // Reliable time data
    if (interest.avg_time_per_question && interest.avg_time_per_question > 0) score += 1;
    
    // Multiple exams
    if (interest.metadata?.totalExams > 1) score += 1;
    
    // Recent data
    const lastUpdated = new Date(interest.last_updated);
    const daysAgo = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) score += 1;
    
    return score;
  });
  
  const totalScore = qualityFactors.reduce((sum, score) => sum + score, 0);
  const maxPossible = interests.length * 4;
  
  return Math.round((totalScore / maxPossible) * 100);
}

/**
 * Identify improvement opportunities
 */
function identifyImprovementOpportunities(interests) {
  const opportunities = [];
  
  const slowSubjects = interests.filter(interest => {
    const analysis = analyzeComprehensiveResponseTime(interest.avg_time_per_question, interest.completion_rate);
    return analysis.category === 'slow' || analysis.category === 'timeout_risk';
  });
  
  if (slowSubjects.length > interests.length * 0.3) {
    opportunities.push({
      area: 'time_management',
      priority: 'high',
      description: `${slowSubjects.length} subjects show slow response times`,
      action: 'Implement timed practice across all subjects'
    });
  }
  
  const lowAccuracySubjects = interests.filter(interest => (interest.completion_rate || 0) < 60);
  if (lowAccuracySubjects.length > interests.length * 0.3) {
    opportunities.push({
      area: 'accuracy',
      priority: 'high',
      description: `${lowAccuracySubjects.length} subjects have accuracy below 60%`,
      action: 'Focus on understanding concepts before speed'
    });
  }
  
  const lowEngagementSubjects = interests.filter(interest => 
    (interest.interest_score || 0) < 40
  );
  if (lowEngagementSubjects.length > 0) {
    opportunities.push({
      area: 'engagement',
      priority: 'medium',
      description: `${lowEngagementSubjects.length} subjects show low interest`,
      action: 'Explore different learning approaches for these subjects'
    });
  }
  
  return opportunities;
}

/**
 * Get engagement patterns with detailed time analysis
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID (optional)
 * @returns {Object} Engagement patterns with time metrics
 */
export async function getEngagementPatterns(studentId, subjectId = null) {
  try {
    // Get comprehensive exam responses with time data
    let query = supabase
      .from('student_responses')
      .select(`
        *,
        questions(subject_id, subjects(name_en, name_ar, name_he)),
        test_sessions(session_type, metadata)
      `)
      .eq('student_id', studentId)
      .eq('test_sessions.session_type', 'comprehensive_assessment')
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
          recommendation: 'Complete comprehensive exams to analyze engagement patterns'
        }
      };
    }

    // Advanced time analysis
    const timeAnalysis = analyzeResponseTimePatterns(responses);
    const examAnalysis = analyzeExamPatterns(responses);
    const progressAnalysis = analyzeProgressOverTime(responses);

    const patterns = {
      timeAnalysis,
      examAnalysis,
      progressAnalysis,
      recommendations: generateEngagementRecommendations(timeAnalysis, examAnalysis)
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
 * Analyze response time patterns from raw data
 */
function analyzeResponseTimePatterns(responses) {
  const times = responses.map(r => r.time_taken_seconds);
  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
  
  // Time distribution
  const distribution = {
    under_30: times.filter(t => t < 30).length,
    thirty_to_45: times.filter(t => t >= 30 && t < 45).length,
    fortyfive_to_60: times.filter(t => t >= 45 && t < 60).length,
    sixty_to_90: times.filter(t => t >= 60 && t < 90).length,
    over_90: times.filter(t => t >= 90).length
  };
  
  // Time consistency
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const consistency = avgTime > 0 ? Math.max(0, 100 - (stdDev / avgTime) * 100) : 0;
  
  // Accuracy by time range
  const accuracyByTime = {};
  responses.forEach(r => {
    const timeRange = r.time_taken_seconds < 30 ? 'fast' : 
                     r.time_taken_seconds < 60 ? 'moderate' : 'slow';
    if (!accuracyByTime[timeRange]) {
      accuracyByTime[timeRange] = { correct: 0, total: 0 };
    }
    accuracyByTime[timeRange].total++;
    if (r.is_correct) accuracyByTime[timeRange].correct++;
  });
  
  return {
    avgTime: Math.round(avgTime),
    consistency: Math.round(consistency),
    distribution,
    accuracyByTime,
    timeEfficiency: calculateTimeEfficiency(avgTime) * 100
  };
}

/**
 * Analyze exam patterns
 */
function analyzeExamPatterns(responses) {
  const examMap = {};
  
  responses.forEach(response => {
    const sessionId = response.session_id;
    if (!examMap[sessionId]) {
      examMap[sessionId] = {
        responses: [],
        startTime: response.created_at
      };
    }
    examMap[sessionId].responses.push(response);
  });
  
  const exams = Object.values(examMap).map(exam => {
    const times = exam.responses.map(r => r.time_taken_seconds);
    const correct = exam.responses.filter(r => r.is_correct).length;
    const total = exam.responses.length;
    
    return {
      avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
      accuracy: total > 0 ? (correct / total) * 100 : 0,
      totalQuestions: total,
      correctAnswers: correct,
      timeConsistency: calculateTimeConsistencyForExam(exam.responses)
    };
  });
  
  return {
    totalExams: exams.length,
    avgAccuracy: exams.reduce((sum, e) => sum + e.accuracy, 0) / exams.length,
    avgTime: exams.reduce((sum, e) => sum + e.avgTime, 0) / exams.length,
    improvement: exams.length > 1 ? {
      time: ((exams[0].avgTime - exams[exams.length - 1].avgTime) / exams[0].avgTime) * 100,
      accuracy: exams[exams.length - 1].accuracy - exams[0].accuracy
    } : null
  };
}

/**
 * Analyze progress over time
 */
function analyzeProgressOverTime(responses) {
  if (responses.length < 10) {
    return { trend: 'insufficient_data' };
  }
  
  const sorted = [...responses].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const chunkSize = Math.max(5, Math.floor(responses.length / 4));
  const chunks = [];
  
  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    if (chunk.length >= 3) {
      chunks.push(chunk);
    }
  }
  
  if (chunks.length < 2) {
    return { trend: 'insufficient_data' };
  }
  
  const firstChunk = chunks[0];
  const lastChunk = chunks[chunks.length - 1];
  
  const firstAvgTime = firstChunk.reduce((sum, r) => sum + r.time_taken_seconds, 0) / firstChunk.length;
  const lastAvgTime = lastChunk.reduce((sum, r) => sum + r.time_taken_seconds, 0) / lastChunk.length;
  const firstAccuracy = (firstChunk.filter(r => r.is_correct).length / firstChunk.length) * 100;
  const lastAccuracy = (lastChunk.filter(r => r.is_correct).length / lastChunk.length) * 100;
  
  const timeImprovement = ((firstAvgTime - lastAvgTime) / firstAvgTime) * 100;
  const accuracyImprovement = lastAccuracy - firstAccuracy;
  
  let trend, efficiencyImprovement;
  
  if (timeImprovement > 10 && accuracyImprovement > 5) {
    trend = 'excellent_progress';
    efficiencyImprovement = 'significant';
  } else if (timeImprovement > 5 || accuracyImprovement > 3) {
    trend = 'good_progress';
    efficiencyImprovement = 'moderate';
  } else if (timeImprovement > -5 && accuracyImprovement > -3) {
    trend = 'stable';
    efficiencyImprovement = 'minimal';
  } else {
    trend = 'needs_attention';
    efficiencyImprovement = 'declining';
  }
  
  return {
    trend,
    timeImprovement: Math.round(timeImprovement),
    accuracyImprovement: Math.round(accuracyImprovement),
    efficiencyImprovement,
    totalChunks: chunks.length,
    timePerChunk: Math.round((lastChunk[0].created_at - firstChunk[0].created_at) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Calculate time consistency for an exam
 */
function calculateTimeConsistencyForExam(responses) {
  const times = responses.map(r => r.time_taken_seconds);
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  return avg > 0 ? Math.max(0, 100 - (stdDev / avg) * 100) : 0;
}

/**
 * Generate engagement recommendations
 */
function generateEngagementRecommendations(timeAnalysis, examAnalysis) {
  const recommendations = [];
  
  if (timeAnalysis.avgTime > TIME_ANALYSIS_CONFIG.SLOW_THRESHOLD) {
    recommendations.push({
      type: 'time_management',
      priority: 'high',
      description: `Average response time is ${Math.round(timeAnalysis.avgTime)}s. Aim for under ${TIME_ANALYSIS_CONFIG.SLOW_THRESHOLD}s.`,
      action: 'Practice with strict time limits'
    });
  }
  
  if (timeAnalysis.consistency < 70) {
    recommendations.push({
      type: 'consistency',
      priority: 'medium',
      description: 'Response times vary significantly. Work on consistent pacing.',
      action: 'Use a timer to maintain steady pace'
    });
  }
  
  if (examAnalysis.improvement?.accuracy < 0) {
    recommendations.push({
      type: 'accuracy_trend',
      priority: 'high',
      description: 'Accuracy has declined in recent exams.',
      action: 'Review incorrect answers and focus on understanding'
    });
  }
  
  if (timeAnalysis.accuracyByTime?.fast?.total > 0 && 
      (timeAnalysis.accuracyByTime.fast.correct / timeAnalysis.accuracyByTime.fast.total) < 0.6) {
    recommendations.push({
      type: 'fast_accuracy',
      priority: 'medium',
      description: 'Fast responses have lower accuracy.',
      action: 'Slow down slightly to improve accuracy on quick questions'
    });
  }
  
  return recommendations;
}

/**
 * Get interest radar data with time metrics
 */
export async function getInterestRadarData(studentId) {
  try {
    const { interests } = await getStudentInterests(studentId);

    const radarData = interests.map(interest => {
      const timeAnalysis = analyzeComprehensiveResponseTime(interest.avg_time_per_question, interest.completion_rate);
      
      return {
        subject: interest.subjects.name_en,
        subjectAr: interest.subjects.name_ar,
        subjectHe: interest.subjects.name_he,
        interestScore: interest.interest_score,
        performanceScore: timeAnalysis.performanceScore,
        timeEfficiency: timeAnalysis.timeEfficiency,
        accuracy: interest.completion_rate,
        engagementScore: interest.engagementScore || calculateComprehensiveEngagementScore(interest),
        timeCategory: timeAnalysis.category
      };
    });

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
 * Track interest evolution with time metrics
 */
export async function trackInterestEvolution(studentId, subjectId) {
  try {
    const { data: sessions } = await supabase
      .from('test_sessions')
      .select('id, completed_at, metadata, total_time_seconds, questions_answered')
      .eq('student_id', studentId)
      .eq('session_type', 'comprehensive_assessment')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        evolution: {
          trend: 'no_data',
          recommendation: 'Complete comprehensive exams to track evolution'
        }
      };
    }

    const evolutionData = sessions.map(session => {
      if (session.metadata?.results) {
        const subjectResult = session.metadata.results.find(r => r.subjectId === subjectId);
        if (subjectResult) {
          const timePerQuestion = session.total_time_seconds / subjectResult.questionsAnswered;
          const timeAnalysis = analyzeComprehensiveResponseTime(timePerQuestion, subjectResult.accuracy);
          
          return {
            date: session.completed_at,
            examId: session.id,
            abilityScore: subjectResult.abilityScore,
            accuracy: subjectResult.accuracy,
            questionsAnswered: subjectResult.questionsAnswered,
            timePerQuestion,
            timeEfficiency: timeAnalysis.timeEfficiency,
            performanceScore: timeAnalysis.performanceScore,
            estimatedInterest: estimateInterestFromPerformance(subjectResult, timePerQuestion)
          };
        }
      }
      return null;
    }).filter(item => item !== null);

    if (evolutionData.length < 2) {
      return {
        success: true,
        evolution: {
          trend: 'insufficient_data',
          dataPoints: evolutionData
        }
      };
    }

    // Calculate evolution trends
    const first = evolutionData[0];
    const last = evolutionData[evolutionData.length - 1];
    
    const interestChange = last.estimatedInterest - first.estimatedInterest;
    const timeChange = ((first.timePerQuestion - last.timePerQuestion) / first.timePerQuestion) * 100;
    const accuracyChange = last.accuracy - first.accuracy;
    
    let trend, summary;
    
    if (interestChange > 10 && timeChange > 5 && accuracyChange > 3) {
      trend = 'excellent_growth';
      summary = 'Strong improvement in interest, time management, and accuracy';
    } else if (interestChange > 5) {
      trend = 'steady_growth';
      summary = 'Steady improvement in interest and performance';
    } else if (interestChange > -5) {
      trend = 'stable';
      summary = 'Interest and performance remain stable';
    } else {
      trend = 'declining';
      summary = 'Interest and performance have declined';
    }

    return {
      success: true,
      evolution: {
        trend,
        summary,
        interestChange: Math.round(interestChange),
        timeImprovement: Math.round(timeChange),
        accuracyImprovement: Math.round(accuracyChange),
        assessmentCount: evolutionData.length,
        dataPoints: evolutionData,
        currentMetrics: {
          interest: Math.round(last.estimatedInterest),
          timeEfficiency: last.timeEfficiency,
          performanceScore: last.performanceScore
        }
      }
    };
  } catch (error) {
    console.error('Error tracking interest evolution:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Estimate interest from performance metrics
 */
function estimateInterestFromPerformance(result, timePerQuestion) {
  // Weighted factors for interest estimation
  const weights = {
    ability: 0.3,
    accuracy: 0.3,
    timeEfficiency: 0.25,
    consistency: 0.15
  };
  
  const abilityScore = result.abilityScore;
  const accuracy = result.accuracy;
  const timeEfficiency = Math.max(0, 100 - ((timePerQuestion - TIME_ANALYSIS_CONFIG.OPTIMAL_TIME) / 30) * 100);
  
  // Simple consistency estimate (assuming recent exams show consistency)
  const consistency = 70; // Base consistency
  
  return (abilityScore * weights.ability) +
         (accuracy * weights.accuracy) +
         (timeEfficiency * weights.timeEfficiency) +
         (consistency * weights.consistency);
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
