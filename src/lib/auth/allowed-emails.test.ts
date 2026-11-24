import { describe, expect, it } from "vitest";
import { isEmailAllowed, parseAllowedEmails } from "./allowed-emails";

describe("parseAllowedEmails", () => {
  it("virgülle ayrılmış listeyi temizler", () => {
    expect([...parseAllowedEmails(" A@x.com, ,b@y.com ")]).toEqual([
      "a@x.com",
      "b@y.com",
    ]);
  });

  it("boş ya da tanımsız değerde boş küme döner", () => {
    expect(parseAllowedEmails(undefined).size).toBe(0);
    expect(parseAllowedEmails("").size).toBe(0);
  });
});

describe("isEmailAllowed", () => {
  const list = "me@example.com,other@example.com";

  it("listedeki e-postayı büyük/küçük harf ve boşluk fark etmeden kabul eder", () => {
    expect(isEmailAllowed("  ME@Example.com ", list)).toBe(true);
  });

  it("listede olmayanı reddeder", () => {
    expect(isEmailAllowed("stranger@example.com", list)).toBe(false);
  });

  it("liste boşsa herkesi reddeder", () => {
    expect(isEmailAllowed("me@example.com", "")).toBe(false);
    expect(isEmailAllowed("me@example.com", undefined)).toBe(false);
  });

  it("boş e-postayı reddeder", () => {
    expect(isEmailAllowed(null, list)).toBe(false);
    expect(isEmailAllowed("", list)).toBe(false);
  });
});
