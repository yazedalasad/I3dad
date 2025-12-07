/**
 * ADAPTIVE TEST SERVICE - Main Orchestration
 * 
 * This service orchestrates the entire adaptive testing flow:
 * 1. Interest discovery phase
 * 2. Ability assessment phase
 * 3. Results calculation and storage
 * 4. Recommendation generation
 */

import { supabase } from '../config/supabase';
import {
  getTestStatistics,
  initializeTest,
  processResponse,
  selectInitialQuestion,
  selectNextQuestion
} from '../utils/irt/catAlgorithm';
import {
  discoverInterests,
  updateInterestProfile
} from '../utils/irt/interestProfiling';
import {
  calculateConfidenceInterval,
  thetaToPercentage
} from '../utils/irt/irtCalculations';
import {
  calculateLearningPotential,
  generateRecommendations
} from '../utils/irt/recommendationEngine';

/**
 * Start interest discovery phase
 * Present diverse questions to identify student interests
 * 
 * @param {string} studentId - Student ID
 * @param {string} language - Test language ('ar' or 'he')
 * @returns {Object} Session data
 */
export async function startInterestDiscovery(studentId, language = 'ar') {
  try {
    // Create test session
    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .insert({
        student_id: studentId,
        session_type: 'interest_discovery',
        language,
        target_questions: 20, // 2 questions per subject
        status: 'in_progress'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return {
      success: true,
      sessionId: session.id,
      session
    };
  } catch (error) {
    console.error('Error starting interest discovery:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get next question for interest discovery
 * Ensures diverse coverage across all subjects
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object} Next question
 */
export async function getInterestDiscoveryQuestion(sessionId) {
  try {
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .select('*, student_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get already answered questions
    const { data: responses, error: responsesError } = await supabase
      .from('student_responses')
      .select('question_id, questions(subject_id)')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    // Count questions per subject
    const subjectCounts = {};
    const usedQuestionIds = [];
    
    responses?.forEach(r => {
      usedQuestionIds.push(r.question_id);
      const subjectId = r.questions?.subject_id;
      if (subjectId) {
        subjectCounts[subjectId] = (subjectCounts[subjectId] || 0) + 1;
      }
    });

    // Find subject with fewest questions
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('is_active', true);

    let targetSubjectId = null;
    let minCount = Infinity;

    subjects?.forEach(subject => {
      const count = subjectCounts[subject.id] || 0;
      if (count < minCount) {
        minCount = count;
        targetSubjectId = subject.id;
      }
    });

    // Get random question from target subject
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', targetSubjectId)
      .eq('is_active', true)
      .not('id', 'in', `(${usedQuestionIds.join(',') || 'null'})`)
      .limit(10);

    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return {
        success: false,
        error: 'No more questions available'
      };
    }

    // Select random question
    const question = questions[Math.floor(Math.random() * questions.length)];

    return {
      success: true,
      question,
      progress: {
        answered: responses?.length || 0,
        total: session.target_questions
      }
    };
  } catch (error) {
    console.error('Error getting interest discovery question:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submit answer for interest discovery
 * 
 * @param {string} sessionId - Session ID
 * @param {string} questionId - Question ID
 * @param {string} answer - Selected answer (A, B, C, D)
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Object} Result
 */
export async function submitInterestDiscoveryAnswer(sessionId, questionId, answer, timeTaken) {
  try {
    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*, subjects(*)')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    const isCorrect = answer === question.correct_answer;

    // Get session
    const { data: session } = await supabase
      .from('test_sessions')
      .select('student_id, questions_answered')
      .eq('id', sessionId)
      .single();

    // Save response
    const { error: responseError } = await supabase
      .from('student_responses')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        student_id: session.student_id,
        selected_answer: answer,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken,
        question_order: session.questions_answered + 1
      });

    if (responseError) throw responseError;

    // Update session
    const { error: updateError } = await supabase
      .from('test_sessions')
      .update({
        questions_answered: session.questions_answered + 1
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    // Update interest profile
    await updateStudentInterest(
      session.student_id,
      question.subject_id,
      {
        timeTaken,
        isCorrect,
        isVoluntary: false,
        completed: true
      }
    );

    return {
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer
    };
  } catch (error) {
    console.error('Error submitting interest discovery answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete interest discovery and calculate interests
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object} Discovered interests
 */
export async function completeInterestDiscovery(sessionId) {
  try {
    // Get all responses
    const { data: responses, error: responsesError } = await supabase
      .from('student_responses')
      .select(`
        *,
        questions(subject_id, subjects(id, name_en, name_ar, name_he, code))
      `)
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    // Format responses for interest discovery
    const formattedResponses = responses.map(r => ({
      subjectId: r.questions.subject_id,
      timeTaken: r.time_taken_seconds,
      isCorrect: r.is_correct
    }));

    // Discover interests
    const interests = discoverInterests(formattedResponses);

    // Update session status
    const { error: updateError } = await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return {
      success: true,
      interests
    };
  } catch (error) {
    console.error('Error completing interest discovery:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start ability assessment for a specific subject
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @param {string} language - Test language
 * @returns {Object} Session data
 */
export async function startAbilityAssessment(studentId, subjectId, language = 'ar') {
  try {
    // Create test session
    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        session_type: 'ability_assessment',
        language,
        target_questions: 20,
        status: 'in_progress'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Initialize test state (stored in memory/context)
    const testState = initializeTest({
      targetQuestions: 20,
      minQuestions: 10,
      maxQuestions: 30,
      targetPrecision: 0.3,
      startingTheta: 0
    });

    return {
      success: true,
      sessionId: session.id,
      session,
      testState
    };
  } catch (error) {
    console.error('Error starting ability assessment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get next adaptive question
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} testState - Current test state
 * @param {string} subjectId - Subject ID (optional, will query if not provided)
 * @returns {Object} Next question
 */
export async function getAdaptiveQuestion(sessionId, testState, subjectId = null) {
  try {
    console.log('getAdaptiveQuestion called with:', { sessionId, subjectId });
    let actualSubjectId = subjectId;

    // If subjectId not provided, query the session
    if (!actualSubjectId) {
      console.log('subjectId not provided, querying session...');
      const { data: session, error: sessionError } = await supabase
        .from('test_sessions')
        .select('subject_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        throw sessionError;
      }

      if (!session || !session.subject_id) {
        throw new Error('Session not found or missing subject_id');
      }

      actualSubjectId = session.subject_id;
    }

    console.log('Fetching questions for subject:', actualSubjectId);

    // Get available questions for this subject
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', actualSubjectId)
      .eq('is_active', true);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    // Select next question using CAT algorithm
    const nextQuestion = testState.questionsAnswered === 0
      ? selectInitialQuestion(questions)
      : selectNextQuestion(
          testState.currentTheta,
          questions,
          testState.usedQuestionIds
        );

    if (!nextQuestion) {
      return {
        success: false,
        error: 'No suitable question found'
      };
    }

    return {
      success: true,
      question: nextQuestion,
      progress: {
        answered: testState.questionsAnswered,
        total: testState.targetQuestions,
        currentAbility: thetaToPercentage(testState.currentTheta),
        standardError: testState.standardError
      }
    };
  } catch (error) {
    console.error('Error getting adaptive question:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submit answer for ability assessment
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} question - Question object
 * @param {string} answer - Selected answer
 * @param {number} timeTaken - Time taken
 * @param {Object} testState - Current test state
 * @returns {Object} Updated test state and result
 */
export async function submitAbilityAnswer(sessionId, question, answer, timeTaken, testState) {
  try {
    const isCorrect = answer === question.correct_answer;

    // Get session
    const { data: session } = await supabase
      .from('test_sessions')
      .select('student_id')
      .eq('id', sessionId)
      .single();

    // Process response using CAT algorithm
    const updatedState = processResponse(testState, question, answer, timeTaken);

    // Save response to database
    const { error: responseError } = await supabase
      .from('student_responses')
      .insert({
        session_id: sessionId,
        question_id: question.id,
        student_id: session.student_id,
        selected_answer: answer,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken,
        ability_before: testState.currentTheta,
        ability_after: updatedState.currentTheta,
        question_order: updatedState.questionsAnswered
      });

    if (responseError) throw responseError;

    // Update session
    const { error: updateError } = await supabase
      .from('test_sessions')
      .update({
        questions_answered: updatedState.questionsAnswered
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return {
      success: true,
      isCorrect,
      correctAnswer: question.correct_answer,
      testState: updatedState,
      isComplete: updatedState.isComplete
    };
  } catch (error) {
    console.error('Error submitting ability answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete ability assessment and save results
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} testState - Final test state
 * @returns {Object} Assessment results
 */
export async function completeAbilityAssessment(sessionId, testState) {
  try {
    // Get statistics
    const stats = getTestStatistics(testState);
    
    // Calculate confidence interval
    const confidenceInterval = calculateConfidenceInterval(
      stats.finalTheta,
      stats.standardError
    );

    // Get session
    const { data: session } = await supabase
      .from('test_sessions')
      .select('student_id, subject_id')
      .eq('id', sessionId)
      .single();

    // Update session with final results
    const { error: sessionError } = await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_ability_estimate: stats.finalTheta,
        standard_error: stats.standardError,
        confidence_interval_lower: confidenceInterval.lower,
        confidence_interval_upper: confidenceInterval.upper,
        total_time_seconds: stats.totalTimeSeconds
      })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    // Save/update ability score
    const abilityScore = thetaToPercentage(stats.finalTheta);
    const confidenceLevel = Math.max(0, 100 - (stats.standardError / 0.5) * 100);

    const { error: abilityError } = await supabase
      .from('student_abilities')
      .upsert({
        student_id: session.student_id,
        subject_id: session.subject_id,
        ability_score: abilityScore,
        theta_estimate: stats.finalTheta,
        standard_error: stats.standardError,
        confidence_level: confidenceLevel,
        total_questions_answered: stats.questionsAnswered,
        correct_answers: stats.correctCount,
        accuracy_rate: stats.accuracy,
        last_assessed_at: new Date().toISOString(),
        last_session_id: sessionId
      }, {
        onConflict: 'student_id,subject_id'
      });

    if (abilityError) throw abilityError;

    return {
      success: true,
      results: {
        abilityScore,
        theta: stats.finalTheta,
        standardError: stats.standardError,
        confidenceInterval,
        accuracy: stats.accuracy,
        questionsAnswered: stats.questionsAnswered,
        totalTime: stats.totalTimeSeconds
      }
    };
  } catch (error) {
    console.error('Error completing ability assessment:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update student interest profile
 * 
 * @param {string} studentId - Student ID
 * @param {string} subjectId - Subject ID
 * @param {Object} interaction - Interaction data
 * @returns {Object} Result
 */
async function updateStudentInterest(studentId, subjectId, interaction) {
  try {
    // Get current profile
    const { data: currentProfile } = await supabase
      .from('student_interests')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .single();

    // Update profile
    const updated = updateInterestProfile(currentProfile, {
      ...interaction,
      subjectId
    });

    // Save to database
    const { error } = await supabase
      .from('student_interests')
      .upsert({
        student_id: studentId,
        subject_id: subjectId,
        interest_score: updated.interestScore,
        time_spent_seconds: updated.timeSpent,
        questions_attempted: updated.questionsAttempted,
        voluntary_attempts: updated.voluntaryAttempts,
        avg_time_per_question: updated.avgTimePerQuestion,
        completion_rate: updated.completionRate
      }, {
        onConflict: 'student_id,subject_id'
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating student interest:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate personalized recommendations for student
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Recommendations
 */
export async function generateStudentRecommendations(studentId) {
  try {
    // Get all abilities
    const { data: abilities } = await supabase
      .from('student_abilities')
      .select('*, subjects(*)')
      .eq('student_id', studentId);

    // Get all interests
    const { data: interests } = await supabase
      .from('student_interests')
      .select('*')
      .eq('student_id', studentId);

    // Combine data
    const studentData = {};
    
    abilities?.forEach(ability => {
      studentData[ability.subject_id] = {
        subjectId: ability.subject_id,
        abilityScore: ability.ability_score,
        interestScore: 50, // default
        confidence: ability.confidence_level,
        assessmentCount: 1,
        category: ability.subjects.category
      };
    });

    interests?.forEach(interest => {
      if (studentData[interest.subject_id]) {
        studentData[interest.subject_id].interestScore = interest.interest_score;
      }
    });

    // Calculate learning potential for each subject
    for (const subjectId in studentData) {
      const potential = calculateLearningPotential(studentData[subjectId]);
      studentData[subjectId].potentialScore = potential;

      // Save to database
      await supabase
        .from('student_learning_potential')
        .upsert({
          student_id: studentId,
          subject_id: subjectId,
          potential_score: potential,
          ability_component: studentData[subjectId].abilityScore,
          interest_component: studentData[subjectId].interestScore,
          confidence_level: studentData[subjectId].confidence
        }, {
          onConflict: 'student_id,subject_id'
        });
    }

    // Generate recommendations
    const recommendations = generateRecommendations(studentData, {
      topN: 5,
      minInterest: 30
    });

    // Save recommendations
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      await supabase
        .from('student_recommendations')
        .insert({
          student_id: studentId,
          subject_id: rec.subjectId,
          rank: i + 1,
          recommendation_score: rec.recommendationScore,
          reason_en: rec.reasoning?.en,
          reason_ar: rec.reasoning?.ar,
          reason_he: rec.reasoning?.he,
          status: 'active',
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });
    }

    return {
      success: true,
      recommendations
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  startInterestDiscovery,
  getInterestDiscoveryQuestion,
  submitInterestDiscoveryAnswer,
  completeInterestDiscovery,
  startAbilityAssessment,
  getAdaptiveQuestion,
  submitAbilityAnswer,
  completeAbilityAssessment,
  generateStudentRecommendations
};
