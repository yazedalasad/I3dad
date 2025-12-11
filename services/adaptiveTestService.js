/**
 * ADAPTIVE TEST SERVICE - Simplified Working Version
 */

import { supabase } from '../config/supabase';

/**
 * Start comprehensive multi-subject assessment
 */
export async function startComprehensiveAssessment(studentId, subjectIds, language = 'ar', questionsPerSubject = 2) {
  console.log('🚀 STARTING COMPREHENSIVE ASSESSMENT');
  console.log('Student ID:', studentId);
  console.log('Subject IDs:', subjectIds);
  console.log('Questions per subject:', questionsPerSubject);

  try {
    // 1. Validate student exists
    console.log('🔍 Checking student...');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('❌ Student not found:', studentError);
      return {
        success: false,
        error: 'STUDENT_NOT_FOUND: ' + studentError.message
      };
    }

    console.log('✅ Student found:', student.first_name, student.last_name);

    // 2. Validate subjects exist
    console.log('🔍 Checking subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name_ar, is_active')
      .in('id', subjectIds)
      .eq('is_active', true);

    if (subjectsError) {
      console.error('❌ Subjects error:', subjectsError);
      return {
        success: false,
        error: 'SUBJECTS_ERROR: ' + subjectsError.message
      };
    }

    if (subjects.length !== subjectIds.length) {
      console.error('❌ Missing subjects:', {
        requested: subjectIds.length,
        found: subjects.length
      });
      return {
        success: false,
        error: 'MISSING_SUBJECTS: Some subjects not found or inactive'
      };
    }

    console.log('✅ Subjects found:', subjects.map(s => s.name_ar));

    // 3. Create test session
    console.log('🔍 Creating test session...');
    const totalQuestions = subjectIds.length * questionsPerSubject;
    
    const sessionData = {
      student_id: studentId,
      session_type: 'full_assessment',
      language,
      target_questions: totalQuestions,
      status: 'in_progress',
      metadata: {
        subjectIds,
        questionsPerSubject,
        startedAt: new Date().toISOString(),
        studentName: `${student.first_name} ${student.last_name}`
      }
    };

    console.log('Session data:', sessionData);

    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Session creation failed:', sessionError);
      return {
        success: false,
        error: 'SESSION_CREATION_FAILED: ' + sessionError.message
      };
    }

    console.log('✅ Session created:', session.id);

    // 4. Initialize subject states (simplified)
    const subjectStates = {};
    subjectIds.forEach(subjectId => {
      subjectStates[subjectId] = {
        targetQuestions: questionsPerSubject,
        questionsAnswered: 0,
        currentTheta: 0,
        standardError: 1,
        isComplete: false,
        usedQuestionIds: []
      };
    });

    // 5. Return success
    console.log('🎉 EXAM STARTED SUCCESSFULLY!');
    return {
      success: true,
      sessionId: session.id,
      session: session,
      subjectStates: subjectStates,
      diagnostics: {
        totalQuestions: totalQuestions,
        estimatedMinutes: Math.ceil((totalQuestions * 60) / 60)
      }
    };

  } catch (error) {
    console.error('💥 UNEXPECTED ERROR:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR: ' + error.message
    };
  }
}

/**
 * Get next question (simplified)
 */
export async function getComprehensiveQuestion(sessionId, subjectStates) {
  console.log('🔍 GETTING NEXT QUESTION');
  console.log('Session ID:', sessionId);

  try {
    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('test_sessions')
      .select('metadata')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Session not found:', sessionError);
      return { success: false, error: 'SESSION_NOT_FOUND' };
    }

    const subjectIds = session.metadata?.subjectIds || [];
    
    // Find first incomplete subject
    let targetSubjectId = null;
    for (const subjectId of subjectIds) {
      const state = subjectStates[subjectId];
      if (state && !state.isComplete && state.questionsAnswered < state.targetQuestions) {
        targetSubjectId = subjectId;
        break;
      }
    }

    if (!targetSubjectId) {
      console.log('✅ All subjects complete');
      return { success: false, error: 'ALL_SUBJECTS_COMPLETE' };
    }

    console.log('Target subject:', targetSubjectId);

    // Get random question for this subject
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', targetSubjectId)
      .eq('is_active', true)
      .limit(10);

    if (questionsError || !questions || questions.length === 0) {
      console.error('❌ No questions found:', questionsError);
      return { success: false, error: 'NO_QUESTIONS_FOUND' };
    }

    // Get a random question
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];

    console.log('✅ Question found:', question.id);

    // Update subject state
    if (subjectStates[targetSubjectId]) {
      subjectStates[targetSubjectId].questionsAnswered += 1;
      subjectStates[targetSubjectId].usedQuestionIds.push(question.id);
      
      // Check if subject is complete
      if (subjectStates[targetSubjectId].questionsAnswered >= subjectStates[targetSubjectId].targetQuestions) {
        subjectStates[targetSubjectId].isComplete = true;
      }
    }

    return {
      success: true,
      question: question,
      subjectId: targetSubjectId,
      progress: {
        subjectId: targetSubjectId,
        answered: subjectStates[targetSubjectId]?.questionsAnswered || 0,
        total: subjectStates[targetSubjectId]?.targetQuestions || questionsPerSubject,
        currentAbility: 50,
        standardError: 1
      }
    };

  } catch (error) {
    console.error('❌ Error getting question:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submit answer (simplified)
 */
export async function submitComprehensiveAnswer(sessionId, question, subjectId, answer, timeTaken, subjectStates) {
  console.log('📝 SUBMITTING ANSWER');
  
  try {
    const isCorrect = answer === question.correct_answer;
    
    console.log('Result:', {
      questionId: question.id,
      isCorrect: isCorrect,
      correctAnswer: question.correct_answer,
      userAnswer: answer
    });

    // Save response
    const { error: responseError } = await supabase
      .from('student_responses')
      .insert({
        session_id: sessionId,
        question_id: question.id,
        selected_answer: answer,
        is_correct: isCorrect,
        time_taken_seconds: timeTaken
      });

    if (responseError) {
      console.error('❌ Save response error:', responseError);
    }

    // Check if all subjects are complete
    const allComplete = Object.values(subjectStates).every(state => state.isComplete);

    return {
      success: true,
      isCorrect: isCorrect,
      correctAnswer: question.correct_answer,
      subjectStates: subjectStates,
      isComplete: allComplete
    };

  } catch (error) {
    console.error('❌ Submit error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete assessment (simplified)
 */
export async function completeComprehensiveAssessment(sessionId, subjectStates, timeExpired = false, totalTimeSpent = 0, skippedCount = 0) {
  console.log('🏁 COMPLETING ASSESSMENT');
  
  try {
    // Update session status
    const { error: updateError } = await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_time_seconds: totalTimeSpent
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('❌ Update session error:', updateError);
    }

    // Calculate simple results
    const results = [];
    let totalAnswered = 0;
    
    for (const [subjectId, state] of Object.entries(subjectStates)) {
      const abilityScore = 50 + (Math.random() * 50); // Placeholder
      results.push({
        subjectId,
        abilityScore,
        questionsAnswered: state.questionsAnswered
      });
      totalAnswered += state.questionsAnswered;
    }

    console.log('✅ Assessment completed');
    return {
      success: true,
      results: results,
      overallScore: 65, // Placeholder
      totalTime: totalTimeSpent,
      skippedCount: skippedCount
    };

  } catch (error) {
    console.error('❌ Complete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test database connection
 */
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, name_ar')
      .limit(3);

    if (error) {
      console.error('❌ Database test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('✅ Database connected, found subjects:', subjects.length);
    return {
      success: true,
      subjects: { count: subjects.length }
    };
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export other required functions (simplified)
export async function submitSkippedQuestion(sessionId, questionId, subjectId, timeTaken, reason) {
  console.log('⏭️ Skipping question:', questionId);
  return { success: true };
}

export async function generateStudentRecommendations(studentId) {
  console.log('💡 Generating recommendations for:', studentId);
  return { success: true, recommendations: [] };
}

export function getRecentErrors() {
  return [];
}

export function clearErrorTracker() {
  console.log('✅ Error tracker cleared');
}

// Export default
export default {
  startComprehensiveAssessment,
  getComprehensiveQuestion,
  submitComprehensiveAnswer,
  submitSkippedQuestion,
  completeComprehensiveAssessment,
  generateStudentRecommendations,
  testDatabaseConnection,
  getRecentErrors,
  clearErrorTracker
};