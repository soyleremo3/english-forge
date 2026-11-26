/**
 * Geliştirici araçlarını gerektiren uçtan uca testi çalıştırır (günlük test + "Tarihi ileri al" ile ertesi
 * günün tekrarı). YALNIZCA otomasyon hesabını (ALLOWED_EMAILS içindeki "+e2e" adresi) kullanır.
 *
 *   1) Bir pencerede: npm run dev   (ya da npm run dev:lan)
 *   2) Başka pencerede: npm run test:e2e:dev
 *
 * - Hesaba her çalıştırmada rastgele bir şifre verilir; şifre yalnızca bellekte durur, yazdırılmaz.
 * - Hesabın verisi sıfırlanır, bugünün ilk grubu sunucu tarafında (2 yanlışla) bitirilir, sonra test koşar.
 * - Bitince hesabın verisi temizlenir ve şifresi yeniden rastgele yapılır.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ensureNewWordsPlan, loadStudyWords, submitGroupQuiz } from "@/lib/new-words";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { buildQuizItems, expectedAnswer } from "@/lib/study/quiz";
import type { Database } from "@/lib/supabase/database.types";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const email = (process.env.ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim()).find((e) => e.includes("+e2e@"));
  if (!url || !anon || !service) throw new Error("Supabase anahtarları .env.local içinde olmalı.");
  if (!email) throw new Error("ALLOWED_EMAILS içinde '+e2e' adresi yok (ör. ad+e2e@gmail.com).");

  const admin = createClient<Database>(url, service, { auth: { persistSession: false } });
  const password = randomBytes(18).toString("base64url");
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = list.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  else {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (!created.data.user) throw new Error("Otomasyon hesabı oluşturulamadı.");
    user = created.data.user;
  }
  const userId = user.id;

  const wipe = async () => {
    for (const t of ["review_logs", "quiz_attempts", "user_words", "study_days"] as const) {
      await admin.from(t).delete().eq("user_id", userId);
    }
  };

  try {
    await wipe();
    await admin.from("profiles").upsert({ user_id: userId, settings: { ...DEFAULT_SETTINGS, daily_new: 8 } }, { onConflict: "user_id" });

    // Bugünün grubunu bitir (2 yanlış) — test günlük testten başlar.
    const db = createClient<Database>(url, anon, { auth: { persistSession: false } });
    const { error: signInError } = await db.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const now = new Date();
    const ctx = await ensureNewWordsPlan(db, userId, now);
    const ids = ctx.plan.groups[0] ?? [];
    const words = new Map((await loadStudyWords(db, userId, ids)).map((w) => [w.wordId, w]));
    const items = buildQuizItems(ids, "mixed");
    await submitGroupQuiz(
      db,
      userId,
      now,
      0,
      items.map((it, i) => {
        const w = words.get(it.wordId);
        return {
          wordId: it.wordId,
          direction: it.direction,
          appealed: false,
          answer: i < 2 || !w ? "zzzz" : expectedAnswer(w, it.direction).split(",")[0],
        };
      }),
    );
    console.log(`Hazır: ${email} — bugünün grubu bitti, test ${baseUrl} üzerinde başlıyor.`);

    const run = spawnSync("npx", ["playwright", "test", "e2e/review-daily.dev.spec.ts", "--project=masaüstü-chromium"], {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, E2E_BASE_URL: baseUrl, E2E_DEV: "1", E2E_EMAIL: email, E2E_PASSWORD: password },
    });
    process.exitCode = run.status ?? 1;
  } finally {
    await wipe();
    await admin.auth.admin.updateUserById(userId, { password: randomBytes(24).toString("base64url") });
    console.log("Otomasyon hesabının verisi temizlendi.");
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
