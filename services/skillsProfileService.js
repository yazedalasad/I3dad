import { getStudentAbilities } from './abilityService';
import { getStudentInterests } from './interestService';
import { getStudentGameSessions } from '../features/games/shared/services/gameSessionService';
import { getGameSkillBoosts } from '../features/games/shared/utils/gameLearningProfile';

function safeNum(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function translate(copy, language) {
  const normalizedLanguage = normalizeLanguage(language);
  return copy?.[normalizedLanguage] || copy?.en || copy?.ar || copy?.he || '';
}

const skillBlueprint = [
  { key: 'math', label: { ar: 'الرياضيات', he: 'מתמטיקה', en: 'Math' }, sources: ['math'] },
  { key: 'arabic', label: { ar: 'اللغة العربية', he: 'ערבית', en: 'Arabic' }, sources: ['arabic'] },
  { key: 'hebrew', label: { ar: 'العبرية', he: 'עברית', en: 'Hebrew' }, sources: ['hebrew'] },
  { key: 'english', label: { ar: 'الإنجليزية', he: 'אנגלית', en: 'English' }, sources: ['english'] },
  { key: 'logic', label: { ar: 'التفكير المنطقي', he: 'חשיבה לוגית', en: 'Logical thinking' }, sources: ['computer_science', 'math'] },
  { key: 'memory', label: { ar: 'الذاكرة', he: 'זיכרון', en: 'Memory' }, sources: ['arabic', 'psychology'] },
  { key: 'speed', label: { ar: 'سرعة الجواب', he: 'מהירות תגובה', en: 'Response speed' }, sources: ['math', 'physics', 'computer_science'] },
  { key: 'focus', label: { ar: 'التركيز', he: 'ריכוז', en: 'Focus' }, sources: ['psychology', 'education'] },
  { key: 'medical', label: { ar: 'التحليل الطبي', he: 'חשיבה רפואית', en: 'Medical reasoning' }, sources: ['medicine', 'biology'] },
  { key: 'scientific', label: { ar: 'التفكير العلمي', he: 'חשיבה מדעית', en: 'Scientific thinking' }, sources: ['physics', 'chemistry', 'biology'] },
  { key: 'problem_solving', label: { ar: 'حل المشكلات', he: 'פתרון בעיות', en: 'Problem solving' }, sources: ['engineering', 'computer_science', 'physics'] },
];

const gameBoosts = {
  doctor_soroka: { medical: 14, hebrew: 10, logic: 8, focus: 6 },
  physics_lab: { scientific: 14, problem_solving: 12, speed: 6, logic: 8 },
  arabic_poet_puzzle: { arabic: 14, memory: 12, focus: 7, speed: 4 },
};

export async function getStudentSkillsProfile(studentId, options = {}) {
  if (!studentId) {
    return { success: false, error: 'studentId is required' };
  }

  const language = normalizeLanguage(options.language);

  try {
    const [abilitiesResult, interestsResult, gameSessions] = await Promise.all([
      getStudentAbilities(studentId),
      getStudentInterests(studentId),
      getStudentGameSessions(studentId),
    ]);

    const abilities = abilitiesResult?.success ? abilitiesResult.abilities || [] : [];
    const interests = interestsResult?.success ? interestsResult.interests || [] : [];
    const completedGames = (gameSessions || []).filter((item) => item.status === 'completed');

    const abilityMap = new Map();
    abilities.forEach((ability) => {
      const code = ability?.subjects?.code;
      if (code) {
        abilityMap.set(code, Math.round(clamp(safeNum(ability?.ability_score, 0), 0, 100)));
      }
    });

    const interestMap = new Map();
    interests.forEach((interest) => {
      const code = interest?.subjects?.code;
      if (code) {
        interestMap.set(code, Math.round(clamp(safeNum(interest?.interest_score, 0), 0, 100)));
      }
    });

    const skills = skillBlueprint.map((skill) => {
      const sourceScores = skill.sources.map((sourceKey) => {
        const abilityScore = safeNum(abilityMap.get(sourceKey), 0);
        const interestScore = safeNum(interestMap.get(sourceKey), 0);
        return abilityScore * 0.7 + interestScore * 0.3;
      });

      const averageBase = sourceScores.length
        ? sourceScores.reduce((sum, score) => sum + score, 0) / sourceScores.length
        : 0;

      const gameBonus = completedGames.reduce((sum, session) => {
        const boosts = getGameSkillBoosts(session.game_id);
        return sum + safeNum(boosts[skill.key], 0) * (safeNum(session.engagement_score, 60) / 100);
      }, 0);

      return {
        key: skill.key,
        label: translate(skill.label, language),
        score: Math.round(clamp(averageBase + gameBonus, 0, 100)),
      };
    });

    return {
      success: true,
      data: {
        skills,
        topSkills: skills.slice().sort((a, b) => b.score - a.score).slice(0, 4),
        gameCount: completedGames.length,
      },
    };
  } catch (error) {
    return { success: false, error: error?.message || 'Failed to load skills profile' };
  }
}

export default {
  getStudentSkillsProfile,
};
