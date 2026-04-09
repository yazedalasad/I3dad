export function buildCreateSessionPayload({
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
    status: 'in_progress',
    language,
    current_scene_id: currentSceneId,
  };
}

export function buildUpdateSessionPayload({
  status,
  currentSceneId,
  endedAt,
  interestSignal,
  engagementScore,
  trustScore,
  hebrewScore,
  medicalReasoningScore,
}) {
  const payload = {};

  if (status) payload.status = status;
  if (currentSceneId !== undefined) payload.current_scene_id = currentSceneId;
  if (endedAt) payload.ended_at = endedAt;
  if (typeof interestSignal === 'number') payload.interest_signal = interestSignal;
  if (typeof engagementScore === 'number') payload.engagement_score = engagementScore;
  if (typeof trustScore === 'number') payload.trust_score = trustScore;
  if (typeof hebrewScore === 'number') payload.hebrew_score = hebrewScore;
  if (typeof medicalReasoningScore === 'number') payload.medical_reasoning_score = medicalReasoningScore;

  return payload;
}

export function buildActionLogPayload({
  sessionId,
  sceneId,
  choiceId,
  actionType,
  timeToChooseMs,
  isOptimal,
}) {
  return {
    game_session_id: sessionId,
    scene_id: sceneId || null,
    choice_id: choiceId || null,
    action_type: actionType,
    time_to_choose_ms: typeof timeToChooseMs === 'number' ? timeToChooseMs : null,
    is_optimal: typeof isOptimal === 'boolean' ? isOptimal : null,
  };
}
