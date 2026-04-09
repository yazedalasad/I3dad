export function getAttemptFeedback(level, attempt) {
  if (!level || !attempt) {
    return { title: 'Try again', body: 'Adjust the controls and run another test.', tone: 'neutral' };
  }

  if (attempt.success) {
    return { title: 'Success', body: level.successMessage, tone: 'success' };
  }

  if (level.id === 'physics_lab_level_1') {
    if (attempt.undershoot) {
      return { title: 'Too weak', body: 'The box stopped before the goal. Increase force or reduce friction.', tone: 'warning' };
    }
    return { title: 'Too strong', body: 'The box slid past the goal. Lower the force for better control.', tone: 'warning' };
  }

  if (level.id === 'physics_lab_level_2') {
    if (attempt.undershoot) {
      return { title: 'Not enough speed', body: 'The ball did not travel far enough to clear the gap and reach the target.', tone: 'warning' };
    }
    return { title: 'Too fast', body: 'The ball flew too far. Lower the speed or adjust the angle.', tone: 'warning' };
  }

  if (level.id === 'physics_lab_level_3') {
    if (attempt.undershoot) {
      return { title: 'Not enough acceleration', body: 'The object did not build enough motion before the climb.', tone: 'warning' };
    }
    return { title: 'Too much motion', body: 'The object climbed past the goal. Try lowering acceleration or increasing mass.', tone: 'warning' };
  }

  return { title: 'Try again', body: 'Adjust the controls and run another test.', tone: 'neutral' };
}

export function getLevelSummary(level, attemptsCount = 0) {
  return {
    title: level?.title || 'Level complete',
    body: level?.summary || 'You completed the challenge.',
    attemptsLabel: `${attemptsCount} attempt${attemptsCount === 1 ? '' : 's'}`,
  };
}
