/**
 * Test kullanıcısını oluşturur (yoksa). Denemeler gerçek veriyi bozmasın diye bu kullanıcıyla yapılır.
 *
 *   npm run test-user
 *
 * E-posta: TEST_USER_EMAIL (.env.local) ya da varsayılan olarak ALLOWED_EMAILS'teki "+test" adresi.
 * SUPABASE_SERVICE_ROLE_KEY yalnızca yerelde kullanılır; anahtar yazdırılmaz.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");

  const email =
    process.env.TEST_USER_EMAIL ??
    (process.env.ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim()).find((e) => e.includes("+test@"));
  if (!email) throw new Error("ALLOWED_EMAILS içinde +test adresi yok.");

  const admin = createClient<Database>(url, service, { auth: { persistSession: false } });
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    console.log(`Test kullanıcısı zaten var: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log(`Test kullanıcısı oluşturuldu: ${email}`);
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ user_id: user.id, settings: DEFAULT_SETTINGS }, { onConflict: "user_id", ignoreDuplicates: true });
  if (profileError) throw profileError;
  console.log("Profil hazır (varsayılan ayarlar).");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
