/**
 * Hesapları oluşturur ya da şifrelerini günceller (kayıt ekranı yok; Supabase'de kayıt kapalı).
 *
 *   npm run users                          # ALLOWED_EMAILS'teki her adres için sırayla sorar
 *   npm run users -- --email ad@ornek.com  # yalnızca bu adres
 *
 * - Şifre terminalde GİZLİ girilir: yazdıkların ekranda görünmez, hiçbir dosyaya ya da loga yazılmaz.
 *   Doğrulama için iki kez sorulur. Boş bırakırsan o adres atlanır.
 * - Hesap yoksa oluşturulur, varsa yalnızca şifresi değişir. E-posta doğrulaması gerekmez.
 * - Profil yoksa SPEC varsayılan ayarlarıyla oluşturulur.
 * - SUPABASE_SERVICE_ROLE_KEY yalnızca yerelde, yalnızca bu betikte kullanılır.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { parseAllowedEmails } from "@/lib/auth/allowed-emails";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Database } from "@/lib/supabase/database.types";
import { loadLocalEnv } from "./load-env";

const MIN_PASSWORD_LENGTH = 8;

/** Terminalden gizli girdi okur: karakterler ekrana yansımaz. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      reject(new Error("Bu betik etkileşimli bir terminalde çalışmalı (PowerShell penceresi)."));
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";

    const finish = (err?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (err) reject(err);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return finish();
        if (ch === "\u0003") return finish(new Error("İptal edildi."));
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function askPassword(email: string): Promise<string | null> {
  for (;;) {
    const first = await promptHidden(`\n${email} için yeni şifre (boş bırak = atla): `);
    if (first === "") return null;
    if (first.length < MIN_PASSWORD_LENGTH) {
      console.log(`  Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı. Tekrar dene.`);
      continue;
    }
    const second = await promptHidden("Şifreyi tekrar yaz: ");
    if (first !== second) {
      console.log("  Şifreler aynı değil. Tekrar dene.");
      continue;
    }
    return first;
  }
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local içinde olmalı.");

  const { values } = parseArgs({ options: { email: { type: "string" } } });
  const allowed = [...parseAllowedEmails(process.env.ALLOWED_EMAILS)];
  if (allowed.length === 0) throw new Error("ALLOWED_EMAILS boş.");
  const targets = values.email ? [values.email.trim().toLowerCase()] : allowed;
  for (const email of targets) {
    if (!allowed.includes(email)) throw new Error(`${email} ALLOWED_EMAILS listesinde değil; önce listeye ekle.`);
  }

  const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`Kullanıcılar okunamadı: ${listError.message}`);

  console.log("Şifre yazarken ekranda hiçbir şey görünmez; bu normal. Yazıp Enter'a bas.");

  for (const email of targets) {
    const password = await askPassword(email);
    if (password === null) {
      console.log(`  - ${email}: atlandı`);
      continue;
    }

    const existing = list.users.find((u) => u.email?.toLowerCase() === email);
    let userId: string;
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      if (error) throw new Error(`${email}: şifre güncellenemedi (${error.message})`);
      userId = existing.id;
      console.log(`  ✓ ${email}: şifre güncellendi`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error(`${email}: hesap oluşturulamadı (${error?.message ?? "?"})`);
      userId = data.user.id;
      console.log(`  ✓ ${email}: hesap oluşturuldu`);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ user_id: userId, settings: DEFAULT_SETTINGS }, { onConflict: "user_id", ignoreDuplicates: true });
    if (profileError) throw new Error(`${email}: profil oluşturulamadı (${profileError.message})`);
  }

  console.log("\nBitti. Artık /login sayfasında e-posta ve şifrenle girebilirsin.");
}

main().catch((e: unknown) => {
  console.error(`\nHata: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
