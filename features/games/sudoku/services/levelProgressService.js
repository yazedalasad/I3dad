import { Platform } from 'react-native';
import { getStudentGameSessions } from '../../shared/services/gameSessionService';
import { MAX_SUDOKU_LEVEL, normalizeSudokuLevel } from '../utils/sudokuLevels';

const STORAGE_KEY = 'sudoku_unlocked_level';

function getMemoryStore() {
  if (!globalThis.__sudokuProgressStore) {
    globalThis.__sudokuProgressStore = new Map();
  }
  return globalThis.__sudokuProgressStore;
}

const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined'
          ? window.localStorage.getItem(key)
          : getMemoryStore().get(key) || null;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return (await AsyncStorage.getItem(key)) || getMemoryStore().get(key) || null;
    } catch {
      return getMemoryStore().get(key) || null;
    }
  },

  async setItem(key, value) {
    getMemoryStore().set(key, value);

    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      // Memory store keeps unlocks working when persistent storage is unavailable.
    }
  },
};

function getStorageKey(studentId) {
  return studentId ? `${STORAGE_KEY}:${studentId}` : STORAGE_KEY;
}

function parseCompletedLevelFromSession(levelId = '') {
  const match = String(levelId).match(/sudoku_level_(\d+)/);
  if (match) {
    return normalizeSudokuLevel(match[1]);
  }

  if (levelId.includes('_hard_')) return 16;
  if (levelId.includes('_medium_')) return 11;
  if (levelId.includes('_easy_') || levelId.includes('_very_easy_')) return 2;

  return 0;
}

function getUnlockedLevelFromSessions(sessions = []) {
  let unlocked = 1;

  sessions
    .filter((session) => session.status === 'completed')
    .forEach((session) => {
      const completedLevel = parseCompletedLevelFromSession(
        session.level_id || session.levelId || ''
      );
      if (completedLevel > 0) {
        unlocked = Math.max(unlocked, Math.min(MAX_SUDOKU_LEVEL, completedLevel + 1));
      }
    });

  return unlocked;
}

export async function getSudokuUnlockedLevel(studentId = null) {
  const rawValue = await Storage.getItem(getStorageKey(studentId));
  const localUnlocked = normalizeSudokuLevel(rawValue);

  if (!studentId) {
    return localUnlocked;
  }

  try {
    const sessions = await getStudentGameSessions(studentId, 'sudoku');
    const remoteUnlocked = getUnlockedLevelFromSessions(sessions);
    const merged = Math.max(localUnlocked, remoteUnlocked);

    if (merged > localUnlocked) {
      await Storage.setItem(getStorageKey(studentId), String(merged));
    }

    return merged;
  } catch {
    return localUnlocked;
  }
}

export async function setSudokuUnlockedLevel(unlockedLevel, studentId = null) {
  const nextLevel = normalizeSudokuLevel(unlockedLevel);
  await Storage.setItem(getStorageKey(studentId), String(nextLevel));
  return nextLevel;
}

export async function unlockSudokuLevelAfterCompletion(completedLevel, studentId = null) {
  const normalizedLevel = normalizeSudokuLevel(completedLevel);
  const currentUnlocked = await getSudokuUnlockedLevel(studentId);
  const nextUnlocked = Math.max(
    currentUnlocked,
    Math.min(MAX_SUDOKU_LEVEL, normalizedLevel + 1)
  );

  await setSudokuUnlockedLevel(nextUnlocked, studentId);
  return nextUnlocked;
}
