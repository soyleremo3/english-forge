import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("isPublicPath", () => {
  it("yalnızca giriş sayfasını açık sayar", () => {
    expect(isPublicPath("/login")).toBe(true);
    // Sihirli bağlantı kaldırıldı: eski dönüş rotaları artık açık değil.
    expect(isPublicPath("/auth/callback")).toBe(false);
    expect(isPublicPath("/auth/confirm")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/words")).toBe(false);
    expect(isPublicPath("/auth/signout")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
