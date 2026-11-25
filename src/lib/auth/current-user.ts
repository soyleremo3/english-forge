import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getNow } from "@/lib/dev/clock";
import { createClient } from "@/lib/supabase/server";

/**
 * Oturumdaki kullanıcının id'sini, istek başına Supabase client'ını ve uygulamanın "şimdi"sini döner.
 * Oturum yoksa /login'e yönlendirir (proxy zaten engeller; bu ikinci kilit).
 */
export async function requireUser() {
  // Kullanıcıya özel, isteğe bağlı veri: önceden çizime (prerender) girmesin.
  // Sonraki Date.now()/new Date() çağrıları (çalışma günü hesabı) böylece istek anında yapılır.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  // Geliştirmede simüle edilen tarih (production'da gerçek zaman).
  const now = await getNow();
  return { supabase, userId, email, now };
}
