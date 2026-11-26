import { XP } from "@/lib/xp";

// Günlük test (SPEC 5.4). Saf fonksiyonlar.

/** Son 7 günde hata yapılan kelimelerden en fazla kaç tanesi teste eklenir. */
export const DAILY_TEST_MAX_MISTAKES = 8;
export const MISTAKE_LOOKBACK_DAYS = 7;

export type Mistake = { wordId: number; at: string };

/**
 * Testin kelimeleri: bugünün bütün yeni kelimeleri + son 7 günde hata yapılan kelimelerden
 * (bugünküler hariç, en yeni hata önce, tekrarsız) en fazla 8 tanesi.
 */
export function selectDailyTestWords(
  todayWordIds: readonly number[],
  mistakes: readonly Mistake[],
  maxMistakes: number = DAILY_TEST_MAX_MISTAKES,
): number[] {
  const today = new Set(todayWordIds);
  const extra: number[] = [];
  const sorted = [...mistakes].sort((a, b) => b.at.localeCompare(a.at));
  for (const m of sorted) {
    if (extra.length >= maxMistakes) break;
    if (today.has(m.wordId) || extra.includes(m.wordId)) continue;
    extra.push(m.wordId);
  }
  return [...todayWordIds, ...extra];
}

/** Günlük test XP'si: doğru cevap başına 3, tam puana +50 (SPEC 6). */
export function dailyTestXp(correct: number, total: number): number {
  const perfect = total > 0 && correct === total ? XP.perfectDailyTest : 0;
  return correct * XP.correctAnswer + perfect;
}
