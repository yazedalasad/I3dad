import { supabase } from '../config/supabase';

const HEARTBEAT_ACTIVE_GAP_SECONDS = 30;

// Adaptive limits (defaults)
const DEFAULT_MIN_Q = 2;
const DEFAULT_MAX_Q = 7;

// Stop rule thresholds (tweak if you want)
const CONFIDENCE_STOP_AT = 75; // 0..100
const SE_STOP_AT = 0.20; // lower => stricter (0.20 is reasonable for 2..7 range)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Simple confidence model from accuracy standard error:
 * p = correct/n
 * se = sqrt(p(1-p)/n)
 * confidence = 100 * (1 - 2*se)
 * (works well enough for stopping 2..7 questions without full IRT)
 */
function computeSubjectStats(correct, answered) {
  const n = Math.max(0, Number(answered || 0));
  const c = Math.max(0, Number(correct || 0));
  if (n <= 0) {
    return { accuracy: 0, standardError: 1, confidence: 0 };
  }

  const p = clamp(c / n, 0, 1);
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, n));
  const confidence = clamp(Math.round((1 - 2 * se) * 100), 0, 100);

  return {
    accuracy: Math.round(p * 100),
    standardError: Number(se.toFixed(4)),
    confidence
  };
}

function resolveMinMax({ minQuestionsPerSubject, maxQuestionsPerSubject, questionsPerSubject }) {
  // Backward compatible:
  // - if caller still sends questionsPerSubject (old behavior),
  //   treat it as BOTH min and max.
  const legacy = Number(questionsPerSubject);
  const minQ =
    Number.isFinite(Number(minQuestionsPerSubject))
      ? Number(minQuestionsPerSubject)
      : Number.isFinite(legacy)
        ? legacy
        : DEFAULT_MIN_Q;

  const maxQ =
    Number.isFinite(Number(maxQuestionsPerSubject))
      ? Number(maxQuestionsPerSubject)
      : Number.isFinite(legacy)
        ? legacy
        : DEFAULT_MAX_Q;

  return {
    minQ: clamp(Math.floor(minQ), 1, 50),
    maxQ: clamp(Math.floor(Math.max(maxQ, minQ)), 1, 50)
  };
}

/* -------------------------------------------------- */
/* HEARTBEAT                                          */
/* -------------------------------------------------- */
export async function recordHeartbeat({
  sessionId,
  studentId,
  eventType = 'heartbeat',
  metadata = {}
}) {
  try {
    await supabase.from('test_session_heartbeats').insert({
      session_id: sessionId,
      student_id: studentId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    // heartbeat failure must NOT break the exam
    return { success: false, error: e?.message || String(e) };
  }
}

/* -------------------------------------------------- */
/* START TOTAL EXAM                                   */
/* -------------------------------------------------- */
export async function startComprehensiveAssessment({
  studentId,
  subjectIds,
  language = 'ar',

  // NEW (preferred)
  minQuestionsPerSubject,
  maxQuestionsPerSubject,

  // OLD (still supported)
  questionsPerSubject = 2,

  subjectNames = null
}) {
  try {
    if (!studentId) return { success: false, error: 'MISSING_STUDENT_ID' };
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return { success: false, error: 'NO_SUBJECT_IDS' };
    }

    const { minQ, maxQ } = resolveMinMax({
      minQuestionsPerSubject,
      maxQuestionsPerSubject,
      questionsPerSubject
    });

    // Validate subjects
    const { data: subjects, error: subjErr } = await supabase
      .from('subjects')
      .select('id, is_active')
      .in('id', subjectIds);

    if (subjErr) {
      return { success: false, error: 'SUBJECTS_QUERY_ERROR: ' + subjErr.message };
    }

    const activeSubjectIds = (subjects || [])
      .filter((s) => s.is_active)
      .map((s) => s.id);

    if (activeSubjectIds.length === 0) {
      return { success: false, error: 'NO_ACTIVE_SUBJECTS' };
    }

    // Use maxQ for target_questions so progress bars can still work
    const totalQuestions = activeSubjectIds.length * Number(maxQ);

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from('test_sessions')
      .insert({
        student_id: studentId,
        session_type: 'full_assessment',
        language,
        target_questions: totalQuestions,
        status: 'in_progress',
        metadata: {
          examType: 'total_exam',
          subjectIds: activeSubjectIds,
          subjectNames,

          // store both (new)
          minQuestionsPerSubject: minQ,
          maxQuestionsPerSubject: maxQ,

          // keep old for compatibility
          questionsPerSubject: Number(questionsPerSubject || 2),

          startedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (sessionErr) {
      return { success: false, error: 'SESSION_CREATION_FAILED: ' + sessionErr.message };
    }

    // Create per-subject states in DB
    // Keep using target_questions column, but set it to maxQ (the cap)
    const subjectRows = activeSubjectIds.map((sid) => ({
      session_id: session.id,
      student_id: studentId,
      subject_id: sid,
      target_questions: Number(maxQ),
      questions_answered: 0,
      correct_answers: 0,
      is_complete: false,
      metadata: {
        usedQuestionIds: [],
        minQuestions: Number(minQ),
        maxQuestions: Number(maxQ),
        confidence: 0,
        standardError: 1,
        accuracy: 0
      }
    }));

    const { error: insertErr } = await supabase
      .from('test_session_subjects')
      .insert(subjectRows);

    if (insertErr) {
      await supabase.from('test_sessions').update({ status: 'abandoned' }).eq('id', session.id);
      return {
        success: false,
        error: 'SUBJECT_STATE_CREATE_FAILED: ' + insertErr.message
      };
    }

    // Build UI subjectStates
    const subjectStates = {};
    activeSubjectIds.forEach((sid) => {
      subjectStates[sid] = {
        // Keep old field name used by your UI progress calc
        targetQuestions: Number(maxQ),

        // NEW fields
        minQuestions: Number(minQ),
        maxQuestions: Number(maxQ),

        questionsAnswered: 0,
        correctAnswers: 0,
        isComplete: false,

        confidence: 0,
        standardError: 1,
        accuracy: 0,

        usedQuestionIds: []
      };
    });

    return {
      success: true,
      sessionId: session.id,
      studentId,
      subjectIds: activeSubjectIds,
      subjectStates
    };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

/* -------------------------------------------------- */
/* GET NEXT QUESTION                                  */
/* -------------------------------------------------- */
export async function getComprehensiveQuestion(sessionId, subjectStates) {
  try {
    const { data: session, error: sErr } = await supabase
      .from('test_sessions')
      .select('metadata, status, updated_at')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return { success: false, error: 'SESSION_NOT_FOUND: ' + (sErr?.message || 'missing') };
    }
    if (session.status !== 'in_progress') {
      return { success: false, error: 'SESSION_NOT_IN_PROGRESS' };
    }

    const subjectIds = session.metadata?.subjectIds || [];
    if (!subjectIds.length) {
      return { success: false, error: 'NO_SUBJECTS_IN_SESSION' };
    }

    for (const sid of subjectIds) {
      const state = subjectStates?.[sid];
      if (!state) continue;

      const maxQ = Number(state.maxQuestions ?? state.targetQuestions ?? session.metadata?.maxQuestionsPerSubject ?? DEFAULT_MAX_Q);
      const answered = Number(state.questionsAnswered || 0);

      if (state.isComplete || answered >= maxQ) continue;

      const usedIds = new Set(state.usedQuestionIds || []);

      const { data: candidates, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', sid)
        .eq('is_active', true)
        .limit(200);

      if (qErr) {
        return { success: false, error: 'QUESTIONS_QUERY_ERROR: ' + qErr.message };
      }

      const available = (candidates || []).filter((q) => !usedIds.has(q.id));

      if (available.length === 0) {
        // No more questions => subject complete
        const nextState = { ...state, isComplete: true };
        subjectStates[sid] = nextState;

        await supabase
          .from('test_session_subjects')
          .update({ is_complete: true, completed_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('subject_id', sid);

        continue;
      }

      // Random question (you can later upgrade to difficulty-based selection)
      const question = available[Math.floor(Math.random() * available.length)];

      const nextUsed = [...usedIds, question.id];

      // IMPORTANT: update BOTH local state + DB metadata,
      // so next call really moves forward and doesn't repeat
      state.usedQuestionIds = nextUsed;

      await supabase
        .from('test_session_subjects')
        .update({
          metadata: {
            ...(state.metadata || {}),
            usedQuestionIds: nextUsed
          }
        })
        .eq('session_id', sessionId)
        .eq('subject_id', sid);

      return { success: true, question, subjectId: sid };
    }

    return { success: false, error: 'ALL_SUBJECTS_COMPLETE' };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

export async function getNextQuestion({ sessionId, subjectStates }) {
  return getComprehensiveQuestion(sessionId, subjectStates);
}

/* -------------------------------------------------- */
/* SUBMIT ANSWER                                      */
/* -------------------------------------------------- */
export async function submitComprehensiveAnswer({
  sessionId,
  studentId,
  question,
  selectedAnswer,
  timeTakenSeconds,
  subjectStates,
  questionOrder
}) {
  try {
    const isCorrect = selectedAnswer === question.correct_answer;
    const subjectId = question.subject_id;

    const state = subjectStates?.[subjectId];
    if (!state) return { success: false, error: 'SUBJECT_STATE_MISSING' };

    const nextAnswered = Number(state.questionsAnswered || 0) + 1;
    const nextCorrect = Number(state.correctAnswers || 0) + (isCorrect ? 1 : 0);

    const minQ = Number(state.minQuestions ?? DEFAULT_MIN_Q);
    const maxQ = Number(state.maxQuestions ?? state.targetQuestions ?? DEFAULT_MAX_Q);

    const stats = computeSubjectStats(nextCorrect, nextAnswered);

    // Adaptive completion rule:
    // - always do at least minQ
    // - stop early if confident enough (confidence OR standardError)
    // - hard stop at maxQ
    const reachedMin = nextAnswered >= minQ;
    const reachedMax = nextAnswered >= maxQ;

    const confidentEnough =
      reachedMin && (stats.confidence >= CONFIDENCE_STOP_AT || stats.standardError <= SE_STOP_AT);

    const isComplete = reachedMax || confidentEnough;

    const updatedStates = {
      ...subjectStates,
      [subjectId]: {
        ...state,
        questionsAnswered: nextAnswered,
        correctAnswers: nextCorrect,
        isComplete,

        accuracy: stats.accuracy,
        standardError: stats.standardError,
        confidence: stats.confidence
      }
    };

    // Save response
    const { error: respErr } = await supabase.from('test_session_responses').insert({
      session_id: sessionId,
      student_id: studentId,
      subject_id: subjectId,
      question_id: question.id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken_seconds: timeTakenSeconds,
      question_order: questionOrder,
      created_at: new Date().toISOString()
    });

    if (respErr) {
      return { success: false, error: 'RESPONSE_INSERT_FAILED: ' + respErr.message };
    }

    // Persist per-subject progress + metadata
    await supabase
      .from('test_session_subjects')
      .update({
        questions_answered: nextAnswered,
        correct_answers: nextCorrect,
        is_complete: isComplete,
        completed_at: isComplete ? new Date().toISOString() : null,
        metadata: {
          usedQuestionIds: updatedStates[subjectId]?.usedQuestionIds || state.usedQuestionIds || [],
          minQuestions: minQ,
          maxQuestions: maxQ,
          accuracy: stats.accuracy,
          standardError: stats.standardError,
          confidence: stats.confidence
        }
      })
      .eq('session_id', sessionId)
      .eq('subject_id', subjectId);

    return { success: true, isCorrect, subjectStates: updatedStates };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

/* -------------------------------------------------- */
/* COMPLETE SESSION                                   */
/* -------------------------------------------------- */
export async function completeComprehensiveAssessment({
  sessionId,
  studentId,
  subjectStates,
  totalTimeSpentSeconds,
  skippedCount,
  language
}) {
  try {
    await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          finalSubjectStates: subjectStates,
          totalTimeSpentSeconds,
          skippedCount,
          language
        }
      })
      .eq('id', sessionId);

    await recordHeartbeat({
      sessionId,
      studentId,
      eventType: 'complete',
      metadata: { totalTimeSpentSeconds, skippedCount }
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

/* -------------------------------------------------- */
/* RECOMMENDATIONS (FIX FOR WEB ERROR)                 */
/* -------------------------------------------------- */
export async function generateStudentRecommendations(studentId) {
  // Stub implementation so TestResultsScreen compiles
  // You can replace this later with real logic
  return { success: true, recommendations: [] };
}

/* -------------------------------------------------- */
/* DEFAULT EXPORT                                     */
/* -------------------------------------------------- */
export default {
  startComprehensiveAssessment,
  getComprehensiveQuestion,
  getNextQuestion,
  submitComprehensiveAnswer,
  completeComprehensiveAssessment,
  recordHeartbeat,
  generateStudentRecommendations
};
