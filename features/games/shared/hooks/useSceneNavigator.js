import { useMemo, useState } from 'react';
import { byId } from '../utils/gameHelpers';
import { validateSceneList } from '../utils/gameValidation';

export function useSceneNavigator(scenes = []) {
  validateSceneList(scenes);

  const [currentIndex, setCurrentIndex] = useState(0);
  const sceneMap = useMemo(() => byId(scenes), [scenes]);

  const currentScene = scenes[currentIndex] || null;
  const hasNext = currentIndex < scenes.length - 1;
  const hasPrevious = currentIndex > 0;

  function goNext() {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function goPrevious() {
    if (hasPrevious) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function goToSceneById(sceneId) {
    const nextIndex = scenes.findIndex((scene) => scene.id === sceneId);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    }
  }

  function reset() {
    setCurrentIndex(0);
  }

  return {
    scenes,
    sceneMap,
    currentIndex,
    currentScene,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
    goToSceneById,
    reset,
  };
}
