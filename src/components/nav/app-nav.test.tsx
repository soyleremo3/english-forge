import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";
import { isActive } from "./nav-items";

vi.mock("next/navigation", () => ({
  usePathname: () => "/words/42",
}));

describe("isActive", () => {
  it("ana sayfayı yalnızca tam eşleşmede aktif sayar", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/words", "/")).toBe(false);
  });

  it("alt rotalarda üst menüyü aktif sayar", () => {
    expect(isActive("/words/42", "/words")).toBe(true);
    expect(isActive("/wordsmith", "/words")).toBe(false);
  });
});

describe("AppNav", () => {
  it("SPEC 12'deki beş menü öğesini sırayla gösterir", () => {
    render(<AppNav />);
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual(["Bugün", "Çalış", "Kelimeler", "Kitaplık", "Ben"]);
  });

  it("geçerli sayfayı aria-current ile işaretler", () => {
    render(<AppNav />);
    expect(screen.getByRole("link", { name: "Kelimeler" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
