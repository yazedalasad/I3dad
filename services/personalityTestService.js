/**
 * PERSONALITY TEST SERVICE
 *
 * Orchestrates personality assessment using Big Five model
 * Supports multiple question types: 10-point scale, multiple choice, open-ended
 * Integrates with AI (placeholder now) for insights
 */

import { supabase } from '../config/supabase';

function quoteUuidsForIn(ids = []) {
  // Supabase "in" string must look like: ("uuid1","uuid2")
  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * Start a new personality test session
 *
 * @param {string} studentId
 * @param {'ar'|'he'} language
 */
export async function startPersonalityTest(studentId, language = 'ar') {
  try {
    if (!studentId) throw new Error('studentId is required');

    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .insert({
        student_id: studentId,
        language,
        total_questions: 50,
        status: 'in_progress',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return { success: true, sessionId: session.id, session };
  } catch (error) {
    console.error('Error starting personality test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get next personality question (balanced by dimension)
 *
 * @param {string} sessionId
 */
export async function getPersonalityQuestion(sessionId) {
  try {
    if (!sessionId) throw new Error('sessionId is required');

    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .select('id, student_id, language, total_questions, questions_answered, status')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in_progress') {
      return { success: false, error: 'Session is not in progress' };
    }

    // Fetch answered question ids + their dimension_id
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select('question_id, personality_questions(dimension_id)')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    const usedQuestionIds = [];
    const dimensionCounts = {};

    (responses || []).forEach((r) => {
      if (r?.question_id) usedQuestionIds.push(r.question_id);
      const dimensionId = r?.personality_questions?.dimension_id;
      if (dimensionId) {
        dimensionCounts[dimensionId] = (dimensionCounts[dimensionId] || 0) + 1;
      }
    });

    // All active dimensions (ordered)
    const { data: dimensions, error: dimErr } = await supabase
      .from('personality_dimensions')
      .select('id')
      .eq('is_active', true)
      .order('display_order');

    if (dimErr) throw dimErr;
    if (!dimensions || dimensions.length === 0) {
      throw new Error('No active personality dimensions found');
    }

    // Pick the dimension with fewest questions answered
    let targetDimensionId = dimensions[0].id;
    let minCount = Number.POSITIVE_INFINITY;

    for (const d of dimensions) {
      const count = dimensionCounts[d.id] || 0;
      if (count < minCount) {
        minCount = count;
        targetDimensionId = d.id;
      }
    }

    // Pull candidate questions
    let query = supabase
      .from('personality_questions')
      .select('*, personality_dimensions(*)')
      .eq('dimension_id', targetDimensionId)
      .eq('is_active', true)
      .limit(20);

    if (usedQuestionIds.length > 0) {
      query = query.not('id', 'in', quoteUuidsForIn(usedQuestionIds));
    }

    const { data: questions, error: questionsError } = await query;
    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return { success: false, error: 'No more questions available' };
    }

    const question = questions[Math.floor(Math.random() * questions.length)];

    return {
      success: true,
      question,
      progress: {
        answered: usedQuestionIds.length,
        total: safeNumber(session.total_questions, 50),
      },
    };
  } catch (error) {
    console.error('Error getting personality question:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit personality question answer
 *
 * @param {string} sessionId
 * @param {string} questionId
 * @param {object} answer
 * @param {number} timeTakenSeconds
 */
export async function submitPersonalityAnswer(sessionId, questionId, answer, timeTakenSeconds) {
  try {
    if (!sessionId) throw new Error('sessionId is required');
    if (!questionId) throw new Error('questionId is required');

    const timeTaken = Math.max(0, Math.floor(safeNumber(timeTakenSeconds, 0)));

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('personality_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;
    if (!question) throw new Error('Question not found');

    // Get session
    const { data: session, error: sessionErr } = await supabase
      .from('personality_test_sessions')
      .select('id, student_id, questions_answered, status')
      .eq('id', sessionId)
      .single();

    if (sessionErr) throw sessionErr;
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in_progress') throw new Error('Session is not in progress');

    const nextOrder = safeNumber(session.questions_answered, 0) + 1;

    const responseData = {
      session_id: sessionId,
      question_id: questionId,
      student_id: session.student_id,
      response_type: question.question_type,
      time_taken_seconds: timeTaken,
      question_order: nextOrder,
    };

    // Type-specific fields + validation
    if (question.question_type === 'scale_10') {
      const v = safeNumber(answer?.scaleValue, NaN);
      if (!Number.isFinite(v) || v < 1 || v > 10) {
        throw new Error('scaleValue must be between 1 and 10');
      }
      responseData.scale_value = v;
    } else if (question.question_type === 'multiple_choice') {
      const idx = safeNumber(answer?.optionIndex, NaN);
      if (!Number.isFinite(idx) || idx < 0) throw new Error('optionIndex is invalid');

      responseData.selected_option_index = idx;
      responseData.selected_option_text_ar = answer?.optionTextAr ?? null;
      responseData.selected_option_text_he = answer?.optionTextHe ?? null;
    } else if (question.question_type === 'open_ended') {
      const text = String(answer?.textResponse ?? '').trim();
      if (!text) throw new Error('textResponse is required');
      responseData.text_response = text;
    } else {
      throw new Error(`Unsupported question type: ${question.question_type}`);
    }

    const { error: responseError } = await supabase.from('personality_responses').insert(responseData);
    if (responseError) throw responseError;

    // Update session counters
    const { error: updateError } = await supabase
      .from('personality_test_sessions')
      .update({ questions_answered: nextOrder })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error submitting personality answer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete personality test and calculate profile
 *
 * @param {string} sessionId
 */
export async function completePersonalityTest(sessionId) {
  try {
    if (!sessionId) throw new Error('sessionId is required');

    // Get all responses (with question + dimension)
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select('*, personality_questions(*, personality_dimensions(*))')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .select('student_id, started_at')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');

    if (!responses || responses.length === 0) {
      // still mark completed but no profiles
      const { error: updateError } = await supabase
        .from('personality_test_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          total_time_seconds: 0,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      return { success: true, profiles: [] };
    }

    // Aggregate per dimension
    const dimensionAgg = {}; // { [dimensionId]: { dimension, totalScore, count } }

    for (const r of responses) {
      const q = r?.personality_questions;
      const dim = q?.personality_dimensions;
      if (!q || !dim) continue;

      const dimensionId = dim.id;
      if (!dimensionAgg[dimensionId]) {
        dimensionAgg[dimensionId] = { dimension: dim, totalScore: 0, count: 0 };
      }

      let score = 0;

      if (r.response_type === 'scale_10') {
        score = safeNumber(r.scale_value, 0);
        if (q.is_reverse_scored) score = 11 - score; // reverse 1..10
      } else if (r.response_type === 'multiple_choice') {
        score = safeNumber(r.selected_option_index, 0) + 1; // simple mapping
      } else {
        // open_ended (or others) currently don't affect numeric score
        continue;
      }

      score *= safeNumber(q.weight, 1.0);

      dimensionAgg[dimensionId].totalScore += score;
      dimensionAgg[dimensionId].count += 1;
    }

    const profiles = [];

    for (const [dimensionId, agg] of Object.entries(dimensionAgg)) {
      if (agg.count <= 0) continue;

      const avgScore = agg.totalScore / agg.count; // typically 1..10
      const normalizedScore = (avgScore / 10) * 100;

      const { error: profileError } = await supabase
        .from('student_personality_profiles')
        .upsert(
          {
            student_id: session.student_id,
            dimension_id: dimensionId,
            dimension_score: normalizedScore,
            raw_score: avgScore,
            total_questions_answered: agg.count,
            last_assessed_at: new Date().toISOString(),
            last_session_id: sessionId,
            confidence_level: Math.min(100, (agg.count / 10) * 100),
          },
          { onConflict: 'student_id,dimension_id' }
        );

      if (profileError) throw profileError;

      profiles.push({
        dimension: agg.dimension,
        score: normalizedScore,
        rawScore: avgScore,
      });
    }

    const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
    const totalSeconds =
      startedAt && Number.isFinite(startedAt)
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        : null;

    const { error: updateError } = await supabase
      .from('personality_test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_time_seconds: totalSeconds,
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    // Generate insights (basic placeholder)
    await generatePersonalityInsights(session.student_id, sessionId, profiles);

    return { success: true, profiles };
  } catch (error) {
    console.error('Error completing personality test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate personality insights (placeholder until DeepSeek integration)
 */
export async function generatePersonalityInsights(studentId, sessionId, profiles) {
  try {
    if (!studentId) throw new Error('studentId is required');
    if (!sessionId) throw new Error('sessionId is required');

    const insights = generateBasicInsights(profiles);

    const { error: insightsError } = await supabase
      .from('personality_insights')
      .upsert(
        {
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
          generated_by_ai: false,
          ai_model: 'basic_rules',
        },
        { onConflict: 'session_id' }
      );

    if (insightsError) throw insightsError;

    return { success: true, insights };
  } catch (error) {
    console.error('Error generating personality insights:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate basic insights based on personality scores
 */
function generateBasicInsights(profiles) {
  const safeProfiles = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  const sorted = [...safeProfiles].sort((a, b) => safeNumber(b.score, 0) - safeNumber(a.score, 0));
  const top1 = sorted[0] || null;
  const top2 = sorted[1] || null;

  const personalityType =
    top1 && safeNumber(top1.score, 0) > 70 ? top1.dimension?.name_ar || 'متوازن' : 'متوازن';

  const top1Ar = top1?.dimension?.name_ar || 'سمة 1';
  const top2Ar = top2?.dimension?.name_ar || 'سمة 2';
  const top1He = top1?.dimension?.name_he || 'תכונה 1';
  const top2He = top2?.dimension?.name_he || 'תכונה 2';

  return {
    personalityType,
    descriptionAr: `شخصيتك تتميز بـ${top1Ar} و${top2Ar}.`,
    descriptionHe: `האישיות שלך מאופיינת ב${top1He} וב${top2He}.`,
    strengthsAr: [
      top1?.dimension?.description_ar || 'نقاط قوة واضحة في التعامل مع المهام.',
      top2?.dimension?.description_ar || 'قدرة جيدة على التكيّف والتعلّم.',
    ],
    strengthsHe: [
      top1?.dimension?.description_he || 'חוזקות ברורות בהתמודדות עם משימות.',
      top2?.dimension?.description_he || 'יכולת טובה להסתגל וללמוד.',
    ],
    developmentAreasAr: ['تطوير مهارات التواصل', 'تحسين إدارة الوقت'],
    developmentAreasHe: ['פיתוח כישורי תקשורת', 'שיפור ניהול זמן'],
    careersAr: ['مهندس برمجيات', 'مصمم جرافيك', 'معلم'],
    careersHe: ['מהנדס תוכנה', 'מעצב גרפי', 'מורה'],
    studyStyleAr: 'أنت تتعلم بشكل أفضل من خلال التطبيق العملي والتجربة المباشرة.',
    studyStyleHe: 'אתה לומד הכי טוב דרך יישום מעשי וניסיון ישיר.',
    communicationStyleAr: 'أنت تفضل التواصل المباشر والواضح مع الآخرين.',
    communicationStyleHe: 'אתה מעדיף תקשורת ישירה וברורה עם אחרים.',
  };
}

/**
 * Get student personality profile (profiles + latest insights)
 */
export async function getStudentPersonalityProfile(studentId) {
  try {
    if (!studentId) throw new Error('studentId is required');

    const { data: profiles, error: profilesError } = await supabase
      .from('student_personality_profiles')
      .select('*, personality_dimensions(*)')
      .eq('student_id', studentId);

    if (profilesError) throw profilesError;

    const { data: insights, error: insightsError } = await supabase
      .from('personality_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const latestInsights = insightsError ? null : insights;

    return { success: true, profiles: profiles || [], insights: latestInsights };
  } catch (error) {
    console.error('Error getting personality profile:', error);
    return { success: false, error: error.message };
  }
}

export default {
  startPersonalityTest,
  getPersonalityQuestion,
  submitPersonalityAnswer,
  completePersonalityTest,
  generatePersonalityInsights,
  getStudentPersonalityProfile,
};
