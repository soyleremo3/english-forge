"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isEmailAllowed } from "@/lib/auth/allowed-emails";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; reason: "invalid" | "private" | "rate" | "send" };

const emailSchema = z.email().max(254);

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const email = parsed.data;

  // İzin kontrolü sunucuda; listede olmayana Supabase'e istek bile gitmez.
  if (!isEmailAllowed(email)) return { status: "error", reason: "private" };

  // Giriş bağlantısı, isteğin yapıldığı adrese döner: telefondan istenirse telefondaki adrese.
  const h = await headers();
  const origin = h.get("origin") ?? requestOrigin(h, "http://localhost:3000");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
  });

  if (error) {
    return { status: "error", reason: error.status === 429 ? "rate" : "send" };
  }
  return { status: "sent" };
}
