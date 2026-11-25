import { z } from "zod";

// Günün yeni kelime planı (SPEC 5.3). study_days.tasks.new_words.plan içinde saklanır;
// gün içinde değişmez (yalnızca "Bunu zaten biliyorum" bir kelimeyi aynı grupta yenisiyle değiştirir).

export const newWordsPlanSchema = z.object({
  /** Her grup: words.id listesi, gösterim sırasıyla */
  groups: z.array(z.array(z.number().int().positive())),
  /** Sınavı bitmiş grupların indeksleri (0'dan başlar) */
  completed: z.array(z.number().int().min(0)),
});

export type NewWordsPlan = z.infer<typeof newWordsPlanSchema>;

/** Kelimeleri group_size'lık gruplara böler; son grup daha küçük olabilir (12 → 8 + 4). */
export function splitIntoGroups(wordIds: readonly number[], groupSize: number): number[][] {
  const size = Math.max(1, Math.floor(groupSize));
  const groups: number[][] = [];
  for (let i = 0; i < wordIds.length; i += size) groups.push(wordIds.slice(i, i + size));
  return groups;
}

/**
 * Günün kelimelerini seçer:
 * 1. Önceki günlerden kalan, bitirilmemiş kelimeler (status='new') önce gelir,
 * 2. kalan yer kuyruktaki sıradaki yeni kelimelerle doldurulur.
 * Toplam her zaman en fazla daily_new'dur: devreden kelimeler günün sayısının içindedir.
 */
export function composeDayWords(
  carryover: readonly number[],
  fresh: readonly number[],
  dailyNew: number,
): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const id of [...carryover, ...fresh]) {
    if (out.length >= dailyNew) break;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function createPlan(wordIds: readonly number[], groupSize: number): NewWordsPlan {
  return { groups: splitIntoGroups(wordIds, groupSize), completed: [] };
}

export function planWordIds(plan: NewWordsPlan): number[] {
  return plan.groups.flat();
}

/** Sınavı yapılmamış ilk grubun indeksi; hepsi bittiyse null. */
export function nextGroupIndex(plan: NewWordsPlan): number | null {
  const i = plan.groups.findIndex((_, idx) => !plan.completed.includes(idx));
  return i === -1 ? null : i;
}

export function isPlanComplete(plan: NewWordsPlan): boolean {
  return plan.groups.length > 0 && nextGroupIndex(plan) === null;
}

/** Bitmiş gruplardaki kelime sayısı (Bugün ekranındaki "Yeni kelimeler x/N" sayacı). */
export function learnedCount(plan: NewWordsPlan): number {
  return plan.completed.reduce((sum, i) => sum + (plan.groups[i]?.length ?? 0), 0);
}

export function markGroupCompleted(plan: NewWordsPlan, groupIndex: number): NewWordsPlan {
  if (plan.completed.includes(groupIndex)) return plan;
  return { ...plan, completed: [...plan.completed, groupIndex].sort((a, b) => a - b) };
}

/**
 * "Bunu zaten biliyorum": kelimeyi gruptan çıkarır, yerine (varsa) kuyruktaki sıradakini
 * AYNI gruba, aynı konuma koyar. Yedek yoksa grup bir kelime küçülür.
 */
export function replaceWordInPlan(
  plan: NewWordsPlan,
  oldId: number,
  newId: number | null,
): NewWordsPlan {
  return {
    ...plan,
    groups: plan.groups.map((group) => {
      const at = group.indexOf(oldId);
      if (at === -1) return group;
      const next = [...group];
      if (newId === null) next.splice(at, 1);
      else next[at] = newId;
      return next;
    }),
  };
}
