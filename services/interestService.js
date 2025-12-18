/**
 * INTEREST SERVICE - Total Exam (Full Assessment) Interest Tracking
 *
 * Interest is inferred from behavior:
 * - time spent + accuracy per subject (from student_responses + questions.subject_id)
 * - session engagement (active/idle time + engagement_score on test_sessions)
 *
 * Writes:
 * - student_interests (upsert per student+subject)
 */

import { supabase } from '../config/supabase';
import { classifyInterestLevel } from '../utils/irt/interestProfiling';

/** Target timing (seconds) for "healthy engagement" per question */
const TIME_CONFIG = {
  OPTIMAL: 45,
  FAST: 30,
  SLOW: 60,
  MAX: 120
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function avgTime(totalSeconds, questions) {
  if (!questions || questions <= 0) return 0;
  return Number((totalSeconds / questions).toFixed(1));
}

function accuracyRate(correct, total) {
  if (!total || total <= 0) return 0;
  return Number(((correct / total) * 100).toFixed(1));
}

/**
 * Time analysis label (kept compatible with your UI expectations)
 */
function analyzeResponseTime(avgSeconds, accuracy) {
  if (!avgSeconds || avgSeconds <= 0) {
    return {
      category: 'no_data',
      description: 'No time data available',
      color: '#94A3B8',
      timeEfficiency: 0,
      performanceScore: 0
    };
  }

  const diffFromOptimal = Math.abs(avgSeconds - TIME_CONFIG.OPTIMAL);
  const maxDiff = TIME_CONFIG.MAX - TIME_CONFIG.OPTIMAL;
  const timeEfficiency = clamp(Math.round((1 - diffFromOptimal / maxDiff) * 100), 0, 100);

  const performanceScore = Math.round(timeEfficiency * 0.4 + accuracy * 0.6);

  let category = 'optimal';
  let color = '#3498db';
  let description = 'Ideal balance of speed and accuracy';

  if (avgSeconds <= TIME_CONFIG.FAST) {
    category = 'very_fast';
    color = accuracy >= 70 ? '#27ae60' : '#f39c12';
    description = accuracy >= 70
      ? 'Quick responses with high accuracy - indicates strong mastery'
      : 'Quick responses but lower accuracy - may indicate guessing';
  } else if (avgSeconds <= TIME_CONFIG.OPTIMAL) {
    category = 'optimal';
    color = '#3498db';
    description = 'Ideal balance of speed and accuracy';
  } else if (avgSeconds <= TIME_CONFIG.SLOW) {
    category = 'moderate';
    color = accuracy >= 60 ? '#f39c12' : '#e67e22';
    description = accuracy >= 60
      ? 'Cautious approach maintaining good accuracy'
      : 'Slow responses with accuracy issues';
  } else if (avgSeconds <= TIME_CONFIG.MAX) {
    category = 'slow';
    color = '#e74c3c';
    description = 'Very slow responses - may indicate difficulty or hesitation';
  } else {
    category = 'timeout_risk';
    color = '#c0392b';
    description = 'Response times approaching timeout limit';
  }

  return { category, color, description, timeEfficiency, performanceScore, avgTime: Math.round(avgSeconds) };
}

/**
 * Engagement score (0..100) based on:
 * - subject interest_score (prior)
 * - subject accuracy
 * - time efficiency
 * - session engagement_score (active/idle)
 */
function computeEngagementScore({ interestScore, accuracy, timeEfficiency, sessionEngagement }) {
  const i = clamp((safeNum(interestScore, 50)) / 100, 0, 1);
  const a = clamp((safeNum(accuracy, 50)) / 100, 0, 1);
  const t = clamp((safeNum(timeEfficiency, 50)) / 100, 0, 1);
  const s = clamp((safeNum(sessionEngagement, 50)) / 100, 0, 1);

  // weights: interest baseline + behavior + session engagement
  const score = (i * 0.25) + (a * 0.30) + (t * 0.25) + (s * 0.20);
  return clamp(Math.round(score * 100), 0, 100);
}

/**
 * MAIN: Update interests from one completed Total Exam session.
 * This is what makes interest tracking actually work end-to-end.
 */
export async function updateInterestsFromSession(sessionId) {
  try {
    // 1) Session check
    const { data: session, error: sErr } = await supabase
      .from('test_sessions')
      .select('id, student_id, session_type, status, completed_at, active_time_seconds, idle_time_seconds, engagement_score, metadata')
      .eq('id', sessionId)
      .single();

    if (sErr) throw sErr;
    if (!session) return { success: false, error: 'SESSION_NOT_FOUND' };
    if (session.status !== 'completed') return { success: false, error: 'SESSION_NOT_COMPLETED' };
    if (session.session_type !== 'full_assessment') return { success: false, error: 'NOT_FULL_ASSESSMENT' };
    if ((session.metadata?.examType || 'total_exam') !== 'total_exam') {
      // allow default, but you can enforce if you want
    }

    const studentId = session.student_id;

    // 2) Pull responses + question subject_id
    const { data: responses, error: rErr } = await supabase
      .from('student_responses')
      .select('is_correct, time_taken_seconds, questions(subject_id)')
      .eq('session_id', sessionId);

    if (rErr) throw rErr;
    if (!responses || responses.length === 0) return { success: false, error: 'NO_RESPONSES' };

    // Group per subject
    const bySubject = {};
    for (const r of responses) {
      const sid = r.questions?.subject_id;
      if (!sid) continue;
      if (!bySubject[sid]) bySubject[sid] = [];
      bySubject[sid].push(r);
    }

    const subjectIds = Object.keys(bySubject);
    if (subjectIds.length === 0) return { success: false, error: 'NO_SUBJECT_GROUPS' };

    // 3) Fetch existing interest rows so we can update smoothly
    const { data: existingRows, error: exErr } = await supabase
      .from('student_interests')
      .select('subject_id, interest_score, time_spent_seconds, questions_attempted, metadata')
      .eq('student_id', studentId)
      .in('subject_id', subjectIds);

    if (exErr) throw exErr;

    const existingMap = new Map();
    (existingRows || []).forEach((row) => existingMap.set(row.subject_id, row));

    // 4) Compute and upsert per subject
    const upserts = [];

    for (const subjectId of subjectIds) {
      const list = bySubject[subjectId];
      const attempted = list.length;
      const correct = list.filter((x) => x.is_correct).length;
      const timeSpent = list.reduce((sum, x) => sum + safeNum(x.time_taken_seconds, 0), 0);

      const avg = avgTime(timeSpent, attempted);
      const acc = accuracyRate(correct, attempted);

      const timeAnalysis = analyzeResponseTime(avg, acc);

      // Existing accumulation
      const prev = existingMap.get(subjectId);
      const prevScore = safeNum(prev?.interest_score, 50);
      const prevTime = safeNum(prev?.time_spent_seconds, 0);
      const prevAttempted = safeNum(prev?.questions_attempted, 0);

      // Basic interest inference:
      // - reward good engagement score + balanced time + accuracy
      // - penalize guessing pattern (very fast + low accuracy)
      let delta = 0;

      if (timeAnalysis.category === 'optimal') delta += 8;
      if (timeAnalysis.category === 'moderate' && acc >= 60) delta += 4;
      if (timeAnalysis.category === 'very_fast' && acc >= 70) delta += 5;

      if (timeAnalysis.category === 'slow') delta -= 4;
      if (timeAnalysis.category === 'timeout_risk') delta -= 8;
      if (timeAnalysis.category === 'very_fast' && acc < 60) delta -= 6; // likely guessing

      // also reward accuracy a bit (interest tends to be higher when student feels capable)
      delta += (acc - 60) * 0.08; // small nudges

      // session engagement makes this more trustworthy
      delta += (safeNum(session.engagement_score, 50) - 50) * 0.05;

      // smooth update so score changes gradually
      const newScore = clamp(Math.round(prevScore * 0.85 + clamp(prevScore + delta, 0, 100) * 0.15), 0, 100);

      const completionRate = acc; // here completion_rate is basically accuracy/quality proxy for your existing UI

      const engagementScore = computeEngagementScore({
        interestScore: newScore,
        accuracy: acc,
        timeEfficiency: timeAnalysis.timeEfficiency,
        sessionEngagement: session.engagement_score
      });

      // time patterns history (optional, but useful for your old UI design)
      const prevMeta = prev?.metadata || {};
      const tp = prevMeta.timePatterns || {};
      const stamp = session.completed_at || new Date().toISOString();
      tp[stamp] = avg;

      upserts.push({
        student_id: studentId,
        subject_id: subjectId,

        interest_score: newScore,
        time_spent_seconds: prevTime + timeSpent,
        questions_attempted: prevAttempted + attempted,

        // optional semantics from your original design
        voluntary_attempts: safeNum(prev?.voluntary_attempts, 0),
        avg_time_per_question: avg,
        completion_rate: completionRate,
        discovered_at: prev?.discovered_at || (session.completed_at || new Date().toISOString()),
        discovery_session_id: prev?.discovery_session_id || sessionId,

        updated_at: new Date().toISOString(),

        metadata: {
          ...prevMeta,
          examType: 'total_exam',
          lastSessionId: sessionId,
          lastAccuracy: acc,
          lastAvgTime: avg,
          lastTimeAnalysis: timeAnalysis,
          sessionEngagement: {
            active: session.active_time_seconds ?? null,
            idle: session.idle_time_seconds ?? null,
            engagementScore: session.engagement_score ?? null
          },
          timePatterns: tp
        }
      });
    }

    const { error: upErr } = await supabase
      .from('student_interests')
      .upsert(upserts, { onConflict: 'student_id,subject_id' });

    if (upErr) throw upErr;

    return { success: true, updatedSubjects: subjectIds.length };
  } catch (error) {
    console.error('Error updating interests from session:', error);
    return { success: false, error: error.message };
  }
}

/* ------------------------------------------------------------------ */
/* READS (keep your UI-friendly structure)                              */
/* ------------------------------------------------------------------ */

export async function getStudentInterests(studentId) {
  try {
    const { data, error } = await supabase
      .from('student_interests')
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
      .order('interest_score', { ascending: false });

    if (error) throw error;

    const interests = (data || [])
      .filter((row) => (row.metadata?.examType || '') === 'total_exam')
      .map((row) => {
        const avgT = safeNum(row.avg_time_per_question, 0);
        const acc = safeNum(row.completion_rate, 0);
        const timeAnalysis = analyzeResponseTime(avgT, acc);

        const interestLevel = classifyInterestLevel(row.interest_score);

        const engagementScore = computeEngagementScore({
          interestScore: row.interest_score,
          accuracy: acc,
          timeEfficiency: timeAnalysis.timeEfficiency,
          sessionEngagement: row.metadata?.sessionEngagement?.engagementScore ?? 50
        });

        return {
          ...row,
          interestLevel,
          timeAnalysis,
          engagementScore,
          timeConsistency: calculateTimeConsistency(row),
          examMetrics: {
            averageAccuracy: acc,
            averageTimePerQuestion: avgT,
            totalQuestions: row.questions_attempted || 0
          }
        };
      });

    return { success: true, interests };
  } catch (error) {
    console.error('Error fetching student interests:', error);
    return { success: false, error: error.message };
  }
}

export async function getSubjectInterest(studentId, subjectId) {
  try {
    const { data, error } = await supabase
      .from('student_interests')
      .select(`*, subjects (*)`)
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: true,
          interest: null,
          recommendation: 'Complete a Total Exam to establish interest profile'
        };
      }
      throw error;
    }

    if ((data.metadata?.examType || '') !== 'total_exam') {
      return { success: true, interest: null, recommendation: 'Interest exists but not from Total Exam' };
    }

    const avgT = safeNum(data.avg_time_per_question, 0);
    const acc = safeNum(data.completion_rate, 0);
    const timeAnalysis = analyzeResponseTime(avgT, acc);

    return {
      success: true,
      interest: {
        ...data,
        interestLevel: classifyInterestLevel(data.interest_score),
        timeAnalysis,
        engagementScore: computeEngagementScore({
          interestScore: data.interest_score,
          accuracy: acc,
          timeEfficiency: timeAnalysis.timeEfficiency,
          sessionEngagement: data.metadata?.sessionEngagement?.engagementScore ?? 50
        }),
        timeConsistency: calculateTimeConsistency(data)
      }
    };
  } catch (error) {
    console.error('Error fetching subject interest:', error);
    return { success: false, error: error.message };
  }
}

export async function getTopInterests(studentId, count = 5) {
  try {
    const { interests, success, error } = await getStudentInterests(studentId);
    if (!success) return { success, error };

    const top = (interests || []).slice(0, count).map((i) => ({
      subjectId: i.subject_id,
      subjectName: i.subjects?.name_ar || i.subjects?.name_en,
      interestScore: i.interest_score,
      engagementScore: i.engagementScore,
      timeAnalysis: i.timeAnalysis
    }));

    return { success: true, topInterests: top };
  } catch (error) {
    console.error('Error fetching top interests:', error);
    return { success: false, error: error.message };
  }
}

/* ------------------------------------------------------------------ */
/* Small helper: time consistency (compatible with your old design)     */
/* ------------------------------------------------------------------ */
function calculateTimeConsistency(interestRow) {
  const timeData = interestRow.metadata?.timePatterns || {};
  const times = Object.values(timeData).map((t) => safeNum(t, 0)).filter((t) => t > 0);

  if (times.length < 2) return 50;

  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  const variance = times.reduce((s, t) => s + Math.pow(t - avg, 2), 0) / times.length;
  const std = Math.sqrt(variance);
  const cv = avg > 0 ? (std / avg) * 100 : 100;

  return clamp(Math.round(100 - cv), 0, 100);
}

export default {
  updateInterestsFromSession,
  getStudentInterests,
  getSubjectInterest,
  getTopInterests
};
