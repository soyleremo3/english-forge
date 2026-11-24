import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Database } from "@/lib/supabase/database.types";

// İlk girişte profiles kaydını SPEC varsayılanlarıyla oluşturur. Kayıt varsa dokunmaz.
export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, settings: DEFAULT_SETTINGS },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Profil oluşturulamadı: ${error.message}`);
}
