/**
 * CAT ALGORITHM - Computerized Adaptive Testing
 * 
 * This module implements the adaptive question selection algorithm
 * that powers the intelligent test administration.
 * 
 * Key principles:
 * 1. Start with medium difficulty questions
 * 2. Select questions that maximize information at current ability estimate
 * 3. Avoid recently used questions
 * 4. Balance content coverage across topics
 */

import {
    calculateInformation,
    estimateAbility,
    estimateAbilityEAP,
    isPrecisionSufficient
} from './irtCalculations.js';

/**
 * Select the next best question for a student
 * Uses Maximum Information criterion
 * 
 * @param {number} currentTheta - Current ability estimate
 * @param {Array} availableQuestions - Pool of questions to choose from
 * @param {Array} usedQuestionIds - IDs of already used questions
 * @param {Object} options - Selection options
 * @returns {Object} Selected question or null
 */
export function selectNextQuestion(
  currentTheta,
  availableQuestions,
  usedQuestionIds = [],
  options = {}
) {
  const {
    method = 'maximum_information', // 'maximum_information', 'random', 'difficulty_matching'
    contentBalancing = false,
    exposureControl = true,
    randomness = 0.1 // Add slight randomness to avoid predictability
  } = options;
  
  // Filter out already used questions
  const unusedQuestions = availableQuestions.filter(
    q => !usedQuestionIds.includes(q.id)
  );
  
  if (unusedQuestions.length === 0) {
    console.warn('No unused questions available');
    return null;
  }
  
  // Select based on method
  switch (method) {
    case 'maximum_information':
      return selectByMaximumInformation(currentTheta, unusedQuestions, randomness);
    
    case 'difficulty_matching':
      return selectByDifficultyMatching(currentTheta, unusedQuestions, randomness);
    
    case 'random':
      return selectRandomly(unusedQuestions);
    
    default:
      return selectByMaximumInformation(currentTheta, unusedQuestions, randomness);
  }
}

/**
 * Select question with maximum information at current ability level
 * This is the standard CAT approach
 * 
 * @param {number} theta - Current ability estimate
 * @param {Array} questions - Available questions
 * @param {number} randomness - Amount of randomness (0-1)
 * @returns {Object} Selected question
 */
function selectByMaximumInformation(theta, questions, randomness = 0.1) {
  // Calculate information for each question
  const questionsWithInfo = questions.map(q => ({
    ...q,
    information: calculateInformation(
      theta,
      q.difficulty,
      q.discrimination,
      q.guessing || 0.25
    )
  }));
  
  // Sort by information (descending)
  questionsWithInfo.sort((a, b) => b.information - a.information);
  
  // Add randomness: select from top N questions
  if (randomness > 0 && randomness < 1) {
    const topN = Math.max(1, Math.ceil(questionsWithInfo.length * randomness));
    const topQuestions = questionsWithInfo.slice(0, topN);
    return topQuestions[Math.floor(Math.random() * topQuestions.length)];
  }
  
  // Return question with maximum information
  return questionsWithInfo[0];
}

/**
 * Select question with difficulty closest to current ability
 * Simpler approach, good for initial questions
 * 
 * @param {number} theta - Current ability estimate
 * @param {Array} questions - Available questions
 * @param {number} randomness - Amount of randomness
 * @returns {Object} Selected question
 */
function selectByDifficultyMatching(theta, questions, randomness = 0.1) {
  // Calculate difficulty difference for each question
  const questionsWithDiff = questions.map(q => ({
    ...q,
    difficultyDiff: Math.abs(q.difficulty - theta)
  }));
  
  // Sort by difficulty difference (ascending)
  questionsWithDiff.sort((a, b) => a.difficultyDiff - b.difficultyDiff);
  
  // Add randomness
  if (randomness > 0 && randomness < 1) {
    const topN = Math.max(1, Math.ceil(questionsWithDiff.length * randomness));
    const topQuestions = questionsWithDiff.slice(0, topN);
    return topQuestions[Math.floor(Math.random() * topQuestions.length)];
  }
  
  return questionsWithDiff[0];
}

/**
 * Select a random question (for interest discovery phase)
 * 
 * @param {Array} questions - Available questions
 * @returns {Object} Selected question
 */
function selectRandomly(questions) {
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

/**
 * Determine if test should terminate
 * Based on precision or maximum questions reached
 * 
 * @param {Object} testState - Current test state
 * @returns {Object} {shouldStop, reason}
 */
export function shouldTerminateTest(testState) {
  const {
    questionsAnswered,
    targetQuestions,
    minQuestions = 10,
    maxQuestions = 60,
    currentTheta,
    standardError,
    targetPrecision = 0.3
  } = testState;
  
  // Must answer minimum questions
  if (questionsAnswered < minQuestions) {
    return { shouldStop: false, reason: null };
  }
  
  // Stop if maximum questions reached
  if (questionsAnswered >= maxQuestions) {
    return { shouldStop: true, reason: 'max_questions_reached' };
  }
  
  // Stop if target questions reached
  if (targetQuestions && questionsAnswered >= targetQuestions) {
    return { shouldStop: true, reason: 'target_questions_reached' };
  }
  
  // Stop if sufficient precision achieved
  if (standardError && isPrecisionSufficient(standardError, targetPrecision)) {
    return { shouldStop: true, reason: 'sufficient_precision' };
  }
  
  // Continue testing
  return { shouldStop: false, reason: null };
}

/**
 * Update ability estimate after each response
 * 
 * @param {Array} responses - All responses so far
 * @param {string} method - Estimation method ('MLE' or 'EAP')
 * @returns {Object} Updated ability estimate
 */
export function updateAbilityEstimate(responses, method = 'EAP') {
  if (!responses || responses.length === 0) {
    return {
      theta: 0,
      standardError: 999,
      converged: false
    };
  }
  
  // Use EAP for early responses (more stable)
  // Switch to MLE after sufficient responses
  if (method === 'EAP' || responses.length < 5) {
    return estimateAbilityEAP(responses);
  } else {
    return estimateAbility(responses);
  }
}

/**
 * Initialize adaptive test session
 * 
 * @param {Object} config - Test configuration
 * @returns {Object} Initial test state
 */
export function initializeTest(config = {}) {
  const {
    targetQuestions = 20,
    minQuestions = 10,
    maxQuestions = 60,
    targetPrecision = 0.3,
    startingTheta = 0,
    selectionMethod = 'maximum_information'
  } = config;
  
  return {
    questionsAnswered: 0,
    targetQuestions,
    minQuestions,
    maxQuestions,
    targetPrecision,
    currentTheta: startingTheta,
    standardError: 999,
    responses: [],
    usedQuestionIds: [],
    selectionMethod,
    startTime: new Date(),
    isComplete: false
  };
}

/**
 * Process a student's response and update test state
 * 
 * @param {Object} testState - Current test state
 * @param {Object} question - Question that was answered
 * @param {string} selectedAnswer - Student's answer (A, B, C, D)
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Object} Updated test state
 */
export function processResponse(testState, question, selectedAnswer, timeTaken) {
  const isCorrect = selectedAnswer === question.correct_answer;
  
  // Create response object
  const response = {
    questionId: question.id,
    isCorrect,
    selectedAnswer,
    correctAnswer: question.correct_answer,
    difficulty: question.difficulty,
    discrimination: question.discrimination,
    guessing: question.guessing || 0.25,
    timeTaken,
    timestamp: new Date()
  };
  
  // Add response to history
  const updatedResponses = [...testState.responses, response];
  
  // Update ability estimate
  const abilityEstimate = updateAbilityEstimate(updatedResponses);
  
  // Update test state
  const updatedState = {
    ...testState,
    questionsAnswered: testState.questionsAnswered + 1,
    responses: updatedResponses,
    usedQuestionIds: [...testState.usedQuestionIds, question.id],
    currentTheta: abilityEstimate.theta,
    standardError: abilityEstimate.standardError,
    lastResponse: response
  };
  
  // Check if test should terminate
  const termination = shouldTerminateTest(updatedState);
  if (termination.shouldStop) {
    updatedState.isComplete = true;
    updatedState.terminationReason = termination.reason;
    updatedState.endTime = new Date();
  }
  
  return updatedState;
}

/**
 * Get test statistics and summary
 * 
 * @param {Object} testState - Final test state
 * @returns {Object} Test statistics
 */
export function getTestStatistics(testState) {
  const {
    responses,
    currentTheta,
    standardError,
    questionsAnswered,
    startTime,
    endTime
  } = testState;
  
  if (!responses || responses.length === 0) {
    return null;
  }
  
  // Calculate statistics
  const correctCount = responses.filter(r => r.isCorrect).length;
  const accuracy = (correctCount / responses.length) * 100;
  
  const totalTime = endTime && startTime ? 
    (endTime.getTime() - startTime.getTime()) / 1000 : 0;
  
  const avgTimePerQuestion = totalTime / questionsAnswered;
  
  const avgDifficulty = responses.reduce((sum, r) => sum + r.difficulty, 0) / responses.length;
  
  return {
    questionsAnswered,
    correctCount,
    incorrectCount: responses.length - correctCount,
    accuracy,
    finalTheta: currentTheta,
    standardError,
    totalTimeSeconds: totalTime,
    avgTimePerQuestion,
    avgDifficulty,
    responses
  };
}

/**
 * Select initial question for test start
 * Typically a medium difficulty question
 * 
 * @param {Array} questions - Available questions
 * @param {number} targetDifficulty - Target difficulty (default 0)
 * @returns {Object} Selected question
 */
export function selectInitialQuestion(questions, targetDifficulty = 0) {
  // Find questions close to target difficulty
  const questionsWithDiff = questions.map(q => ({
    ...q,
    difficultyDiff: Math.abs(q.difficulty - targetDifficulty)
  }));
  
  // Sort by difficulty difference
  questionsWithDiff.sort((a, b) => a.difficultyDiff - b.difficultyDiff);
  
  // Select from top 5 closest questions randomly
  const topN = Math.min(5, questionsWithDiff.length);
  const randomIndex = Math.floor(Math.random() * topN);
  
  return questionsWithDiff[randomIndex];
}

/**
 * Balance question selection across content areas
 * Ensures diverse coverage of topics
 * 
 * @param {Array} questions - Available questions
 * @param {Array} usedQuestions - Already used questions
 * @param {string} contentField - Field name for content area (e.g., 'subject_id')
 * @returns {Array} Filtered questions prioritizing underrepresented content
 */
export function balanceContentCoverage(questions, usedQuestions, contentField = 'subject_id') {
  // Count usage by content area
  const contentCounts = {};
  usedQuestions.forEach(q => {
    const content = q[contentField];
    contentCounts[content] = (contentCounts[content] || 0) + 1;
  });
  
  // Find least used content areas
  const minCount = Math.min(...Object.values(contentCounts), 0);
  
  // Prioritize questions from least used content areas
  const prioritized = questions.filter(q => {
    const content = q[contentField];
    return (contentCounts[content] || 0) === minCount;
  });
  
  return prioritized.length > 0 ? prioritized : questions;
}

// Export all functions
export default {
  selectNextQuestion,
  shouldTerminateTest,
  updateAbilityEstimate,
  initializeTest,
  processResponse,
  getTestStatistics,
  selectInitialQuestion,
  balanceContentCoverage
};
