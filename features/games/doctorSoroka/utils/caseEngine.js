export function buildSceneMap(level) {
  return Object.fromEntries((level?.scenes || []).map((scene) => [scene.id, scene]));
}

export function getSceneById(level, sceneId) {
  return buildSceneMap(level)[sceneId] || null;
}

export function getNextSceneFromChoice(level, choice) {
  if (!choice?.nextSceneId) return null;
  return getSceneById(level, choice.nextSceneId);
}

export function isLevelCompletedByChoice(choice) {
  return Boolean(choice?.metadata?.completesLevel);
}

export function getInitialScene(level) {
  return level?.scenes?.[0] || null;
}
