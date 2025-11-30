/**
 * IRT CALCULATIONS - 3-Parameter Logistic (3PL) Model
 * 
 * This module implements the core Item Response Theory calculations
 * for the adaptive testing system.
 * 
 * The 3PL model calculates the probability of a correct response based on:
 * - Student ability (theta)
 * - Question difficulty (b)
 * - Question discrimination (a)
 * - Guessing parameter (c)
 */

/**
 * Calculate probability of correct response using 3PL IRT model
 * 
 * Formula: P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))
 * 
 * @param {number} theta - Student ability estimate (-3 to +3)
 * @param {number} difficulty - Question difficulty parameter b (-3 to +3)
 * @param {number} discrimination - Question discrimination parameter a (0.5 to 2.5)
 * @param {number} guessing - Guessing parameter c (0 to 1, default 0.25)
 * @returns {number} Probability of correct response (0 to 1)
 */
export function calculateProbability(theta, difficulty, discrimination, guessing = 0.25) {
  // Validate inputs
  if (theta < -3 || theta > 3) {
    console.warn(`Theta ${theta} out of range [-3, 3], clamping`);
    theta = Math.max(-3, Math.min(3, theta));
  }
  
  if (difficulty < -3 || difficulty > 3) {
    console.warn(`Difficulty ${difficulty} out of range [-3, 3], clamping`);
    difficulty = Math.max(-3, Math.min(3, difficulty));
  }
  
  if (discrimination <= 0) {
    console.warn(`Discrimination ${discrimination} must be positive, using 1.0`);
    discrimination = 1.0;
  }
  
  if (guessing < 0 || guessing > 1) {
    console.warn(`Guessing ${guessing} out of range [0, 1], using 0.25`);
    guessing = 0.25;
  }
  
  // Calculate exponent: -a(θ - b)
  const exponent = -discrimination * (theta - difficulty);
  
  // Calculate probability using 3PL formula
  const probability = guessing + (1 - guessing) / (1 + Math.exp(exponent));
  
  return probability;
}

/**
 * Calculate information function for a question
 * Information indicates how much a question contributes to ability estimation
 * 
 * @param {number} theta - Student ability estimate
 * @param {number} difficulty - Question difficulty
 * @param {number} discrimination - Question discrimination
 * @param {number} guessing - Guessing parameter
 * @returns {number} Information value (higher = more informative)
 */
export function calculateInformation(theta, difficulty, discrimination, guessing = 0.25) {
  const prob = calculateProbability(theta, difficulty, discrimination, guessing);
  
  // Information formula for 3PL model
  const numerator = Math.pow(discrimination, 2) * Math.pow(prob - guessing, 2);
  const denominator = (1 - guessing) * prob * (1 - prob);
  
  // Avoid division by zero
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

/**
 * Estimate student ability using Maximum Likelihood Estimation (MLE)
 * 
 * @param {Array} responses - Array of response objects {questionId, isCorrect, difficulty, discrimination, guessing}
 * @param {number} initialTheta - Starting ability estimate (default 0)
 * @param {number} maxIterations - Maximum Newton-Raphson iterations (default 20)
 * @param {number} tolerance - Convergence tolerance (default 0.001)
 * @returns {Object} {theta, standardError, iterations, converged}
 */
export function estimateAbility(responses, initialTheta = 0, maxIterations = 20, tolerance = 0.001) {
  if (!responses || responses.length === 0) {
    return {
      theta: 0,
      standardError: 999,
      iterations: 0,
      converged: false
    };
  }
  
  let theta = initialTheta;
  let converged = false;
  let iterations = 0;
  
  // Newton-Raphson method for MLE
  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    
    let firstDerivative = 0;  // dL/dθ
    let secondDerivative = 0; // d²L/dθ²
    
    // Calculate derivatives for all responses
    for (const response of responses) {
      const { isCorrect, difficulty, discrimination, guessing = 0.25 } = response;
      
      const prob = calculateProbability(theta, difficulty, discrimination, guessing);
      const q = 1 - prob; // Probability of incorrect response
      
      // P' = a(P - c)(1 - P) / (1 - c)
      const pPrime = (discrimination * (prob - guessing) * q) / (1 - guessing);
      
      // P'' = a²(P - c)(1 - P)(1 - 2P + c) / (1 - c)²
      const pDoublePrime = (Math.pow(discrimination, 2) * (prob - guessing) * q * (1 - 2 * prob + guessing)) / 
                           Math.pow(1 - guessing, 2);
      
      // First derivative (score function)
      if (isCorrect) {
        firstDerivative += pPrime / prob;
      } else {
        firstDerivative -= pPrime / q;
      }
      
      // Second derivative (information)
      if (isCorrect) {
        secondDerivative += (pDoublePrime * prob - Math.pow(pPrime, 2)) / Math.pow(prob, 2);
      } else {
        secondDerivative -= (pDoublePrime * q + Math.pow(pPrime, 2)) / Math.pow(q, 2);
      }
    }
    
    // Newton-Raphson update: θ_new = θ_old - f'(θ) / f''(θ)
    const delta = firstDerivative / (-secondDerivative);
    theta += delta;
    
    // Clamp theta to valid range
    theta = Math.max(-3, Math.min(3, theta));
    
    // Check convergence
    if (Math.abs(delta) < tolerance) {
      converged = true;
      break;
    }
  }
  
  // Calculate standard error (SE = 1 / sqrt(-d²L/dθ²))
  let information = 0;
  for (const response of responses) {
    const { difficulty, discrimination, guessing = 0.25 } = response;
    information += calculateInformation(theta, difficulty, discrimination, guessing);
  }
  
  const standardError = information > 0 ? 1 / Math.sqrt(information) : 999;
  
  return {
    theta,
    standardError,
    iterations,
    converged
  };
}

/**
 * Estimate ability using Bayesian Expected A Posteriori (EAP) method
 * More stable than MLE, especially with few responses
 * 
 * @param {Array} responses - Array of response objects
 * @param {number} priorMean - Prior mean of ability distribution (default 0)
 * @param {number} priorSD - Prior standard deviation (default 1)
 * @returns {Object} {theta, standardError}
 */
export function estimateAbilityEAP(responses, priorMean = 0, priorSD = 1) {
  if (!responses || responses.length === 0) {
    return {
      theta: priorMean,
      standardError: priorSD
    };
  }
  
  // Quadrature points for numerical integration
  const numPoints = 41;
  const thetaRange = 6; // -3 to +3
  const step = thetaRange / (numPoints - 1);
  
  let numerator = 0;
  let denominator = 0;
  let secondMoment = 0;
  
  // Numerical integration using quadrature
  for (let i = 0; i < numPoints; i++) {
    const theta = -3 + i * step;
    
    // Prior probability (normal distribution)
    const priorProb = Math.exp(-Math.pow(theta - priorMean, 2) / (2 * Math.pow(priorSD, 2)));
    
    // Likelihood
    let likelihood = 1;
    for (const response of responses) {
      const { isCorrect, difficulty, discrimination, guessing = 0.25 } = response;
      const prob = calculateProbability(theta, difficulty, discrimination, guessing);
      likelihood *= isCorrect ? prob : (1 - prob);
    }
    
    // Posterior probability (unnormalized)
    const posterior = priorProb * likelihood;
    
    numerator += theta * posterior;
    denominator += posterior;
    secondMoment += Math.pow(theta, 2) * posterior;
  }
  
  // EAP estimate
  const theta = numerator / denominator;
  
  // Posterior standard deviation
  const variance = (secondMoment / denominator) - Math.pow(theta, 2);
  const standardError = Math.sqrt(Math.max(0, variance));
  
  return {
    theta,
    standardError
  };
}

/**
 * Normalize theta (-3 to +3) to percentage score (0 to 100)
 * 
 * @param {number} theta - Ability estimate (-3 to +3)
 * @returns {number} Percentage score (0 to 100)
 */
export function thetaToPercentage(theta) {
  // Clamp theta to valid range
  theta = Math.max(-3, Math.min(3, theta));
  
  // Linear transformation: -3 -> 0%, 0 -> 50%, +3 -> 100%
  return ((theta + 3) / 6) * 100;
}

/**
 * Convert percentage score (0 to 100) to theta (-3 to +3)
 * 
 * @param {number} percentage - Percentage score (0 to 100)
 * @returns {number} Theta estimate (-3 to +3)
 */
export function percentageToTheta(percentage) {
  // Clamp percentage to valid range
  percentage = Math.max(0, Math.min(100, percentage));
  
  // Inverse transformation: 0% -> -3, 50% -> 0, 100% -> +3
  return (percentage / 100) * 6 - 3;
}

/**
 * Calculate confidence interval for ability estimate
 * 
 * @param {number} theta - Ability estimate
 * @param {number} standardError - Standard error of estimate
 * @param {number} confidenceLevel - Confidence level (default 0.95 for 95%)
 * @returns {Object} {lower, upper, width}
 */
export function calculateConfidenceInterval(theta, standardError, confidenceLevel = 0.95) {
  // Z-score for confidence level (1.96 for 95%, 2.58 for 99%)
  const zScore = confidenceLevel === 0.95 ? 1.96 : 
                 confidenceLevel === 0.99 ? 2.58 : 
                 1.96;
  
  const margin = zScore * standardError;
  
  return {
    lower: Math.max(-3, theta - margin),
    upper: Math.min(3, theta + margin),
    width: 2 * margin
  };
}

/**
 * Determine if ability estimate is sufficiently precise
 * 
 * @param {number} standardError - Standard error of estimate
 * @param {number} threshold - Maximum acceptable SE (default 0.3)
 * @returns {boolean} True if estimate is precise enough
 */
export function isPrecisionSufficient(standardError, threshold = 0.3) {
  return standardError <= threshold;
}

/**
 * Calculate expected score for a student on a test
 * 
 * @param {number} theta - Student ability
 * @param {Array} questions - Array of question objects {difficulty, discrimination, guessing}
 * @returns {Object} {expectedScore, maxScore, percentage}
 */
export function calculateExpectedScore(theta, questions) {
  let expectedScore = 0;
  
  for (const question of questions) {
    const { difficulty, discrimination, guessing = 0.25 } = question;
    const prob = calculateProbability(theta, difficulty, discrimination, guessing);
    expectedScore += prob;
  }
  
  return {
    expectedScore,
    maxScore: questions.length,
    percentage: (expectedScore / questions.length) * 100
  };
}

// Export all functions as default object
export default {
  calculateProbability,
  calculateInformation,
  estimateAbility,
  estimateAbilityEAP,
  thetaToPercentage,
  percentageToTheta,
  calculateConfidenceInterval,
  isPrecisionSufficient,
  calculateExpectedScore
};
