import { describe, expect, it } from "vitest";
import { levelFromXp, xpForLevel } from "./xp";

describe("xpForLevel", () => {
  it("100 · (n-1)^1.5 eşiklerini verir", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(283);
    expect(xpForLevel(4)).toBe(520);
    expect(xpForLevel(5)).toBe(800);
  });
});

describe("levelFromXp", () => {
  it("0 XP seviye 1", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, levelStartXp: 0, nextLevelXp: 100, progress: 0 });
  });

  it("eşikte bir üst seviyeye geçer", () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(282).level).toBe(2);
    expect(levelFromXp(283).level).toBe(3);
  });

  it("ilerlemeyi 0–1 arasında hesaplar", () => {
    const info = levelFromXp(150);
    expect(info.level).toBe(2);
    expect(info.progress).toBeCloseTo((150 - 100) / (283 - 100));
  });

  it("negatif XP'yi 0 sayar", () => {
    expect(levelFromXp(-5).level).toBe(1);
  });
});
