export function getAttemptFeedback(level, attempt) {
  if (!level || !attempt) {
    return { title: 'Try again', body: 'Adjust the controls and run another test.', tone: 'neutral' };
  }

  if (attempt.success) {
    return { title: 'Success', body: level.successMessage, tone: 'success' };
  }

  if (level.id === 'physics_lab_level_1') {
    if (attempt.undershoot) {
      return { title: 'Too slow', body: 'The ball reached the goal in more than 5 s. Increase speed a little.', tone: 'warning' };
    }
    return { title: 'Too fast', body: 'The ball reached the goal in less than 5 s. Lower the speed a little.', tone: 'warning' };
  }

  if (level.id === 'physics_lab_level_2') {
    if (attempt.undershoot) {
      return { title: 'Distance too short', body: 'The box stopped before the goal. Increase speed or time so distance = speed x time gets bigger.', tone: 'warning' };
    }
    return { title: 'Distance too long', body: 'The box passed the goal. Lower speed or time so distance = speed x time gets smaller.', tone: 'warning' };
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
