import { beforeEach, describe, expect, it, vi } from "vitest";

// Supabase ve Next.js sunucu API'leri sahte; yalnızca giriş kuralları test edilir.
const signInWithPassword = vi.fn();
const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
const completeSignIn = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword, signInWithOtp, verifyOtp } }),
}));
vi.mock("@/lib/auth/complete-sign-in", () => ({
  completeSignIn: (...args: unknown[]) => completeSignIn(...args),
}));

const { requestEmailCodeAction, signInWithPasswordAction, verifyEmailCodeAction } = await import("./actions");

const idle = { status: "idle" } as const;
const user = { id: "u1", email: "me@example.com" };

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.stubEnv("ALLOWED_EMAILS", "me@example.com,me+test@example.com");
  vi.stubEnv("EMAIL_CODE_LOGIN", "true");
  signInWithPassword.mockReset().mockResolvedValue({ data: { user }, error: null });
  signInWithOtp.mockReset().mockResolvedValue({ data: {}, error: null });
  verifyOtp.mockReset().mockResolvedValue({ data: { user }, error: null });
  completeSignIn.mockReset().mockResolvedValue("ok");
  redirect.mockClear();
});

describe("signInWithPasswordAction (e-posta + şifre)", () => {
  it("izinli e-posta ve doğru şifreyle girer, profil kontrolünden sonra Bugün'e yönlendirir", async () => {
    await expect(
      signInWithPasswordAction(idle, form({ email: " Me@Example.com ", password: "gizli-şifre" })),
    ).rejects.toThrow("REDIRECT:/");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "Me@Example.com", password: "gizli-şifre" });
    expect(completeSignIn).toHaveBeenCalledOnce();
  });

  it("listede olmayan e-postayı Supabase'e sormadan reddeder", async () => {
    const res = await signInWithPasswordAction(idle, form({ email: "stranger@example.com", password: "x" }));
    expect(res).toEqual({ status: "error", reason: "private" });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("geçersiz e-posta ya da boş şifre", async () => {
    expect(await signInWithPasswordAction(idle, form({ email: "not-an-email", password: "x" }))).toEqual({
      status: "error",
      reason: "invalid",
    });
    expect(await signInWithPasswordAction(idle, form({ email: "me@example.com", password: "" }))).toEqual({
      status: "error",
      reason: "invalid",
    });
  });

  it("hatalı şifrede e-postayı koruyarak 'credentials' hatası verir", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 400, code: "invalid_credentials" } });
    const res = await signInWithPasswordAction(idle, form({ email: "me@example.com", password: "yanlış" }));
    expect(res).toEqual({ status: "error", reason: "credentials", email: "me@example.com" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("hız sınırında 'rate' hatası verir", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 429 } });
    const res = await signInWithPasswordAction(idle, form({ email: "me@example.com", password: "x" }));
    expect(res).toMatchObject({ status: "error", reason: "rate" });
  });

  it("izin sonradan reddedilirse (completeSignIn 'private') yönlendirmez", async () => {
    completeSignIn.mockResolvedValue("private");
    const res = await signInWithPasswordAction(idle, form({ email: "me@example.com", password: "x" }));
    expect(res).toEqual({ status: "error", reason: "private" });
  });
});

describe("e-posta koduyla giriş (yedek yöntem)", () => {
  it("kod ister; yeni hesap oluşturmaz", async () => {
    const res = await requestEmailCodeAction(idle, form({ email: "me@example.com" }));
    expect(res).toEqual({ status: "code-sent", email: "me@example.com" });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "me@example.com", options: { shouldCreateUser: false } });
  });

  it("listede olmayana kod göndermez", async () => {
    const res = await requestEmailCodeAction(idle, form({ email: "stranger@example.com" }));
    expect(res).toEqual({ status: "error", reason: "private" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("6 haneli kodu type: email ile doğrular ve girer", async () => {
    await expect(
      verifyEmailCodeAction(idle, form({ email: "me@example.com", code: "123 456" })),
    ).rejects.toThrow("REDIRECT:/");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "me@example.com", token: "123456", type: "email" });
  });

  it("6 haneli olmayan kodu Supabase'e sormadan reddeder", async () => {
    const res = await verifyEmailCodeAction(idle, form({ email: "me@example.com", code: "12345" }));
    expect(res).toEqual({ status: "error", reason: "code", email: "me@example.com" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("hatalı ya da süresi dolmuş kodda 'code' hatası", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: { status: 403, code: "otp_expired" } });
    const res = await verifyEmailCodeAction(idle, form({ email: "me@example.com", code: "654321" }));
    expect(res).toEqual({ status: "error", reason: "code", email: "me@example.com" });
  });

  it("EMAIL_CODE_LOGIN kapalıyken iki adım da çalışmaz", async () => {
    vi.stubEnv("EMAIL_CODE_LOGIN", "false");
    expect(await requestEmailCodeAction(idle, form({ email: "me@example.com" }))).toEqual({
      status: "error",
      reason: "disabled",
    });
    expect(await verifyEmailCodeAction(idle, form({ email: "me@example.com", code: "123456" }))).toEqual({
      status: "error",
      reason: "disabled",
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
