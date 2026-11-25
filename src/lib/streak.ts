import { addDays, type IsoDate } from "@/lib/time";

// Seri (SPEC 6): günün tamamlandığı ardışık gün sayısı.
// Donmuş gün seriyi bozmaz ama artırmaz. Bugün henüz tamamlanmadıysa seri dünden sayılır,
// böylece gün içinde "seri 0" görünmez.

export type DayMark = {
  date: IsoDate;
  completed: boolean;
  frozen: boolean;
};

export type StreakInfo = {
  /** Mevcut seri (gün) */
  current: number;
  /** Bugün tamamlandı mı? */
  todayDone: boolean;
};

export function computeStreak(days: readonly DayMark[], today: IsoDate): StreakInfo {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const todayDone = byDate.get(today)?.completed === true;

  let cursor = todayDone ? today : addDays(today, -1);
  let current = 0;
  // Gerçekçi bir üst sınır: sonsuz döngüye karşı.
  for (let i = 0; i < 5000; i++) {
    const day = byDate.get(cursor);
    if (day?.completed) current++;
    else if (!day?.frozen) break;
    cursor = addDays(cursor, -1);
  }
  return { current, todayDone };
}
