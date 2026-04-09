import { GAME_ACTION_TYPES, GAME_SESSION_STATUS } from '../types/gameSchemas';

export function mapChoiceToActionLog({
  sessionId,
  sceneId,
  choiceId,
  actionType = GAME_ACTION_TYPES.CHOICE,
  timeToChooseMs = null,
  isOptimal = false,
}) {
  return {
    game_session_id: sessionId,
    scene_id: sceneId,
    choice_id: choiceId,
    action_type: actionType,
    time_to_choose_ms: timeToChooseMs,
    is_optimal: isOptimal,
  };
}

export function mapSessionStart({
  studentId,
  gameId,
  levelId,
  language,
  currentSceneId,
}) {
  return {
    student_id: studentId,
    game_id: gameId,
    level_id: levelId,
    status: GAME_SESSION_STATUS.IN_PROGRESS,
    language,
    current_scene_id: currentSceneId,
  };
}

export function mapSessionCompletion({
  endedAt,
  currentSceneId,
  interestSignal = 0,
  engagementScore = 0,
  trustScore = 0,
  hebrewScore = undefined,
  medicalReasoningScore = undefined,
  status = GAME_SESSION_STATUS.COMPLETED,
}) {
  const payload = {
    status,
    ended_at: endedAt,
    current_scene_id: currentSceneId,
    interest_signal: interestSignal,
    engagement_score: engagementScore,
    trust_score: trustScore,
  };

  if (typeof hebrewScore === 'number') payload.hebrew_score = hebrewScore;
  if (typeof medicalReasoningScore === 'number') payload.medical_reasoning_score = medicalReasoningScore;

  return payload;
}
