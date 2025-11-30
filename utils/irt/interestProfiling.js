/**
 * INTEREST PROFILING - Content-Based Filtering
 * 
 * This module implements interest discovery and tracking
 * using behavioral indicators and engagement metrics.
 * 
 * Key metrics:
 * - Time spent on questions
 * - Voluntary attempts
 * - Completion rate
 * - Engagement patterns
 */

/**
 * Calculate interest score based on engagement metrics
 * 
 * @param {Object} metrics - Engagement metrics
 * @returns {number} Interest score (0-100)
 */
export function calculateInterestScore(metrics) {
  const {
    timeSpent = 0,              // Total time spent (seconds)
    questionsAttempted = 0,     // Number of questions attempted
    voluntaryAttempts = 0,      // Questions attempted beyond required
    completionRate = 0,         // Percentage of questions completed
    avgTimePerQuestion = 0,     // Average time per question
    correctAnswers = 0,         // Number correct (engagement indicator)
    totalQuestions = 1          // Total questions available
  } = metrics;
  
  // Normalize metrics to 0-1 scale
  
  // 1. Attempt rate (30% weight)
  const attemptRate = Math.min(1, questionsAttempted / Math.max(1, totalQuestions));
  const attemptScore = attemptRate * 30;
  
  // 2. Completion rate (25% weight)
  const completionScore = (completionRate / 100) * 25;
  
  // 3. Time engagement (20% weight)
  // Optimal time: 30-90 seconds per question
  const optimalTime = 60;
  const timeDeviation = Math.abs(avgTimePerQuestion - optimalTime) / optimalTime;
  const timeScore = Math.max(0, (1 - timeDeviation)) * 20;
  
  // 4. Voluntary engagement (15% weight)
  const voluntaryScore = Math.min(1, voluntaryAttempts / 3) * 15;
  
  // 5. Success rate (10% weight) - some success indicates engagement
  const successRate = questionsAttempted > 0 ? correctAnswers / questionsAttempted : 0;
  const successScore = successRate * 10;
  
  // Total interest score
  const interestScore = attemptScore + completionScore + timeScore + voluntaryScore + successScore;
  
  return Math.max(0, Math.min(100, interestScore));
}

/**
 * Update interest profile after each interaction
 * 
 * @param {Object} currentProfile - Current interest profile
 * @param {Object} interaction - New interaction data
 * @returns {Object} Updated interest profile
 */
export function updateInterestProfile(currentProfile, interaction) {
  const {
    subjectId,
    timeTaken,
    isCorrect,
    isVoluntary = false,
    completed = true
  } = interaction;
  
  // Initialize profile if doesn't exist
  const profile = currentProfile || {
    subjectId,
    timeSpent: 0,
    questionsAttempted: 0,
    voluntaryAttempts: 0,
    completedQuestions: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    interactions: []
  };
  
  // Update metrics
  const updated = {
    ...profile,
    timeSpent: profile.timeSpent + timeTaken,
    questionsAttempted: profile.questionsAttempted + 1,
    voluntaryAttempts: profile.voluntaryAttempts + (isVoluntary ? 1 : 0),
    completedQuestions: profile.completedQuestions + (completed ? 1 : 0),
    correctAnswers: profile.correctAnswers + (isCorrect ? 1 : 0),
    interactions: [...profile.interactions, {
      timestamp: new Date(),
      timeTaken,
      isCorrect,
      isVoluntary,
      completed
    }]
  };
  
  // Calculate derived metrics
  updated.avgTimePerQuestion = updated.timeSpent / updated.questionsAttempted;
  updated.completionRate = (updated.completedQuestions / updated.questionsAttempted) * 100;
  updated.accuracy = (updated.correctAnswers / updated.questionsAttempted) * 100;
  
  // Calculate interest score
  updated.interestScore = calculateInterestScore({
    timeSpent: updated.timeSpent,
    questionsAttempted: updated.questionsAttempted,
    voluntaryAttempts: updated.voluntaryAttempts,
    completionRate: updated.completionRate,
    avgTimePerQuestion: updated.avgTimePerQuestion,
    correctAnswers: updated.correctAnswers,
    totalQuestions: updated.totalQuestions || updated.questionsAttempted
  });
  
  return updated;
}

/**
 * Discover interests from initial diverse question set
 * 
 * @param {Array} responses - Responses to diverse questions
 * @returns {Array} Ranked subjects by interest
 */
export function discoverInterests(responses) {
  // Group responses by subject
  const subjectGroups = {};
  
  for (const response of responses) {
    const subjectId = response.subjectId || response.subject_id;
    
    if (!subjectGroups[subjectId]) {
      subjectGroups[subjectId] = {
        subjectId,
        responses: [],
        totalTime: 0,
        correctCount: 0
      };
    }
    
    subjectGroups[subjectId].responses.push(response);
    subjectGroups[subjectId].totalTime += response.timeTaken || response.time_taken_seconds || 0;
    subjectGroups[subjectId].correctCount += response.isCorrect || response.is_correct ? 1 : 0;
  }
  
  // Calculate interest score for each subject
  const subjectInterests = Object.values(subjectGroups).map(group => {
    const avgTime = group.totalTime / group.responses.length;
    const accuracy = (group.correctCount / group.responses.length) * 100;
    
    const interestScore = calculateInterestScore({
      timeSpent: group.totalTime,
      questionsAttempted: group.responses.length,
      voluntaryAttempts: 0,
      completionRate: 100, // All completed in discovery phase
      avgTimePerQuestion: avgTime,
      correctAnswers: group.correctCount,
      totalQuestions: group.responses.length
    });
    
    return {
      subjectId: group.subjectId,
      interestScore,
      questionsAttempted: group.responses.length,
      avgTime,
      accuracy
    };
  });
  
  // Sort by interest score (descending)
  subjectInterests.sort((a, b) => b.interestScore - a.interestScore);
  
  return subjectInterests;
}

/**
 * Classify interest level
 * 
 * @param {number} interestScore - Interest score (0-100)
 * @returns {string} Interest level classification
 */
export function classifyInterestLevel(interestScore) {
  if (interestScore >= 80) return 'very_high';
  if (interestScore >= 60) return 'high';
  if (interestScore >= 40) return 'medium';
  if (interestScore >= 20) return 'low';
  return 'very_low';
}

/**
 * Detect engagement patterns
 * 
 * @param {Array} interactions - Interaction history
 * @returns {Object} Engagement patterns
 */
export function detectEngagementPatterns(interactions) {
  if (!interactions || interactions.length < 3) {
    return {
      trend: 'insufficient_data',
      consistency: 0,
      peakEngagement: null
    };
  }
  
  // Calculate trend (increasing, decreasing, stable)
  const recentInteractions = interactions.slice(-5);
  const timeTrend = recentInteractions.map(i => i.timeTaken);
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 1; i < timeTrend.length; i++) {
    if (timeTrend[i] > timeTrend[i - 1]) increasing++;
    if (timeTrend[i] < timeTrend[i - 1]) decreasing++;
  }
  
  let trend;
  if (increasing > decreasing + 1) {
    trend = 'increasing'; // Spending more time = higher engagement
  } else if (decreasing > increasing + 1) {
    trend = 'decreasing'; // Rushing through = lower engagement
  } else {
    trend = 'stable';
  }
  
  // Calculate consistency (standard deviation of time)
  const avgTime = timeTrend.reduce((sum, t) => sum + t, 0) / timeTrend.length;
  const variance = timeTrend.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / timeTrend.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev / avgTime) * 100);
  
  // Find peak engagement time
  const maxTime = Math.max(...timeTrend);
  const peakIndex = timeTrend.indexOf(maxTime);
  const peakEngagement = recentInteractions[peakIndex];
  
  return {
    trend,
    consistency,
    peakEngagement,
    avgTime,
    stdDev
  };
}

/**
 * Predict future interest based on current trajectory
 * 
 * @param {Object} interestProfile - Current interest profile
 * @returns {Object} Interest prediction
 */
export function predictFutureInterest(interestProfile) {
  const { interactions, interestScore } = interestProfile;
  
  if (!interactions || interactions.length < 5) {
    return {
      predictedScore: interestScore,
      confidence: 'low',
      recommendation: 'gather_more_data'
    };
  }
  
  const patterns = detectEngagementPatterns(interactions);
  
  let predictedScore = interestScore;
  let recommendation;
  
  if (patterns.trend === 'increasing') {
    predictedScore = Math.min(100, interestScore + 10);
    recommendation = 'high_potential';
  } else if (patterns.trend === 'decreasing') {
    predictedScore = Math.max(0, interestScore - 10);
    recommendation = 'needs_motivation';
  } else {
    recommendation = 'maintain_engagement';
  }
  
  const confidence = patterns.consistency > 70 ? 'high' : 
                    patterns.consistency > 40 ? 'medium' : 'low';
  
  return {
    predictedScore,
    confidence,
    recommendation,
    trend: patterns.trend
  };
}

/**
 * Compare interests across multiple subjects
 * 
 * @param {Object} interestProfiles - Interest profiles for all subjects
 * @returns {Array} Comparative analysis
 */
export function compareInterests(interestProfiles) {
  const subjects = Object.entries(interestProfiles).map(([subjectId, profile]) => ({
    subjectId,
    interestScore: profile.interestScore || 0,
    questionsAttempted: profile.questionsAttempted || 0,
    avgTime: profile.avgTimePerQuestion || 0,
    accuracy: profile.accuracy || 0
  }));
  
  // Sort by interest score
  subjects.sort((a, b) => b.interestScore - a.interestScore);
  
  // Calculate percentile ranks
  subjects.forEach((subject, index) => {
    subject.rank = index + 1;
    subject.percentile = ((subjects.length - index) / subjects.length) * 100;
  });
  
  // Identify top interests (top 30%)
  const topThreshold = Math.ceil(subjects.length * 0.3);
  subjects.forEach(subject => {
    subject.isTopInterest = subject.rank <= topThreshold;
  });
  
  return subjects;
}

/**
 * Generate interest-based recommendations
 * 
 * @param {Array} rankedInterests - Ranked interest profiles
 * @param {number} count - Number of recommendations
 * @returns {Array} Recommended subjects
 */
export function generateInterestRecommendations(rankedInterests, count = 3) {
  // Filter subjects with sufficient data
  const validSubjects = rankedInterests.filter(
    s => s.questionsAttempted >= 2 && s.interestScore > 30
  );
  
  if (validSubjects.length === 0) {
    return [];
  }
  
  // Take top N by interest score
  const recommendations = validSubjects.slice(0, count).map((subject, index) => ({
    subjectId: subject.subjectId,
    rank: index + 1,
    interestScore: subject.interestScore,
    interestLevel: classifyInterestLevel(subject.interestScore),
    reason: generateRecommendationReason(subject),
    confidence: subject.questionsAttempted >= 5 ? 'high' : 'medium'
  }));
  
  return recommendations;
}

/**
 * Generate human-readable reason for recommendation
 * 
 * @param {Object} subject - Subject data
 * @returns {Object} Reasons in multiple languages
 */
function generateRecommendationReason(subject) {
  const { interestScore, avgTime, accuracy } = subject;
  
  let reasonKey;
  
  if (interestScore >= 80 && accuracy >= 70) {
    reasonKey = 'high_interest_high_performance';
  } else if (interestScore >= 80) {
    reasonKey = 'high_interest_developing_skills';
  } else if (interestScore >= 60 && avgTime > 60) {
    reasonKey = 'engaged_thoughtful';
  } else if (interestScore >= 60) {
    reasonKey = 'consistent_interest';
  } else {
    reasonKey = 'moderate_interest';
  }
  
  const reasons = {
    high_interest_high_performance: {
      en: 'You show strong interest and excellent performance in this subject',
      ar: 'تظهر اهتمامًا قويًا وأداءً ممتازًا في هذا الموضوع',
      he: 'אתה מראה עניין חזק וביצועים מצוינים בנושא זה'
    },
    high_interest_developing_skills: {
      en: 'You are highly engaged and developing your skills in this area',
      ar: 'أنت منخرط بشكل كبير وتطور مهاراتك في هذا المجال',
      he: 'אתה מעורב מאוד ומפתח את כישוריך בתחום זה'
    },
    engaged_thoughtful: {
      en: 'You take time to think deeply about this subject',
      ar: 'تأخذ وقتًا للتفكير بعمق في هذا الموضوع',
      he: 'אתה לוקח זמן לחשוב בעומק על הנושא הזה'
    },
    consistent_interest: {
      en: 'You show consistent interest in this subject',
      ar: 'تظهر اهتمامًا ثابتًا بهذا الموضوع',
      he: 'אתה מראה עניין עקבי בנושא זה'
    },
    moderate_interest: {
      en: 'This subject aligns with your interests',
      ar: 'هذا الموضوع يتماشى مع اهتماماتك',
      he: 'נושא זה מתאים לתחומי העניין שלך'
    }
  };
  
  return reasons[reasonKey];
}

/**
 * Track interest evolution over time
 * 
 * @param {Array} historicalProfiles - Interest profiles over time
 * @returns {Object} Evolution analysis
 */
export function trackInterestEvolution(historicalProfiles) {
  if (!historicalProfiles || historicalProfiles.length < 2) {
    return {
      trend: 'insufficient_data',
      change: 0
    };
  }
  
  const first = historicalProfiles[0];
  const last = historicalProfiles[historicalProfiles.length - 1];
  
  const change = last.interestScore - first.interestScore;
  const percentChange = (change / first.interestScore) * 100;
  
  let trend;
  if (percentChange > 20) trend = 'strongly_increasing';
  else if (percentChange > 5) trend = 'increasing';
  else if (percentChange < -20) trend = 'strongly_decreasing';
  else if (percentChange < -5) trend = 'decreasing';
  else trend = 'stable';
  
  return {
    trend,
    change,
    percentChange,
    initialScore: first.interestScore,
    currentScore: last.interestScore
  };
}

// Export all functions
export default {
  calculateInterestScore,
  updateInterestProfile,
  discoverInterests,
  classifyInterestLevel,
  detectEngagementPatterns,
  predictFutureInterest,
  compareInterests,
  generateInterestRecommendations,
  trackInterestEvolution
};
