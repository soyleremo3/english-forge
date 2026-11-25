import { describe, expect, it } from "vitest";
import { firstReview, nextReview } from "./fsrs";
import type { TimeConfig } from "./time";

const tc: TimeConfig = { timeZone: "Europe/Istanbul", dayStartHour: 4 };
const opts = { retention: 0.9, timeConfig: tc, fuzz: false };
const at = (local: string) => new Date(`${local}+03:00`);
const DAY = 24 * 60 * 60 * 1000;

describe("firstReview", () => {
  it("Good da Again de ertesi çalışma gününün başında vadelenir", () => {
    const now = at("2026-11-25T15:00:00");
    const good = firstReview(now, "good", opts);
    const again = firstReview(now, "again", opts);
    // 2026-11-26 04:00 İstanbul = 01:00 UTC
    expect(good.due).toBe("2026-11-26T01:00:00.000Z");
    expect(again.due).toBe("2026-11-26T01:00:00.000Z");
    expect(good.scheduled_days).toBe(1);
    expect(again.scheduled_days).toBe(1);
  });

  it("gece 23:30'da da 02:00'de de 'ertesi gün' çalışma gününe göre hesaplanır", () => {
    // 23:30 → çalışma günü 25 Kasım → vade 26 Kasım 04:00
    expect(firstReview(at("2026-11-25T23:30:00"), "good", opts).due).toBe("2026-11-26T01:00:00.000Z");
    // 02:00 hâlâ 25 Kasım'a sayılır → vade yine 26 Kasım 04:00
    expect(firstReview(at("2026-11-26T02:00:00"), "again", opts).due).toBe("2026-11-26T01:00:00.000Z");
  });

  it("hafıza durumu FSRS'ten gelir: Good, Again'den daha kararlı", () => {
    const now = at("2026-11-25T15:00:00");
    const good = firstReview(now, "good", opts);
    const again = firstReview(now, "again", opts);
    expect(good.stability).toBeGreaterThan(again.stability);
    expect(good.reps).toBe(1);
    expect(again.lapses).toBe(0);
    expect(good.last_review).toBe(now.toISOString());
  });
});

describe("nextReview", () => {
  it("ikinci tekrardan itibaren FSRS aralığı geçerli (ertesi güne zorlanmaz)", () => {
    const first = firstReview(at("2026-11-25T15:00:00"), "good", opts);
    const secondAt = at("2026-11-26T10:00:00");
    const second = nextReview(first, secondAt, "good", opts);
    const days = (new Date(second.due).getTime() - secondAt.getTime()) / DAY;
    expect(days).toBeGreaterThan(1);
    expect(second.scheduled_days).toBeGreaterThan(1);
    expect(second.reps).toBe(2);
  });

  it("ikinci tekrarda Again, Good'dan kısa aralık verir ve hata sayısını artırır", () => {
    const first = firstReview(at("2026-11-25T15:00:00"), "good", opts);
    const secondAt = at("2026-11-26T10:00:00");
    const good = nextReview(first, secondAt, "good", opts);
    const again = nextReview(first, secondAt, "again", opts);
    expect(new Date(again.due).getTime()).toBeLessThan(new Date(good.due).getTime());
    expect(again.lapses).toBe(1);
  });
});
