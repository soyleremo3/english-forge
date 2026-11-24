import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtp = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp } }),
}));

const { sendMagicLink } = await import("./actions");

function form(email: string) {
  const fd = new FormData();
  fd.set("email", email);
  return fd;
}

describe("sendMagicLink", () => {
  beforeEach(() => {
    signInWithOtp.mockReset().mockResolvedValue({ error: null });
    vi.stubEnv("ALLOWED_EMAILS", "me@example.com");
  });

  it("listede olmayan e-postayı Supabase'e sormadan reddeder", async () => {
    const res = await sendMagicLink({ status: "idle" }, form("stranger@example.com"));
    expect(res).toEqual({ status: "error", reason: "private" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("geçersiz e-postayı reddeder", async () => {
    const res = await sendMagicLink({ status: "idle" }, form("not-an-email"));
    expect(res).toEqual({ status: "error", reason: "invalid" });
  });

  it("Supabase 429 dönerse limit mesajı verir", async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 429, message: "rate" } });
    const res = await sendMagicLink({ status: "idle" }, form("me@example.com"));
    expect(res).toEqual({ status: "error", reason: "rate" });
  });

  it("izinli e-postaya callback adresiyle bağlantı yollar", async () => {
    const res = await sendMagicLink({ status: "idle" }, form(" Me@Example.com "));
    expect(res).toEqual({ status: "sent" });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "Me@Example.com",
      options: {
        emailRedirectTo: "http://localhost:3000/auth/callback",
        shouldCreateUser: true,
      },
    });
  });
});
