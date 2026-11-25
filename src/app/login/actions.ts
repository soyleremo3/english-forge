"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isEmailAllowed } from "@/lib/auth/allowed-emails";
import { completeSignIn } from "@/lib/auth/complete-sign-in";
import { isEmailCodeLoginEnabled } from "@/lib/auth/login-options";
import { createClient } from "@/lib/supabase/server";

// Giriş (SPEC 3, "Erişim güvenliği"):
// - Ana yöntem: e-posta + şifre (signInWithPassword).
// - Yedek: 6 haneli e-posta koduyla giriş (signInWithOtp + verifyOtp, type: email). SMTP kurulana kadar kapalı.
// - Kayıt yok: hesaplar yalnızca scripts/create-users.ts ile oluşturulur (Supabase'de kayıt kapalı).
// - ALLOWED_EMAILS kontrolü her adımda sunucuda yapılır; listede olmayana Supabase'e istek bile gitmez.
// - Oturum uzun sürer: @supabase/ssr çerezi 400 gün, yenileme anahtarının süresi yok, src/proxy.ts
//   her istekte oturumu yeniler. Telefonda bir kez girmek yeter.

export type LoginErrorReason =
  | "invalid" // e-posta biçimi ya da eksik alan
  | "private" // ALLOWED_EMAILS'te yok
  | "credentials" // e-posta ya da şifre hatalı
  | "code" // kod hatalı ya da süresi dolmuş
  | "rate" // Supabase hız sınırı
  | "disabled" // e-posta koduyla giriş kapalı
  | "failed"; // diğer

export type LoginState =
  | { status: "idle" }
  | { status: "code-sent"; email: string }
  | { status: "error"; reason: LoginErrorReason; email?: string };

const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(1).max(200);
const codeSchema = z.string().regex(/^\d{6}$/);

function readEmail(formData: FormData): string | null {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  return parsed.success ? parsed.data : null;
}

function errorReason(error: { status?: number; code?: string }, fallback: LoginErrorReason): LoginErrorReason {
  if (error.status === 429) return "rate";
  return fallback;
}

/** Oturum açıldıktan sonra: izin ve profil. Başarılıysa Bugün'e yönlendirir. */
async function finishSignIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: Parameters<typeof completeSignIn>[1],
): Promise<LoginState> {
  const result = await completeSignIn(supabase, user);
  if (result === "private") return { status: "error", reason: "private" };
  if (result === "profile") return { status: "error", reason: "failed" };
  redirect("/");
}

/** E-posta + şifre ile giriş. */
export async function signInWithPasswordAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = readEmail(formData);
  const password = passwordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!email || !password.success) return { status: "error", reason: "invalid" };
  if (!isEmailAllowed(email)) return { status: "error", reason: "private" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: password.data });
  if (error || !data.user) return { status: "error", reason: errorReason(error ?? {}, "credentials"), email };
  return finishSignIn(supabase, data.user);
}

/** Yedek yöntem, 1. adım: e-postaya 6 haneli kod gönder. Yeni hesap oluşturmaz. */
export async function requestEmailCodeAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isEmailCodeLoginEnabled()) return { status: "error", reason: "disabled" };
  const email = readEmail(formData);
  if (!email) return { status: "error", reason: "invalid" };
  if (!isEmailAllowed(email)) return { status: "error", reason: "private" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) return { status: "error", reason: errorReason(error, "failed"), email };
  return { status: "code-sent", email };
}

/** Yedek yöntem, 2. adım: kodu doğrula ve oturum aç. */
export async function verifyEmailCodeAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isEmailCodeLoginEnabled()) return { status: "error", reason: "disabled" };
  const email = readEmail(formData);
  if (!email) return { status: "error", reason: "invalid" };
  if (!isEmailAllowed(email)) return { status: "error", reason: "private" };
  const code = codeSchema.safeParse(String(formData.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success) return { status: "error", reason: "code", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error || !data.user) return { status: "error", reason: errorReason(error ?? {}, "code"), email };
  return finishSignIn(supabase, data.user);
}
