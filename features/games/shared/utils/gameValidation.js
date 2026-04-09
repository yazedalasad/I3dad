import { isSupportedLanguage } from './gameLanguage';

export function validateGameSessionInput({ studentId, gameId, levelId, language }) {
  if (!studentId) throw new Error('studentId is required');
  if (!gameId) throw new Error('gameId is required');
  if (!levelId) throw new Error('levelId is required');
  if (!language) throw new Error('language is required');

  if (!isSupportedLanguage(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }
}

export function validateActionLogInput({ sessionId, actionType }) {
  if (!sessionId) throw new Error('sessionId is required');
  if (!actionType) throw new Error('actionType is required');
}

export function validateScene(scene) {
  if (!scene?.id) throw new Error('scene.id is required');
  if (!scene?.title) throw new Error('scene.title is required');
  if (!scene?.body) throw new Error('scene.body is required');
  if (!Array.isArray(scene?.choices)) throw new Error('scene.choices must be an array');
}

export function validateChoice(choice) {
  if (!choice?.id) throw new Error('choice.id is required');
  if (!choice?.title) throw new Error('choice.title is required');
}

export function validateSceneList(scenes = []) {
  if (!Array.isArray(scenes)) throw new Error('scenes must be an array');
  scenes.forEach(validateScene);
}
