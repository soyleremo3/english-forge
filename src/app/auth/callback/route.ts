import { NextResponse, type NextRequest } from "next/server";
import { completeSignIn } from "@/lib/auth/complete-sign-in";
import { createClient } from "@/lib/supabase/server";

// PKCE akışı (?code=...). Varsayılan Supabase e-posta şablonu buraya döner.
// Yalnızca giriş bağlantısının istendiği tarayıcıda çalışır (doğrulama çerezi orada).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const fail = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}`);

  if (!code) return fail("link");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Yalnızca hata kodu loglanır; token ya da e-posta loglanmaz.
    console.warn("[auth/callback] exchange başarısız:", error?.code ?? "no_user");
    return fail("link");
  }

  const result = await completeSignIn(supabase, data.user);
  if (result !== "ok") return fail(result);

  return NextResponse.redirect(`${origin}/`);
}
