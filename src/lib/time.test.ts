import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  endOfStudyDay,
  getStudyDate,
  startOfStudyDay,
  getTimeConfig,
  isoWeekday,
  type TimeConfig,
  weekStart,
} from "./time";

const ist: TimeConfig = { timeZone: "Europe/Istanbul", dayStartHour: 4 };

// İstanbul UTC+3 (yaz saati yok). "2026-03-10T03:59:00+03:00" İstanbul yerel saatidir.
const at = (local: string) => new Date(`${local}+03:00`);

describe("getStudyDate", () => {
  it("03:59 önceki güne sayılır", () => {
    expect(getStudyDate(at("2026-03-10T03:59:00"), ist)).toBe("2026-03-09");
  });

  it("04:00 yeni gündür", () => {
    expect(getStudyDate(at("2026-03-10T04:00:00"), ist)).toBe("2026-03-10");
  });

  it("gece 01:00 önceki güne, öğlen aynı güne sayılır", () => {
    expect(getStudyDate(at("2026-03-10T01:00:00"), ist)).toBe("2026-03-09");
    expect(getStudyDate(at("2026-03-10T12:00:00"), ist)).toBe("2026-03-10");
    expect(getStudyDate(at("2026-03-10T23:59:00"), ist)).toBe("2026-03-10");
  });

  it("ay geçişi: 1 Nisan 03:00 → 31 Mart", () => {
    expect(getStudyDate(at("2026-04-01T03:00:00"), ist)).toBe("2026-03-31");
    expect(getStudyDate(at("2026-04-01T04:00:00"), ist)).toBe("2026-04-01");
  });

  it("şubat sonu: artık yıl ve normal yıl", () => {
    expect(getStudyDate(at("2028-03-01T02:00:00"), ist)).toBe("2028-02-29");
    expect(getStudyDate(at("2027-03-01T02:00:00"), ist)).toBe("2027-02-28");
  });

  it("yıl geçişi: 1 Ocak 03:30 → 31 Aralık", () => {
    expect(getStudyDate(at("2027-01-01T03:30:00"), ist)).toBe("2026-12-31");
    expect(getStudyDate(at("2027-01-01T04:00:00"), ist)).toBe("2027-01-01");
  });

  it("UTC'de gün değişse de İstanbul gününü kullanır", () => {
    // UTC 2026-03-09 22:30 = İstanbul 2026-03-10 01:30 → çalışma günü 2026-03-09
    expect(getStudyDate(new Date("2026-03-09T22:30:00Z"), ist)).toBe("2026-03-09");
    // UTC 2026-03-10 01:00 = İstanbul 04:00 → 2026-03-10
    expect(getStudyDate(new Date("2026-03-10T01:00:00Z"), ist)).toBe("2026-03-10");
  });

  it("farklı gün başlangıç saatine uyar", () => {
    expect(getStudyDate(at("2026-03-10T00:30:00"), { ...ist, dayStartHour: 0 })).toBe("2026-03-10");
    expect(getStudyDate(at("2026-03-10T05:59:00"), { ...ist, dayStartHour: 6 })).toBe("2026-03-09");
  });
});

describe("getTimeConfig", () => {
  it("ortam değişkenlerini okur", () => {
    expect(getTimeConfig({ APP_TIMEZONE: "UTC", DAY_START_HOUR: "5" })).toEqual({
      timeZone: "UTC",
      dayStartHour: 5,
    });
  });

  it("boş ya da geçersizse varsayılanı kullanır", () => {
    expect(getTimeConfig({})).toEqual(ist);
    expect(getTimeConfig({ DAY_START_HOUR: "25" }).dayStartHour).toBe(4);
    expect(getTimeConfig({ DAY_START_HOUR: "abc" }).dayStartHour).toBe(4);
  });
});

describe("startOfStudyDay / endOfStudyDay", () => {
  it("İstanbul'da gün 04:00'te (UTC 01:00) başlar", () => {
    expect(startOfStudyDay("2026-11-26", ist).toISOString()).toBe("2026-11-26T01:00:00.000Z");
    expect(endOfStudyDay("2026-11-25", ist).toISOString()).toBe("2026-11-26T01:00:00.000Z");
  });

  it("getStudyDate ile tutarlı: başlangıç anı o güne, bir saniye öncesi önceki güne ait", () => {
    const start = startOfStudyDay("2027-01-01", ist);
    expect(getStudyDate(start, ist)).toBe("2027-01-01");
    expect(getStudyDate(new Date(start.getTime() - 1000), ist)).toBe("2026-12-31");
  });

  it("yaz saati olan bölgede de yerel saati korur", () => {
    const berlin: TimeConfig = { timeZone: "Europe/Berlin", dayStartHour: 4 };
    expect(startOfStudyDay("2026-07-01", berlin).toISOString()).toBe("2026-07-01T02:00:00.000Z");
    expect(startOfStudyDay("2026-12-01", berlin).toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });
});

describe("gün yardımcıları", () => {
  it("diffDays ay ve yıl geçişinde doğru sayar", () => {
    expect(diffDays("2026-03-30", "2026-04-02")).toBe(3);
    expect(diffDays("2026-12-31", "2027-01-01")).toBe(1);
    expect(diffDays("2028-02-28", "2028-03-01")).toBe(2);
    expect(diffDays("2026-01-05", "2026-01-01")).toBe(-4);
  });

  it("addDays ay ve yıl geçişinde doğru ilerler", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("isoWeekday: Pazartesi 1, Pazar 7", () => {
    expect(isoWeekday("2026-11-23")).toBe(1);
    expect(isoWeekday("2026-11-29")).toBe(7);
  });

  it("weekStart haftanın Pazartesisini verir", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23");
    expect(weekStart("2026-11-23")).toBe("2026-11-23");
    expect(weekStart("2026-11-29")).toBe("2026-11-23");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
});
