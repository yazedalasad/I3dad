/**
 * BAYESIAN ESTIMATION - Advanced Ability Tracking
 * 
 * This module implements Bayesian methods for ability estimation
 * including Bayesian Knowledge Tracing (BKT) concepts.
 * 
 * Advantages over classical methods:
 * - More stable with few responses
 * - Incorporates prior knowledge
 * - Provides uncertainty estimates
 * - Handles skill-level tracking
 */

import { calculateProbability } from './irtCalculations.js';

/**
 * Bayesian ability estimation with informative prior
 * 
 * @param {Array} responses - Student responses
 * @param {Object} prior - Prior distribution {mean, sd}
 * @param {number} numQuadraturePoints - Integration points (default 41)
 * @returns {Object} Posterior distribution {mean, sd, mode}
 */
export function bayesianAbilityEstimate(
  responses,
  prior = { mean: 0, sd: 1 },
  numQuadraturePoints = 41
) {
  if (!responses || responses.length === 0) {
    return {
      mean: prior.mean,
      sd: prior.sd,
      mode: prior.mean,
      confidence: 0
    };
  }
  
  const thetaRange = 6; // -3 to +3
  const step = thetaRange / (numQuadraturePoints - 1);
  
  let posteriorMean = 0;
  let posteriorSecondMoment = 0;
  let posteriorMode = prior.mean;
  let maxPosterior = 0;
  let totalPosterior = 0;
  
  // Numerical integration using quadrature
  for (let i = 0; i < numQuadraturePoints; i++) {
    const theta = -3 + i * step;
    
    // Prior probability (normal distribution)
    const priorProb = normalPDF(theta, prior.mean, prior.sd);
    
    // Likelihood
    let logLikelihood = 0;
    for (const response of responses) {
      const { isCorrect, difficulty, discrimination, guessing = 0.25 } = response;
      const prob = calculateProbability(theta, difficulty, discrimination, guessing);
      
      // Use log-likelihood for numerical stability
      logLikelihood += isCorrect ? Math.log(prob) : Math.log(1 - prob);
    }
    const likelihood = Math.exp(logLikelihood);
    
    // Posterior probability (unnormalized)
    const posterior = priorProb * likelihood;
    
    // Track mode (MAP estimate)
    if (posterior > maxPosterior) {
      maxPosterior = posterior;
      posteriorMode = theta;
    }
    
    // Accumulate for mean and variance
    posteriorMean += theta * posterior;
    posteriorSecondMoment += Math.pow(theta, 2) * posterior;
    totalPosterior += posterior;
  }
  
  // Normalize
  posteriorMean /= totalPosterior;
  posteriorSecondMoment /= totalPosterior;
  
  // Calculate posterior standard deviation
  const posteriorVariance = posteriorSecondMoment - Math.pow(posteriorMean, 2);
  const posteriorSD = Math.sqrt(Math.max(0, posteriorVariance));
  
  // Confidence: how much uncertainty has been reduced
  const confidence = Math.max(0, Math.min(100, (1 - posteriorSD / prior.sd) * 100));
  
  return {
    mean: posteriorMean,
    sd: posteriorSD,
    mode: posteriorMode,
    confidence
  };
}

/**
 * Normal probability density function
 * 
 * @param {number} x - Value
 * @param {number} mean - Mean
 * @param {number} sd - Standard deviation
 * @returns {number} Probability density
 */
function normalPDF(x, mean, sd) {
  const coefficient = 1 / (sd * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sd, 2));
  return coefficient * Math.exp(exponent);
}

/**
 * Update prior based on student's grade level
 * Higher grades typically have higher ability
 * 
 * @param {number} grade - Student's grade (1-12)
 * @returns {Object} Adjusted prior {mean, sd}
 */
export function getGradeBasedPrior(grade) {
  // Map grade to expected ability
  // Grade 1-6: below average to average
  // Grade 7-9: average
  // Grade 10-12: average to above average
  
  const gradeToTheta = {
    1: -1.5, 2: -1.2, 3: -1.0, 4: -0.8, 5: -0.6, 6: -0.4,
    7: -0.2, 8: 0.0, 9: 0.2,
    10: 0.4, 11: 0.6, 12: 0.8
  };
  
  const mean = gradeToTheta[grade] || 0;
  const sd = 1.0; // Standard deviation remains constant
  
  return { mean, sd };
}

/**
 * Bayesian Knowledge Tracing (BKT) - Track mastery of specific skills
 * 
 * @param {Object} skillState - Current skill state
 * @param {boolean} isCorrect - Whether response was correct
 * @param {Object} params - BKT parameters
 * @returns {Object} Updated skill state
 */
export function updateSkillMastery(
  skillState,
  isCorrect,
  params = {}
) {
  const {
    pLearn = 0.3,      // Probability of learning (transition)
    pSlip = 0.1,       // Probability of slip (error despite knowing)
    pGuess = 0.25,     // Probability of guess (correct despite not knowing)
    pInit = 0.5        // Initial probability of knowing
  } = params;
  
  // Current probability of mastery
  const pKnow = skillState?.pKnow || pInit;
  
  // Update based on response using Bayes' theorem
  let pKnowGivenResponse;
  
  if (isCorrect) {
    // P(Know | Correct) = P(Correct | Know) * P(Know) / P(Correct)
    const pCorrectGivenKnow = 1 - pSlip;
    const pCorrectGivenNotKnow = pGuess;
    const pCorrect = pCorrectGivenKnow * pKnow + pCorrectGivenNotKnow * (1 - pKnow);
    
    pKnowGivenResponse = (pCorrectGivenKnow * pKnow) / pCorrect;
  } else {
    // P(Know | Incorrect) = P(Incorrect | Know) * P(Know) / P(Incorrect)
    const pIncorrectGivenKnow = pSlip;
    const pIncorrectGivenNotKnow = 1 - pGuess;
    const pIncorrect = pIncorrectGivenKnow * pKnow + pIncorrectGivenNotKnow * (1 - pKnow);
    
    pKnowGivenResponse = (pIncorrectGivenKnow * pKnow) / pIncorrect;
  }
  
  // Apply learning transition
  const pKnowAfterLearning = pKnowGivenResponse + (1 - pKnowGivenResponse) * pLearn;
  
  // Determine mastery status
  const isMastered = pKnowAfterLearning >= 0.95;
  const needsPractice = pKnowAfterLearning < 0.7;
  
  return {
    pKnow: pKnowAfterLearning,
    isMastered,
    needsPractice,
    attempts: (skillState?.attempts || 0) + 1,
    correctCount: (skillState?.correctCount || 0) + (isCorrect ? 1 : 0),
    lastUpdated: new Date()
  };
}

/**
 * Track multiple skills simultaneously
 * 
 * @param {Object} skillsState - Current state of all skills
 * @param {Array} skillIds - Skills involved in the question
 * @param {boolean} isCorrect - Whether response was correct
 * @returns {Object} Updated skills state
 */
export function updateMultipleSkills(skillsState = {}, skillIds, isCorrect) {
  const updatedSkills = { ...skillsState };
  
  for (const skillId of skillIds) {
    const currentState = updatedSkills[skillId] || null;
    updatedSkills[skillId] = updateSkillMastery(currentState, isCorrect);
  }
  
  return updatedSkills;
}

/**
 * Calculate overall mastery across all skills
 * 
 * @param {Object} skillsState - State of all skills
 * @returns {Object} Mastery statistics
 */
export function calculateOverallMastery(skillsState) {
  const skills = Object.values(skillsState);
  
  if (skills.length === 0) {
    return {
      averageMastery: 0,
      masteredCount: 0,
      totalSkills: 0,
      needsPracticeCount: 0,
      masteryPercentage: 0
    };
  }
  
  const averageMastery = skills.reduce((sum, s) => sum + s.pKnow, 0) / skills.length;
  const masteredCount = skills.filter(s => s.isMastered).length;
  const needsPracticeCount = skills.filter(s => s.needsPractice).length;
  
  return {
    averageMastery,
    masteredCount,
    totalSkills: skills.length,
    needsPracticeCount,
    masteryPercentage: (masteredCount / skills.length) * 100
  };
}

/**
 * Predict probability of correct response using Bayesian approach
 * 
 * @param {Object} skillsState - Current skills state
 * @param {Array} requiredSkills - Skills needed for question
 * @param {Object} params - BKT parameters
 * @returns {number} Predicted probability of correct response
 */
export function predictResponseProbability(skillsState, requiredSkills, params = {}) {
  const { pSlip = 0.1, pGuess = 0.25 } = params;
  
  if (!requiredSkills || requiredSkills.length === 0) {
    return 0.5; // No information
  }
  
  // Calculate probability student knows all required skills
  let pKnowAll = 1;
  for (const skillId of requiredSkills) {
    const skill = skillsState[skillId];
    const pKnow = skill?.pKnow || 0.5;
    pKnowAll *= pKnow;
  }
  
  // Probability of correct response
  const pCorrect = pKnowAll * (1 - pSlip) + (1 - pKnowAll) * pGuess;
  
  return pCorrect;
}

/**
 * Adaptive prior based on recent performance
 * Adjusts prior based on student's trajectory
 * 
 * @param {Array} recentResponses - Recent responses (last 5-10)
 * @param {Object} currentPrior - Current prior
 * @returns {Object} Adjusted prior
 */
export function adaptivePrior(recentResponses, currentPrior = { mean: 0, sd: 1 }) {
  if (!recentResponses || recentResponses.length < 3) {
    return currentPrior;
  }
  
  // Calculate recent performance
  const correctCount = recentResponses.filter(r => r.isCorrect).length;
  const accuracy = correctCount / recentResponses.length;
  
  // Adjust prior mean based on performance
  let adjustment = 0;
  if (accuracy > 0.8) {
    adjustment = 0.3; // Performing well, increase prior
  } else if (accuracy < 0.4) {
    adjustment = -0.3; // Struggling, decrease prior
  }
  
  // Reduce uncertainty (tighten prior) as we gather more data
  const sdReduction = Math.min(0.3, recentResponses.length * 0.03);
  
  return {
    mean: Math.max(-3, Math.min(3, currentPrior.mean + adjustment)),
    sd: Math.max(0.5, currentPrior.sd - sdReduction)
  };
}

/**
 * Calculate credible interval (Bayesian confidence interval)
 * 
 * @param {number} mean - Posterior mean
 * @param {number} sd - Posterior standard deviation
 * @param {number} credibility - Credibility level (default 0.95)
 * @returns {Object} Credible interval {lower, upper}
 */
export function calculateCredibleInterval(mean, sd, credibility = 0.95) {
  // For normal distribution, use z-scores
  const zScore = credibility === 0.95 ? 1.96 : 
                 credibility === 0.99 ? 2.58 : 
                 1.96;
  
  return {
    lower: Math.max(-3, mean - zScore * sd),
    upper: Math.min(3, mean + zScore * sd),
    width: 2 * zScore * sd
  };
}

// Export all functions
export default {
  bayesianAbilityEstimate,
  getGradeBasedPrior,
  updateSkillMastery,
  updateMultipleSkills,
  calculateOverallMastery,
  predictResponseProbability,
  adaptivePrior,
  calculateCredibleInterval
};
