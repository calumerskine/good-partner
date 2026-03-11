export const XP_PER_COMPLETION = 25;

export type Level = {
  level: number;
  title: string;
  cumulativeXp: number;
};

export const LEVELS: Level[] = [
  { level: 1, title: "Seed", cumulativeXp: 0 },
  { level: 2, title: "Sprout", cumulativeXp: 50 },
  { level: 3, title: "Sapling", cumulativeXp: 150 },
  { level: 4, title: "Blooming", cumulativeXp: 325 },
  { level: 5, title: "Flourishing", cumulativeXp: 575 },
  { level: 6, title: "Thriving", cumulativeXp: 925 },
  { level: 7, title: "Evergreen", cumulativeXp: 1425 },
];

export type LevelInfo = {
  level: number;
  title: string;
  currentLevelXp: number;
  xpForNextLevel: number;
  progress: number;
  isMaxLevel: boolean;
};

export function getLevelForXp(totalXp: number): LevelInfo {
  let currentLevel = LEVELS[0];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].cumulativeXp) {
      currentLevel = LEVELS[i];
      break;
    }
  }

  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  const isMaxLevel = !nextLevel;

  if (isMaxLevel) {
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      currentLevelXp: 0,
      xpForNextLevel: 0,
      progress: 1.0,
      isMaxLevel: true,
    };
  }

  const xpIntoCurrentLevel = totalXp - currentLevel.cumulativeXp;
  const xpNeededForNext = nextLevel.cumulativeXp - currentLevel.cumulativeXp;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentLevelXp: xpIntoCurrentLevel,
    xpForNextLevel: xpNeededForNext,
    progress: xpIntoCurrentLevel / xpNeededForNext,
    isMaxLevel: false,
  };
}
