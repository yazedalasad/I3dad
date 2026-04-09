export function getLevelById(levels, levelId) {
  return (levels || []).find((level) => level.id === levelId) || null;
}

export function getNextLevel(levels, levelId) {
  const index = (levels || []).findIndex((level) => level.id === levelId);
  if (index < 0) return null;
  return levels[index + 1] || null;
}
