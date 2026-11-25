import { describe, expect, it } from "vitest";
import {
  composeDayWords,
  createPlan,
  isPlanComplete,
  learnedCount,
  markGroupCompleted,
  nextGroupIndex,
  replaceWordInPlan,
  splitIntoGroups,
} from "./new-words-plan";

const ids = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("splitIntoGroups", () => {
  it("8'lik gruplara böler", () => {
    expect(splitIntoGroups(ids(1, 16), 8)).toEqual([ids(1, 8), ids(9, 16)]);
  });

  it("bölünmeyen sayıda son grup küçük olur (12 = 8 + 4)", () => {
    expect(splitIntoGroups(ids(1, 12), 8).map((g) => g.length)).toEqual([8, 4]);
  });

  it("kelime yoksa grup yok", () => {
    expect(splitIntoGroups([], 8)).toEqual([]);
  });
});

describe("composeDayWords (devreden kelimeler)", () => {
  it("devreden kelimeler önce gelir ve günün sayısının içinde sayılır", () => {
    // Dün bitirilmeyen 3 kelime + kuyruk; günlük 8
    const day = composeDayWords([101, 102, 103], ids(1, 20), 8);
    expect(day).toEqual([101, 102, 103, 1, 2, 3, 4, 5]);
    expect(day).toHaveLength(8);
  });

  it("devreden kelime günlük sayıdan fazlaysa yalnızca daily_new kadarı alınır", () => {
    expect(composeDayWords(ids(101, 110), ids(1, 5), 8)).toEqual(ids(101, 108));
  });

  it("devreden yoksa kuyruğun başından alır", () => {
    expect(composeDayWords([], ids(1, 20), 8)).toEqual(ids(1, 8));
  });

  it("kuyruk biterse eldeki kadarını verir, kopya üretmez", () => {
    expect(composeDayWords([3], [1, 2, 3], 8)).toEqual([3, 1, 2]);
  });
});

describe("plan ilerlemesi", () => {
  it("sıradaki grup, tamamlananlar ve öğrenilen kelime sayısı", () => {
    let plan = createPlan(ids(1, 12), 8);
    expect(nextGroupIndex(plan)).toBe(0);
    expect(learnedCount(plan)).toBe(0);

    plan = markGroupCompleted(plan, 0);
    expect(nextGroupIndex(plan)).toBe(1);
    expect(learnedCount(plan)).toBe(8);
    expect(isPlanComplete(plan)).toBe(false);

    plan = markGroupCompleted(plan, 1);
    expect(nextGroupIndex(plan)).toBeNull();
    expect(learnedCount(plan)).toBe(12);
    expect(isPlanComplete(plan)).toBe(true);
  });

  it("aynı grubu iki kez tamamlamak sayacı bozmaz", () => {
    const plan = markGroupCompleted(markGroupCompleted(createPlan(ids(1, 8), 8), 0), 0);
    expect(plan.completed).toEqual([0]);
    expect(learnedCount(plan)).toBe(8);
  });

  it("boş plan tamamlanmış sayılmaz", () => {
    expect(isPlanComplete(createPlan([], 8))).toBe(false);
  });
});

describe("replaceWordInPlan", () => {
  it("bilinen kelimenin yerine sıradakini aynı gruba, aynı konuma koyar", () => {
    const plan = createPlan(ids(1, 16), 8);
    const next = replaceWordInPlan(plan, 3, 17);
    expect(next.groups[0]).toEqual([1, 2, 17, 4, 5, 6, 7, 8]);
    expect(next.groups[1]).toEqual(ids(9, 16));
  });

  it("yedek kelime yoksa grup küçülür", () => {
    const next = replaceWordInPlan(createPlan(ids(1, 8), 8), 8, null);
    expect(next.groups[0]).toEqual(ids(1, 7));
  });
});
