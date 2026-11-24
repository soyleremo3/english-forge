import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("isPublicPath", () => {
  it("yalnızca giriş ve geri dönüş yollarını açık sayar", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/words")).toBe(false);
    expect(isPublicPath("/auth/signout")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
