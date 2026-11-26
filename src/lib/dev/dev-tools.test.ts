import { describe, expect, it } from "vitest";
import { isDevToolsEnabled, isTestEmail, parseDayOffset, shiftDays } from "./dev-tools";

describe("isDevToolsEnabled", () => {
  it("yalnızca development ortamında açık", () => {
    expect(isDevToolsEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isDevToolsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isDevToolsEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isDevToolsEnabled({})).toBe(false);
  });
});

describe("isTestEmail", () => {
  it("+test ekli adresi test kullanıcısı sayar", () => {
    expect(isTestEmail("ad+test@gmail.com")).toBe(true);
    expect(isTestEmail(" Ad+TEST@gmail.com ")).toBe(true);
    expect(isTestEmail("ad+e2e@gmail.com")).toBe(true);
  });

  it("gerçek ve diğer + ekli adresleri test saymaz", () => {
    expect(isTestEmail("ad@gmail.com")).toBe(false);
    expect(isTestEmail("ad+work@gmail.com")).toBe(false);
    expect(isTestEmail("ad+testing@gmail.com")).toBe(false);
    expect(isTestEmail(null)).toBe(false);
  });
});

describe("parseDayOffset", () => {
  it("geçerli gün sayısını okur", () => {
    expect(parseDayOffset("3")).toBe(3);
    expect(parseDayOffset("0")).toBe(0);
  });

  it("geçersiz, negatif ya da boş değerde 0", () => {
    expect(parseDayOffset(undefined)).toBe(0);
    expect(parseDayOffset("abc")).toBe(0);
    expect(parseDayOffset("-2")).toBe(0);
    expect(parseDayOffset("1.5")).toBe(0);
  });

  it("üst sınırı aşmaz", () => {
    expect(parseDayOffset("99999")).toBe(3650);
  });
});

describe("shiftDays", () => {
  it("anı gün sayısı kadar ileri alır", () => {
    expect(shiftDays(new Date("2026-11-25T10:00:00Z"), 2).toISOString()).toBe("2026-11-27T10:00:00.000Z");
  });
});
