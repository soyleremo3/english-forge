import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isEmailAllowed } from "@/lib/auth/allowed-emails";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import type { Database } from "@/lib/supabase/database.types";

export type SignInResult = "ok" | "private" | "profile";

// Oturum açıldıktan sonra: izin kontrolü, sonra ilk girişse profil oluşturma.
export async function completeSignIn(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<SignInResult> {
  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return "private";
  }
  try {
    await ensureProfile(supabase, user.id);
  } catch {
    return "profile";
  }
  return "ok";
}
