import { describe, expect, it } from "vitest";
import { requestOrigin } from "./request-origin";

const h = (entries: Record<string, string>) => new Headers(entries);
const fallback = "http://0.0.0.0:3000";

describe("requestOrigin", () => {
  it("telefonun kullandığı yerel IP adresini Host başlığından alır", () => {
    expect(requestOrigin(h({ host: "172.20.10.4:3000" }), fallback)).toBe("http://172.20.10.4:3000");
    expect(requestOrigin(h({ host: "192.168.1.23:3000" }), fallback)).toBe("http://192.168.1.23:3000");
  });

  it("localhost'u korur", () => {
    expect(requestOrigin(h({ host: "localhost:3000" }), "http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("Vercel gibi vekil sunucularda x-forwarded başlıklarını kullanır", () => {
    expect(
      requestOrigin(h({ host: "internal:3000", "x-forwarded-host": "app.example.com", "x-forwarded-proto": "https" }), fallback),
    ).toBe("https://app.example.com");
  });

  it("Host yoksa, geçersizse ya da 0.0.0.0 ise yedek adresi döner", () => {
    expect(requestOrigin(h({}), "http://localhost:3000")).toBe("http://localhost:3000");
    expect(requestOrigin(h({ host: "evil.com/path" }), "http://localhost:3000")).toBe("http://localhost:3000");
    expect(requestOrigin(h({ host: "0.0.0.0:3000" }), "http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("protokolü yedek adresten alır (x-forwarded-proto yoksa)", () => {
    expect(requestOrigin(h({ host: "example.com" }), "https://example.com")).toBe("https://example.com");
  });
});
