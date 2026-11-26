import { describe, expect, it } from "vitest";
import { dailyTestXp, selectDailyTestWords } from "./daily-test";

describe("selectDailyTestWords", () => {
  it("bugünün bütün kelimeleri + son hatalardan en fazla 8 tanesi", () => {
    const mistakes = Array.from({ length: 12 }, (_, i) => ({ wordId: 100 + i, at: `2026-11-${String(10 + i).padStart(2, "0")}T10:00:00Z` }));
    const words = selectDailyTestWords([1, 2, 3], mistakes);
    expect(words.slice(0, 3)).toEqual([1, 2, 3]);
    expect(words).toHaveLength(3 + 8);
    // en yeni hata önce
    expect(words[3]).toBe(111);
  });

  it("bugünün kelimesi hatalarda da varsa iki kez sorulmaz; aynı kelimenin birden çok hatası tek sayılır", () => {
    const words = selectDailyTestWords(
      [1, 2],
      [
        { wordId: 2, at: "2026-11-25T10:00:00Z" },
        { wordId: 50, at: "2026-11-24T10:00:00Z" },
        { wordId: 50, at: "2026-11-23T10:00:00Z" },
      ],
    );
    expect(words).toEqual([1, 2, 50]);
  });

  it("hata yoksa yalnızca bugünün kelimeleri", () => {
    expect(selectDailyTestWords([1, 2, 3], [])).toEqual([1, 2, 3]);
  });
});

describe("dailyTestXp", () => {
  it("doğru başına 3, tam puana +50", () => {
    expect(dailyTestXp(8, 8)).toBe(8 * 3 + 50);
    expect(dailyTestXp(7, 8)).toBe(21);
    expect(dailyTestXp(0, 0)).toBe(0);
  });
});
