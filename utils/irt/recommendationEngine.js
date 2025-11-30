/**
 * RECOMMENDATION ENGINE - Multi-Armed Bandit Algorithm
 * 
 * This module implements the recommendation system that combines:
 * - Student ability (exploitation)
 * - Student interest (exploration)
 * - Learning potential (growth trajectory)
 * 
 * Uses Upper Confidence Bound (UCB) variant for explore/exploit trade-off
 */

/**
 * Calculate recommendation score using Multi-Armed Bandit (UCB)
 * 
 * @param {Object} subjectData - Subject data for a student
 * @param {Object} options - Algorithm options
 * @returns {number} Recommendation score
 */
export function calculateRecommendationScore(subjectData, options = {}) {
  const {
    explorationWeight = 0.3,    // Weight for exploration (0-1)
    abilityWeight = 0.4,         // Weight for ability
    interestWeight = 0.3,        // Weight for interest
    potentialWeight = 0.3,       // Weight for growth potential
    uncertaintyBonus = true      // Add bonus for uncertain estimates
  } = options;
  
  const {
    abilityScore = 50,           // 0-100
    interestScore = 50,          // 0-100
    potentialScore = 50,         // 0-100
    confidence = 50,             // 0-100
    assessmentCount = 0          // Number of assessments
  } = subjectData;
  
  // Normalize scores to 0-1
  const normalizedAbility = abilityScore / 100;
  const normalizedInterest = interestScore / 100;
  const normalizedPotential = potentialScore / 100;
  const normalizedConfidence = confidence / 100;
  
  // Exploitation component: weighted combination of known metrics
  const exploitationScore = 
    (normalizedAbility * abilityWeight) +
    (normalizedInterest * interestWeight) +
    (normalizedPotential * potentialWeight);
  
  // Exploration bonus: higher for subjects with less data
  let explorationBonus = 0;
  if (uncertaintyBonus) {
    // UCB exploration term: sqrt(2 * ln(total) / count)
    const totalAssessments = Math.max(1, assessmentCount);
    const uncertaintyFactor = 1 - normalizedConfidence;
    explorationBonus = uncertaintyFactor * Math.sqrt(2 * Math.log(totalAssessments + 1) / (assessmentCount + 1));
  }
  
  // Final recommendation score
  const recommendationScore = 
    (exploitationScore * (1 - explorationWeight)) +
    (explorationBonus * explorationWeight);
  
  return Math.max(0, Math.min(1, recommendationScore)) * 100;
}

/**
 * Generate personalized recommendations for a student
 * 
 * @param {Object} studentData - Complete student data across all subjects
 * @param {Object} options - Recommendation options
 * @returns {Array} Ranked recommendations
 */
export function generateRecommendations(studentData, options = {}) {
  const {
    topN = 5,                    // Number of recommendations
    minInterest = 30,            // Minimum interest threshold
    minAbility = 0,              // Minimum ability threshold
    diversify = true,            // Ensure diverse recommendations
    includeReasoning = true      // Include explanation
  } = options;
  
  // Calculate recommendation score for each subject
  const subjectScores = Object.entries(studentData).map(([subjectId, data]) => {
    const recommendationScore = calculateRecommendationScore(data, options);
    
    return {
      subjectId,
      recommendationScore,
      abilityScore: data.abilityScore || 0,
      interestScore: data.interestScore || 0,
      potentialScore: data.potentialScore || 0,
      confidence: data.confidence || 0,
      category: data.category || 'unknown'
    };
  });
  
  // Filter by minimum thresholds
  let filtered = subjectScores.filter(
    s => s.interestScore >= minInterest && s.abilityScore >= minAbility
  );
  
  // If too few results, relax constraints
  if (filtered.length < topN) {
    filtered = subjectScores.filter(s => s.interestScore >= minInterest * 0.7);
  }
  
  // Sort by recommendation score
  filtered.sort((a, b) => b.recommendationScore - a.recommendationScore);
  
  // Diversify if requested
  if (diversify) {
    filtered = diversifyRecommendations(filtered, topN);
  }
  
  // Take top N
  const recommendations = filtered.slice(0, topN);
  
  // Add reasoning if requested
  if (includeReasoning) {
    recommendations.forEach((rec, index) => {
      rec.rank = index + 1;
      rec.reasoning = generateReasoning(rec);
    });
  }
  
  return recommendations;
}

/**
 * Diversify recommendations across categories
 * Ensures variety in recommended subjects
 * 
 * @param {Array} subjects - Sorted subjects
 * @param {number} count - Number to select
 * @returns {Array} Diversified selection
 */
function diversifyRecommendations(subjects, count) {
  const diversified = [];
  const categoryCounts = {};
  
  for (const subject of subjects) {
    const category = subject.category || 'unknown';
    const currentCount = categoryCounts[category] || 0;
    
    // Limit subjects per category (max 2 from same category in top 5)
    const maxPerCategory = Math.ceil(count / 3);
    
    if (currentCount < maxPerCategory || diversified.length < count) {
      diversified.push(subject);
      categoryCounts[category] = currentCount + 1;
      
      if (diversified.length >= count) break;
    }
  }
  
  return diversified;
}

/**
 * Generate human-readable reasoning for recommendation
 * 
 * @param {Object} recommendation - Recommendation data
 * @returns {Object} Reasoning in multiple languages
 */
function generateReasoning(recommendation) {
  const { abilityScore, interestScore, potentialScore } = recommendation;
  
  // Determine primary reason
  let reasonType;
  
  if (abilityScore >= 70 && interestScore >= 70) {
    reasonType = 'strength_and_passion';
  } else if (potentialScore >= 75) {
    reasonType = 'high_potential';
  } else if (interestScore >= 70) {
    reasonType = 'strong_interest';
  } else if (abilityScore >= 70) {
    reasonType = 'natural_talent';
  } else if (interestScore >= 50 && potentialScore >= 60) {
    reasonType = 'growth_opportunity';
  } else {
    reasonType = 'balanced_fit';
  }
  
  const reasons = {
    strength_and_passion: {
      en: 'You excel in this subject and show strong passion for it',
      ar: 'أنت متفوق في هذا الموضوع وتظهر شغفًا قويًا به',
      he: 'אתה מצטיין בנושא זה ומראה תשוקה חזקה אליו'
    },
    high_potential: {
      en: 'You have exceptional potential for growth in this area',
      ar: 'لديك إمكانات استثنائية للنمو في هذا المجال',
      he: 'יש לך פוטנציאל יוצא דופן לצמיחה בתחום זה'
    },
    strong_interest: {
      en: 'Your strong interest makes this an ideal learning path',
      ar: 'اهتمامك القوي يجعل هذا مسارًا مثاليًا للتعلم',
      he: 'העניין החזק שלך הופך את זה למסלול למידה אידיאלי'
    },
    natural_talent: {
      en: 'You demonstrate natural ability in this subject',
      ar: 'تظهر قدرة طبيعية في هذا الموضوع',
      he: 'אתה מפגין יכולת טבעית בנושא זה'
    },
    growth_opportunity: {
      en: 'Great opportunity to develop your skills and interest',
      ar: 'فرصة رائعة لتطوير مهاراتك واهتمامك',
      he: 'הזדמנות מצוינת לפתח את הכישורים והעניין שלך'
    },
    balanced_fit: {
      en: 'This subject aligns well with your profile',
      ar: 'هذا الموضوع يتماشى بشكل جيد مع ملفك الشخصي',
      he: 'נושא זה מתאים היטב לפרופיל שלך'
    }
  };
  
  return {
    type: reasonType,
    ...reasons[reasonType]
  };
}

/**
 * Calculate learning potential score
 * Combines ability, interest, and growth trajectory
 * 
 * @param {Object} subjectData - Subject data
 * @returns {number} Potential score (0-100)
 */
export function calculateLearningPotential(subjectData) {
  const {
    abilityScore = 50,
    interestScore = 50,
    abilityGrowthRate = 0,       // Rate of improvement
    recentImprovement = false,   // Recent positive trend
    confidence = 50
  } = subjectData;
  
  // Base potential from current metrics
  const basePotential = (abilityScore * 0.4) + (interestScore * 0.6);
  
  // Growth bonus
  let growthBonus = 0;
  if (abilityGrowthRate > 0) {
    growthBonus = Math.min(20, abilityGrowthRate * 10);
  }
  if (recentImprovement) {
    growthBonus += 10;
  }
  
  // Confidence adjustment (higher confidence = more reliable potential)
  const confidenceMultiplier = 0.7 + (confidence / 100) * 0.3;
  
  const potentialScore = (basePotential + growthBonus) * confidenceMultiplier;
  
  return Math.max(0, Math.min(100, potentialScore));
}

/**
 * Update recommendation weights based on student feedback
 * Implements reinforcement learning concept
 * 
 * @param {Object} currentWeights - Current algorithm weights
 * @param {Object} feedback - Student feedback on recommendations
 * @returns {Object} Updated weights
 */
export function updateRecommendationWeights(currentWeights, feedback) {
  const {
    accepted = false,
    rating = 0,              // 1-5 rating
    outcome = null           // 'successful', 'neutral', 'unsuccessful'
  } = feedback;
  
  const learningRate = 0.1;  // How quickly to adapt
  
  const weights = { ...currentWeights };
  
  // Adjust based on feedback
  if (accepted && rating >= 4) {
    // Positive feedback - reinforce current strategy
    // No change needed, current weights are working
  } else if (!accepted || rating <= 2) {
    // Negative feedback - adjust exploration
    weights.explorationWeight = Math.min(0.5, weights.explorationWeight + learningRate);
  }
  
  // Adjust based on outcome
  if (outcome === 'successful') {
    // Student succeeded - current balance is good
    weights.abilityWeight *= (1 + learningRate);
  } else if (outcome === 'unsuccessful') {
    // Student struggled - may need more interest-driven recommendations
    weights.interestWeight *= (1 + learningRate);
  }
  
  // Normalize weights
  const total = weights.abilityWeight + weights.interestWeight + weights.potentialWeight;
  weights.abilityWeight /= total;
  weights.interestWeight /= total;
  weights.potentialWeight /= total;
  
  return weights;
}

/**
 * Thompson Sampling variant for exploration
 * Alternative to UCB, uses Bayesian approach
 * 
 * @param {Object} subjectData - Subject data with success/failure counts
 * @returns {number} Sampled score
 */
export function thompsonSampling(subjectData) {
  const {
    successCount = 1,
    failureCount = 1
  } = subjectData;
  
  // Beta distribution sampling (simplified)
  // In practice, use a proper beta distribution sampler
  const alpha = successCount + 1;
  const beta = failureCount + 1;
  
  // Approximate beta distribution mean
  const mean = alpha / (alpha + beta);
  
  // Add some randomness
  const noise = (Math.random() - 0.5) * 0.2;
  
  return Math.max(0, Math.min(1, mean + noise)) * 100;
}

/**
 * Contextual bandit - adjust recommendations based on context
 * 
 * @param {Object} studentData - Student data
 * @param {Object} context - Current context (time, mood, recent performance)
 * @returns {Array} Context-aware recommendations
 */
export function contextualRecommendations(studentData, context = {}) {
  const {
    timeOfDay = 'morning',       // morning, afternoon, evening
    recentPerformance = 'good',  // good, average, poor
    energyLevel = 'high',        // high, medium, low
    availableTime = 60           // minutes
  } = context;
  
  // Adjust weights based on context
  const contextWeights = { ...studentData };
  
  // Morning: favor challenging subjects (high ability)
  if (timeOfDay === 'morning') {
    contextWeights.abilityWeight = 0.5;
    contextWeights.interestWeight = 0.3;
  }
  
  // Evening: favor interesting subjects (high interest)
  if (timeOfDay === 'evening') {
    contextWeights.abilityWeight = 0.3;
    contextWeights.interestWeight = 0.5;
  }
  
  // Low energy: favor high-interest, lower-difficulty
  if (energyLevel === 'low') {
    contextWeights.interestWeight = 0.6;
    contextWeights.abilityWeight = 0.2;
  }
  
  // Recent poor performance: boost confidence with easier subjects
  if (recentPerformance === 'poor') {
    contextWeights.abilityWeight = 0.5;
    contextWeights.potentialWeight = 0.2;
  }
  
  return generateRecommendations(studentData, contextWeights);
}

/**
 * Calculate recommendation confidence
 * 
 * @param {Object} recommendation - Recommendation data
 * @returns {Object} Confidence metrics
 */
export function calculateRecommendationConfidence(recommendation) {
  const {
    confidence = 50,
    assessmentCount = 0,
    abilityScore,
    interestScore,
    potentialScore
  } = recommendation;
  
  // Factors affecting confidence
  const dataConfidence = Math.min(100, (assessmentCount / 5) * 100);
  const scoreConfidence = confidence;
  const consistencyConfidence = 
    Math.abs(abilityScore - interestScore) < 20 ? 100 : 70;
  
  const overallConfidence = 
    (dataConfidence * 0.4) +
    (scoreConfidence * 0.4) +
    (consistencyConfidence * 0.2);
  
  let confidenceLevel;
  if (overallConfidence >= 80) confidenceLevel = 'high';
  else if (overallConfidence >= 60) confidenceLevel = 'medium';
  else confidenceLevel = 'low';
  
  return {
    score: overallConfidence,
    level: confidenceLevel,
    factors: {
      dataConfidence,
      scoreConfidence,
      consistencyConfidence
    }
  };
}

// Export all functions
export default {
  calculateRecommendationScore,
  generateRecommendations,
  calculateLearningPotential,
  updateRecommendationWeights,
  thompsonSampling,
  contextualRecommendations,
  calculateRecommendationConfidence
};
