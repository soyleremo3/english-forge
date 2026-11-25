// XP ve seviye (SPEC 6).
// Seviye 1'den başlanır. Seviye n'den n+1'e geçmek için toplam XP ≥ 100 · n^1.5 olmalı:
// seviye 2 → 100, seviye 3 → 283, seviye 4 → 520, seviye 5 → 800 XP.

export const XP = {
  newWord: 10,
  reviewCard: 2,
  correctAnswer: 3,
  sentence: 15,
  perfectDailyTest: 50,
  dayComplete: 50,
} as const;

/** Seviye n'ye ulaşmak için gereken toplam XP (seviye 1 = 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(100 * (level - 1) ** 1.5);
}

export type LevelInfo = {
  level: number;
  /** Bu seviyenin başladığı toplam XP */
  levelStartXp: number;
  /** Sonraki seviyenin başladığı toplam XP */
  nextLevelXp: number;
  /** 0–1 arası, sonraki seviyeye ilerleme */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    levelStartXp,
    nextLevelXp,
    progress: (xp - levelStartXp) / (nextLevelXp - levelStartXp),
  };
}
