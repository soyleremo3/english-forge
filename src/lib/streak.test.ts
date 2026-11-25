import { describe, expect, it } from "vitest";
import { computeStreak, type DayMark } from "./streak";

const done = (date: string): DayMark => ({ date, completed: true, frozen: false });
const frozen = (date: string): DayMark => ({ date, completed: false, frozen: true });

describe("computeStreak", () => {
  it("hiç gün yoksa 0", () => {
    expect(computeStreak([], "2026-11-25")).toEqual({ current: 0, todayDone: false });
  });

  it("bugün tamamlandıysa bugünden geriye sayar", () => {
    const days = [done("2026-11-23"), done("2026-11-24"), done("2026-11-25")];
    expect(computeStreak(days, "2026-11-25")).toEqual({ current: 3, todayDone: true });
  });

  it("bugün henüz bitmediyse dünden sayar, seri bozulmaz", () => {
    const days = [done("2026-11-23"), done("2026-11-24")];
    expect(computeStreak(days, "2026-11-25")).toEqual({ current: 2, todayDone: false });
  });

  it("kaçırılan gün seriyi bitirir", () => {
    const days = [done("2026-11-21"), done("2026-11-22"), done("2026-11-24")];
    expect(computeStreak(days, "2026-11-25").current).toBe(1);
  });

  it("donmuş gün seriyi bozmaz ama artırmaz", () => {
    const days = [done("2026-11-22"), frozen("2026-11-23"), done("2026-11-24"), done("2026-11-25")];
    expect(computeStreak(days, "2026-11-25").current).toBe(3);
  });

  it("ay ve yıl geçişinde kesintisiz sayar", () => {
    const days = [done("2026-12-30"), done("2026-12-31"), done("2027-01-01")];
    expect(computeStreak(days, "2027-01-01").current).toBe(3);
  });
});
