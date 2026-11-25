import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/request-origin";
import { completeSignIn } from "@/lib/auth/complete-sign-in";
import { createClient } from "@/lib/supabase/server";

const EMAIL_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup"];

function isEmailType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_TYPES as readonly string[]).includes(value);
}

// E-postadaki bağlantı buraya gelir (?token_hash=...&type=email).
// Bağlantı hangi tarayıcıda ya da cihazda açılırsa oturum orada açılır.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Bağlantı hangi adreste açıldıysa (localhost ya da telefondan yerel IP) oraya dön.
  const origin = requestOrigin(request.headers, request.nextUrl.origin);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const fail = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}`);

  if (!tokenHash || !isEmailType(type)) return fail("link");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) return fail("link");

  const result = await completeSignIn(supabase, data.user);
  if (result !== "ok") return fail(result);

  return NextResponse.redirect(`${origin}/`);
}
