/**
 * PERSONALITY TEST SERVICE
 * 
 * Orchestrates personality assessment using Big Five model
 * Supports multiple question types: 10-point scale, multiple choice, open-ended
 * Integrates with DeepSeek AI for question generation and insights
 */

import { supabase } from '../config/supabase';

/**
 * Start a new personality test session
 * 
 * @param {string} studentId - Student ID
 * @param {string} language - Test language ('ar' or 'he')
 * @returns {Object} Session data
 */
export async function startPersonalityTest(studentId, language = 'ar') {
  try {
    // Create test session
    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .insert({
        student_id: studentId,
        language,
        total_questions: 50,
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
    console.error('Error starting personality test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get next personality question
 * Ensures balanced coverage across all dimensions
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object} Next question
 */
export async function getPersonalityQuestion(sessionId) {
  try {
    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .select('*, student_id, language')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get already answered questions
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select('question_id, personality_questions(dimension_id)')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    // Count questions per dimension
    const dimensionCounts = {};
    const usedQuestionIds = [];
    
    responses?.forEach(r => {
      usedQuestionIds.push(r.question_id);
      const dimensionId = r.personality_questions?.dimension_id;
      if (dimensionId) {
        dimensionCounts[dimensionId] = (dimensionCounts[dimensionId] || 0) + 1;
      }
    });

    // Get all dimensions
    const { data: dimensions } = await supabase
      .from('personality_dimensions')
      .select('id')
      .eq('is_active', true)
      .order('display_order');

    // Find dimension with fewest questions
    let targetDimensionId = null;
    let minCount = Infinity;

    dimensions?.forEach(dimension => {
      const count = dimensionCounts[dimension.id] || 0;
      if (count < minCount) {
        minCount = count;
        targetDimensionId = dimension.id;
      }
    });

    // Get random question from target dimension
    let query = supabase
      .from('personality_questions')
      .select('*, personality_dimensions(*)')
      .eq('dimension_id', targetDimensionId)
      .eq('is_active', true);

    if (usedQuestionIds.length > 0) {
      query = query.not('id', 'in', `(${usedQuestionIds.join(',')})`);
    }

    const { data: questions, error: questionsError } = await query.limit(10);

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
        total: session.total_questions
      }
    };
  } catch (error) {
    console.error('Error getting personality question:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Submit personality question answer
 * 
 * @param {string} sessionId - Session ID
 * @param {string} questionId - Question ID
 * @param {Object} answer - Answer data (varies by question type)
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Object} Result
 */
export async function submitPersonalityAnswer(sessionId, questionId, answer, timeTaken) {
  try {
    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('personality_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;

    // Get session
    const { data: session } = await supabase
      .from('personality_test_sessions')
      .select('student_id, questions_answered')
      .eq('id', sessionId)
      .single();

    // Prepare response data based on question type
    const responseData = {
      session_id: sessionId,
      question_id: questionId,
      student_id: session.student_id,
      response_type: question.question_type,
      time_taken_seconds: timeTaken,
      question_order: session.questions_answered + 1
    };

    // Add type-specific data
    if (question.question_type === 'scale_10') {
      responseData.scale_value = answer.scaleValue;
    } else if (question.question_type === 'multiple_choice') {
      responseData.selected_option_index = answer.optionIndex;
      responseData.selected_option_text_ar = answer.optionTextAr;
      responseData.selected_option_text_he = answer.optionTextHe;
    } else if (question.question_type === 'open_ended') {
      responseData.text_response = answer.textResponse;
    }

    // Save response
    const { error: responseError } = await supabase
      .from('personality_responses')
      .insert(responseData);

    if (responseError) throw responseError;

    // Update session
    const { error: updateError } = await supabase
      .from('personality_test_sessions')
      .update({
        questions_answered: session.questions_answered + 1
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return {
      success: true
    };
  } catch (error) {
    console.error('Error submitting personality answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Complete personality test and calculate profile
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object} Personality profile
 */
export async function completePersonalityTest(sessionId) {
  try {
    // Get all responses
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select(`
        *,
        personality_questions(*, personality_dimensions(*))
      `)
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    // Get session
    const { data: session } = await supabase
      .from('personality_test_sessions')
      .select('student_id')
      .eq('id', sessionId)
      .single();

    // Calculate scores for each dimension
    const dimensionScores = {};
    const dimensionCounts = {};

    responses.forEach(response => {
      const dimension = response.personality_questions.personality_dimensions;
      const dimensionId = dimension.id;
      const question = response.personality_questions;

      if (!dimensionScores[dimensionId]) {
        dimensionScores[dimensionId] = {
          dimensionId,
          dimension,
          totalScore: 0,
          count: 0
        };
      }

      // Calculate score based on question type
      let score = 0;
      if (response.response_type === 'scale_10') {
        score = response.scale_value;
        // Reverse score if needed
        if (question.is_reverse_scored) {
          score = 11 - score; // Reverse 1-10 scale
        }
      } else if (response.response_type === 'multiple_choice') {
        // For multiple choice, assign scores based on option index
        // This is simplified - you may want more sophisticated scoring
        score = response.selected_option_index + 1;
      }

      // Apply weight
      score *= (question.weight || 1.0);

      dimensionScores[dimensionId].totalScore += score;
      dimensionScores[dimensionId].count += 1;
    });

    // Calculate final scores and save profiles
    const profiles = [];
    for (const dimensionId in dimensionScores) {
      const data = dimensionScores[dimensionId];
      const avgScore = data.totalScore / data.count;
      // Normalize to 0-100 scale (assuming max score per question is 10)
      const normalizedScore = (avgScore / 10) * 100;

      // Save profile
      const { error: profileError } = await supabase
        .from('student_personality_profiles')
        .upsert({
          student_id: session.student_id,
          dimension_id: dimensionId,
          dimension_score: normalizedScore,
          raw_score: avgScore,
          total_questions_answered: data.count,
          last_assessed_at: new Date().toISOString(),
          last_session_id: sessionId,
          confidence_level: Math.min(100, (data.count / 10) * 100) // Simple confidence based on question count
        }, {
          onConflict: 'student_id,dimension_id'
        });

      if (profileError) throw profileError;

      profiles.push({
        dimension: data.dimension,
        score: normalizedScore,
        rawScore: avgScore
      });
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('personality_test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_time_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    // Generate AI insights
    await generatePersonalityInsights(session.student_id, sessionId, profiles);

    return {
      success: true,
      profiles
    };
  } catch (error) {
    console.error('Error completing personality test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate AI-powered personality insights using DeepSeek
 * 
 * @param {string} studentId - Student ID
 * @param {string} sessionId - Session ID
 * @param {Array} profiles - Personality dimension profiles
 * @returns {Object} Generated insights
 */
export async function generatePersonalityInsights(studentId, sessionId, profiles) {
  try {
    // Prepare personality profile summary for AI
    const profileSummary = profiles.map(p => 
      `${p.dimension.name_en}: ${p.score.toFixed(1)}%`
    ).join(', ');

    // TODO: Integrate with DeepSeek API
    // For now, generate basic insights based on scores
    const insights = generateBasicInsights(profiles);

    // Save insights
    const { error: insightsError } = await supabase
      .from('personality_insights')
      .upsert({
        student_id: studentId,
        session_id: sessionId,
        personality_type: insights.personalityType,
        personality_type_description_ar: insights.descriptionAr,
        personality_type_description_he: insights.descriptionHe,
        strengths_ar: insights.strengthsAr,
        strengths_he: insights.strengthsHe,
        development_areas_ar: insights.developmentAreasAr,
        development_areas_he: insights.developmentAreasHe,
        recommended_careers_ar: insights.careersAr,
        recommended_careers_he: insights.careersHe,
        study_style_ar: insights.studyStyleAr,
        study_style_he: insights.studyStyleHe,
        communication_style_ar: insights.communicationStyleAr,
        communication_style_he: insights.communicationStyleHe,
        generated_by_ai: false, // Set to true when using actual AI
        ai_model: 'basic_rules' // Change to 'deepseek' when integrated
      }, {
        onConflict: 'session_id'
      });

    if (insightsError) throw insightsError;

    return {
      success: true,
      insights
    };
  } catch (error) {
    console.error('Error generating personality insights:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate basic insights based on personality scores
 * (Placeholder until DeepSeek integration)
 */
function generateBasicInsights(profiles) {
  // Find highest scoring dimensions
  const sorted = [...profiles].sort((a, b) => b.score - a.score);
  const top2 = sorted.slice(0, 2);

  // Determine personality type based on top dimensions
  let personalityType = 'متوازن'; // Balanced
  if (top2[0].score > 70) {
    personalityType = top2[0].dimension.name_ar;
  }

  return {
    personalityType,
    descriptionAr: `شخصيتك تتميز بـ${top2[0].dimension.name_ar} العالي و${top2[1].dimension.name_ar} الجيد.`,
    descriptionHe: `האישיות שלך מאופיינת ב${top2[0].dimension.name_he} גבוה ו${top2[1].dimension.name_he} טוב.`,
    strengthsAr: [
      `${top2[0].dimension.description_ar}`,
      `${top2[1].dimension.description_ar}`
    ],
    strengthsHe: [
      `${top2[0].dimension.description_he}`,
      `${top2[1].dimension.description_he}`
    ],
    developmentAreasAr: [
      'تطوير مهارات التواصل',
      'تحسين إدارة الوقت'
    ],
    developmentAreasHe: [
      'פיתוח כישורי תקשורת',
      'שיפור ניהול זמן'
    ],
    careersAr: [
      'مهندس برمجيات',
      'مصمم جرافيك',
      'معلم'
    ],
    careersHe: [
      'מהנדס תוכנה',
      'מעצב גרפי',
      'מורה'
    ],
    studyStyleAr: 'أنت تتعلم بشكل أفضل من خلال التطبيق العملي والتجربة المباشرة.',
    studyStyleHe: 'אתה לומד הכי טוב דרך יישום מעשי וניסיון ישיר.',
    communicationStyleAr: 'أنت تفضل التواصل المباشر والواضح مع الآخرين.',
    communicationStyleHe: 'אתה מעדיף תקשורת ישירה וברורה עם אחרים.'
  };
}

/**
 * Get student personality profile
 * 
 * @param {string} studentId - Student ID
 * @returns {Object} Personality profile with insights
 */
export async function getStudentPersonalityProfile(studentId) {
  try {
    // Get personality profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('student_personality_profiles')
      .select('*, personality_dimensions(*)')
      .eq('student_id', studentId);

    if (profilesError) throw profilesError;

    // Get latest insights
    const { data: insights, error: insightsError } = await supabase
      .from('personality_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Don't throw error if no insights found
    const latestInsights = insightsError ? null : insights;

    return {
      success: true,
      profiles,
      insights: latestInsights
    };
  } catch (error) {
    console.error('Error getting personality profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  startPersonalityTest,
  getPersonalityQuestion,
  submitPersonalityAnswer,
  completePersonalityTest,
  generatePersonalityInsights,
  getStudentPersonalityProfile
};
