/**
 * ABILITY SERVICE - Total Exam (Full Assessment) Ability Tracking
 *
 * Source of truth for ability:
 *  - student_responses joined with questions (subject_id, difficulty)
 *  - test_sessions for session-level timing + engagement
 *
 * Writes:
 *  - student_abilities (upsert per student+subject)
 */

import { supabase } from '../config/supabase';

// ---- Helpers ---------------------------------------------------------

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Convert theta [-3..3] -> ability_score [0..100]
function thetaToAbilityScore(theta) {
  const t = clamp(Number(theta) || 0, -3, 3);
  return Math.round(((t + 3) / 6) * 100);
}

// Very simple theta estimate from responses:
// - if correct => push theta toward question difficulty + bonus
// - if wrong   => push theta below difficulty - penalty
function estimateThetaFromResponses(responses) {
  if (!responses || responses.length === 0) {
    return { theta: 0, se: 1.5, confidence: 20 };
  }

  let sum = 0;
  let weightSum = 0;

  for (const r of responses) {
    const diff = Number(r.questions?.difficulty);
    const disc = Number(r.questions?.discrimination);
    const w = Number.isFinite(disc) && disc > 0 ? clamp(disc, 0.5, 2.0) : 1;

    // Correct means ability should be at/above difficulty.
    // Wrong means below difficulty.
    const point = r.is_correct ? (diff + 0.6) : (diff - 0.6);

    sum += point * w;
    weightSum += w;
  }

  const raw = weightSum > 0 ? sum / weightSum : 0;

  // With more questions, we trust more (smaller SE)
  const n = responses.length;
  const se = clamp(1.2 / Math.sqrt(n), 0.35, 1.8);

  // Confidence grows with n and lower SE
  const confidence = clamp(Math.round((1 / se) * 25), 10, 95);

  return { theta: clamp(raw, -3, 3), se, confidence };
}

function calcAccuracy(correct, total) {
  if (!total || total <= 0) return 0;
  return Number(((correct / total) * 100).toFixed(1));
}

function calcAvgTime(totalSeconds, totalQuestions) {
  if (!totalQuestions || totalQuestions <= 0) return 0;
  return Number((totalSeconds / totalQuestions).toFixed(1));
}

function calculateExamEfficiency({ avgTimePerQuestion, accuracyRate }) {
  const avgTime = avgTimePerQuestion ?? 60;
  const accuracy = accuracyRate ?? 0;

  let level = 'optimal';
  let color = '#27ae60';

  if (avgTime > 90 || accuracy < 50) {
    level = 'needs_improvement';
    color = '#e74c3c';
  } else if (avgTime > 75 || accuracy < 65) {
    level = 'moderate';
    color = '#f39c12';
  } else if (avgTime > 60 || accuracy < 70) {
    level = 'good';
    color = '#3498db';
  }

  return { level, color, avgTime, accuracy };
}

// ---- Core: recompute & upsert abilities after an exam ---------------

/**
 * Recompute abilities for one completed Total Exam session, and upsert into student_abilities.
 * Call this after completion (or from results screen later).
 */
export async function updateAbilitiesFromSession(sessionId) {
  try {
    // 1) Session
    const { data: session, error: sErr } = await supabase
      .from('test_sessions')
      .select('id, student_id, session_type, status, completed_at, language, total_time_seconds, metadata')
      .eq('id', sessionId)
      .single();

    if (sErr) throw sErr;
    if (!session) return { success: false, error: 'SESSION_NOT_FOUND' };
    if (session.status !== 'completed') return { success: false, error: 'SESSION_NOT_COMPLETED' };
    if (session.session_type !== 'full_assessment') {
      return { success: false, error: 'NOT_FULL_ASSESSMENT_SESSION' };
    }

    // 2) Pull responses + question info
    const { data: responses, error: rErr } = await supabase
      .from('student_responses')
      .select('id, question_id, is_correct, time_taken_seconds, questions(subject_id, difficulty, discrimination)')
      .eq('session_id', sessionId)
      .order('question_order', { ascending: true });

    if (rErr) throw rErr;

    // Group by subject
    const bySubject = {};
    for (const r of responses || []) {
      const subjectId = r.questions?.subject_id;
      if (!subjectId) continue;
      if (!bySubject[subjectId]) bySubject[subjectId] = [];
      bySubject[subjectId].push(r);
    }

    const subjectIds = Object.keys(bySubject);
    if (subjectIds.length === 0) {
      return { success: false, error: 'NO_RESPONSES_FOR_SESSION' };
    }

    // 3) Upsert each subject ability row
    const upserts = [];
    for (const subjectId of subjectIds) {
      const list = bySubject[subjectId];
      const total = list.length;
      const correct = list.filter((x) => x.is_correct).length;
      const timeSpent = list.reduce((sum, x) => sum + (Number(x.time_taken_seconds) || 0), 0);

      const { theta, se, confidence } = estimateThetaFromResponses(list);
      const abilityScore = thetaToAbilityScore(theta);
      const accuracyRate = calcAccuracy(correct, total);
      const avgTimePerQuestion = calcAvgTime(timeSpent, total);

      upserts.push({
        student_id: session.student_id,
        subject_id: subjectId,

        ability_score: abilityScore,
        theta_estimate: theta,
        standard_error: se,
        confidence_level: confidence,

        total_questions_answered: total,
        correct_answers: correct,
        accuracy_rate: accuracyRate,

        last_assessed_at: session.completed_at || new Date().toISOString(),
        last_session_id: sessionId,

        metadata: {
          examType: 'total_exam',
          language: session.language,
          avgTimePerQuestion,
          timeSpentSeconds: timeSpent,
          sessionTotalTimeSeconds: session.total_time_seconds ?? null
        }
      });
    }

    // Note: student_abilities has no explicit unique constraint in your schema text,
    // but the service assumes "one row per student+subject". If you have duplicates,
    // add a UNIQUE(student_id, subject_id) in DB later.
    // For now: we try upsert using "student_id,subject_id" constraint name if exists.
    const { error: upErr } = await supabase
      .from('student_abilities')
      .upsert(upserts, { onConflict: 'student_id,subject_id' });

    if (upErr) throw upErr;

    return { success: true, updatedSubjects: subjectIds.length };
  } catch (error) {
    console.error('Error updating abilities from session:', error);
    return { success: false, error: error.message };
  }
}

// ---- Reads ----------------------------------------------------------

/**
 * Get current ability snapshot for all subjects (Total Exam derived)
 */
export async function getStudentAbilities(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_abilities')
      .select(`
        *,
        subjects (
          id,
          name_en,
          name_ar,
          name_he,
          code,
          category,
          point_level
        )
      `)
      .eq('student_id', studentId)
      .order('ability_score', { ascending: false });

    if (error) throw error;

    const abilities = (data || [])
      // keep only ones written by Total Exam pipeline
      .filter((a) => (a.metadata?.examType || '') === 'total_exam')
      .map((a) => {
        const avgTimePerQuestion = a.metadata?.avgTimePerQuestion ?? 60;
        const accuracyRate = a.accuracy_rate ?? 0;
        return {
          ...a,
          examType: 'total_exam',
          timePerQuestion: avgTimePerQuestion,
          examEfficiency: calculateExamEfficiency({ avgTimePerQuestion, accuracyRate })
        };
      });

    return { success: true, abilities };
  } catch (error) {
    console.error('Error fetching student abilities:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get one subject ability snapshot
 */
export async function getSubjectAbility(studentId, subjectId) {
  try {
    const { data, error } = await supabase
      .from('student_abilities')
      .select(`*, subjects(*)`)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .single();

    if (error) {
      // no row yet
      if (error.code === 'PGRST116') {
        return {
          success: true,
          ability: null,
          message: 'No ability yet. Complete a Total Exam to generate an ability score.'
        };
      }
      throw error;
    }

    if ((data.metadata?.examType || '') !== 'total_exam') {
      return {
        success: true,
        ability: null,
        message: 'Ability exists but not from Total Exam pipeline.'
      };
    }

    return {
      success: true,
      ability: {
        ...data,
        examType: 'total_exam',
        timePerQuestion: data.metadata?.avgTimePerQuestion ?? 60
      }
    };
  } catch (error) {
    console.error('Error fetching subject ability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get history for one subject across completed Total Exams
 * Uses student_responses (robust) + session timing.
 */
export async function getAbilityHistory(studentId, subjectId) {
  try {
    // Sessions first
    const { data: sessions, error: sErr } = await supabase
      .from('test_sessions')
      .select('id, completed_at, total_time_seconds, active_time_seconds, engagement_score, session_type, status, metadata')
      .eq('student_id', studentId)
      .eq('session_type', 'full_assessment')
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (sErr) throw sErr;

    if (!sessions || sessions.length === 0) {
      return { success: true, history: [], message: 'No Total Exams completed' };
    }

    const history = [];

    for (const session of sessions) {
      if ((session.metadata?.examType || 'total_exam') !== 'total_exam') continue;

      // pull responses for this subject in this session
      const { data: res, error: rErr } = await supabase
        .from('student_responses')
        .select('is_correct, time_taken_seconds, questions(subject_id, difficulty, discrimination)')
        .eq('session_id', session.id);

      if (rErr) throw rErr;

      const subjectRes = (res || []).filter((x) => x.questions?.subject_id === subjectId);
      if (subjectRes.length === 0) continue;

      const total = subjectRes.length;
      const correct = subjectRes.filter((x) => x.is_correct).length;
      const timeSpent = subjectRes.reduce((sum, x) => sum + (Number(x.time_taken_seconds) || 0), 0);

      const { theta } = estimateThetaFromResponses(subjectRes);
      const abilityScore = thetaToAbilityScore(theta);

      history.push({
        examId: session.id,
        date: session.completed_at,
        abilityScore,
        thetaEstimate: theta,
        accuracy: calcAccuracy(correct, total),
        questionsAnswered: total,
        timeSpentSeconds: timeSpent,
        timePerQuestion: calcAvgTime(timeSpent, total),
        sessionTotalTimeSeconds: session.total_time_seconds ?? null,
        activeTimeSeconds: session.active_time_seconds ?? null,
        engagementScore: session.engagement_score ?? null,
        examType: 'total_exam'
      });
    }

    return { success: true, history };
  } catch (error) {
    console.error('Error fetching ability history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Growth analysis for a subject across Total Exams
 */
export async function calculateAbilityGrowth(studentId, subjectId) {
  try {
    const res = await getAbilityHistory(studentId, subjectId);
    if (!res.success) return res;

    const history = res.history || [];
    if (history.length < 2) {
      return {
        success: true,
        growth: {
          trend: 'insufficient_data',
          assessmentCount: history.length,
          recommendation: 'Complete at least 2 Total Exams to track growth'
        }
      };
    }

    const first = history[0];
    const last = history[history.length - 1];

    const improvement = Number((last.abilityScore - first.abilityScore).toFixed(1));
    const daysSpan = Math.max(
      1,
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const rate = Number((improvement / daysSpan).toFixed(2));
    const timeImprovement =
      first.timePerQuestion > 0
        ? Number((((first.timePerQuestion - last.timePerQuestion) / first.timePerQuestion) * 100).toFixed(1))
        : 0;

    const accuracyImprovement = Number((last.accuracy - first.accuracy).toFixed(1));

    let trend = 'stable';
    let color = '#f39c12';
    let summary = 'Performance remains stable';

    if (improvement >= 10) {
      trend = 'excellent_growth';
      color = '#27ae60';
      summary = 'Strong improvement in ability score';
    } else if (improvement >= 5) {
      trend = 'steady_growth';
      color = '#3498db';
      summary = 'Steady improvement in ability score';
    } else if (improvement <= -10) {
      trend = 'significant_decline';
      color = '#c0392b';
      summary = 'Significant decline in performance';
    } else if (improvement <= -5) {
      trend = 'slight_decline';
      color = '#e74c3c';
      summary = 'Slight decline in performance';
    }

    return {
      success: true,
      growth: {
        trend,
        color,
        summary,
        improvement,
        rate,
        timeImprovement,
        accuracyImprovement,
        assessmentCount: history.length,
        firstScore: first.abilityScore,
        lastScore: last.abilityScore,
        firstDate: first.date,
        lastDate: last.date
      }
    };
  } catch (error) {
    console.error('Error calculating ability growth:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Overall stats summary (Total Exam only)
 */
export async function getAbilityStatistics(studentId) {
  try {
    const { abilities } = await getStudentAbilities(studentId);
    if (!abilities || abilities.length === 0) {
      return {
        success: true,
        stats: {
          examType: 'total_exam',
          totalSubjectsAssessed: 0,
          message: 'No Total Exam ability data yet'
        }
      };
    }

    const avgAbility =
      abilities.reduce((sum, a) => sum + (Number(a.ability_score) || 0), 0) / abilities.length;

    const avgAccuracy =
      abilities.reduce((sum, a) => sum + (Number(a.accuracy_rate) || 0), 0) / abilities.length;

    const avgTime =
      abilities.reduce((sum, a) => sum + (Number(a.metadata?.avgTimePerQuestion) || 0), 0) / abilities.length;

    const sorted = [...abilities].sort((a, b) => (b.ability_score || 0) - (a.ability_score || 0));

    const efficiencyCounts = { optimal: 0, good: 0, moderate: 0, needs_improvement: 0 };
    abilities.forEach((a) => {
      const eff = calculateExamEfficiency({
        avgTimePerQuestion: a.metadata?.avgTimePerQuestion ?? 60,
        accuracyRate: a.accuracy_rate ?? 0
      });
      efficiencyCounts[eff.level] = (efficiencyCounts[eff.level] || 0) + 1;
    });

    return {
      success: true,
      stats: {
        examType: 'total_exam',
        averageAbility: Math.round(avgAbility),
        totalSubjectsAssessed: abilities.length,
        averageTimePerQuestion: Math.round(avgTime),
        averageAccuracy: Math.round(avgAccuracy),
        strongestSubjects: sorted.slice(0, 3).map((a) => ({
          subjectId: a.subject_id,
          name: a.subjects?.name_ar || a.subjects?.name_en,
          score: Math.round(a.ability_score),
          efficiency: a.examEfficiency
        })),
        weakestSubjects: sorted.slice(-3).reverse().map((a) => ({
          subjectId: a.subject_id,
          name: a.subjects?.name_ar || a.subjects?.name_en,
          score: Math.round(a.ability_score),
          efficiency: a.examEfficiency
        })),
        efficiencyBreakdown: efficiencyCounts
      }
    };
  } catch (error) {
    console.error('Error fetching ability statistics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Grade-level comparison (kept simple, but fixed)
 */
export async function compareWithGradeLevel(studentId) {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('grade')
      .eq('id', studentId)
      .single();

    const { abilities } = await getStudentAbilities(studentId);

    const gradeExpectations = {
      9: { target: 50, min: 40, max: 60 },
      10: { target: 55, min: 45, max: 65 },
      11: { target: 60, min: 50, max: 70 },
      12: { target: 65, min: 55, max: 75 }
    };

    const expectations = gradeExpectations[student?.grade] || { target: 55, min: 45, max: 65 };

    const comparison = (abilities || []).map((a) => {
      const actual = Number(a.ability_score) || 0;

      let status = 'below_expectations';
      let color = '#e74c3c';
      let feedback = 'Below grade level expectations';

      if (actual >= expectations.max) {
        status = 'exceeds_expectations';
        color = '#27ae60';
        feedback = 'Performing above grade level';
      } else if (actual >= expectations.target) {
        status = 'meets_expectations';
        color = '#3498db';
        feedback = 'Meeting grade level expectations';
      } else if (actual >= expectations.min) {
        status = 'approaching_expectations';
        color = '#f39c12';
        feedback = 'Approaching grade level expectations';
      }

      return {
        subjectId: a.subject_id,
        subjectName: a.subjects?.name_ar || a.subjects?.name_en,
        actualScore: Math.round(actual),
        targetScore: expectations.target,
        difference: Math.round(actual - expectations.target),
        status,
        color,
        feedback
      };
    });

    return {
      success: true,
      grade: student?.grade,
      expectations,
      comparison
    };
  } catch (error) {
    console.error('Error comparing with grade level:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getStudentAbilities,
  getSubjectAbility,
  getAbilityHistory,
  calculateAbilityGrowth,
  getAbilityStatistics,
  compareWithGradeLevel,
  updateAbilitiesFromSession
};
