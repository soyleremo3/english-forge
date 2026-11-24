/**
 * data/words.ngsl.json dosyasını Supabase words tablosuna upsert eder (SPEC 5.1).
 *
 *   npm run seed
 *
 * SUPABASE_SERVICE_ROLE_KEY yalnızca bu betikte kullanılır (yerelde). Anahtar asla yazdırılmaz.
 * Aynı (source, lemma) varsa günceller; tekrar çalıştırmak güvenlidir.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadLocalEnv } from "./load-env";
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/lib/supabase/database.types";
import { wordsFileSchema } from "@/lib/words/enriched-word";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "data/words.ngsl.json");
const CHUNK = 500;

loadLocalEnv(ROOT);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env.local içinde olmalı.");
  }

  const file = wordsFileSchema.parse(JSON.parse(readFileSync(JSON_PATH, "utf8")));
  const rows: TablesInsert<"words">[] = file.words.map((w) => ({
    source: file.source,
    lemma: w.lemma,
    rank: w.rank,
    pos: w.pos,
    tr_meanings: w.tr_meanings,
    en_alternatives: w.en_alternatives,
    en_definition: w.en_definition,
    example_en: w.example_en,
    example_tr: w.example_tr,
    cefr: w.cefr,
    is_function_word: w.is_function_word,
  }));

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`${rows.length} kelime yükleniyor…`);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("words").upsert(chunk, { onConflict: "source,lemma" });
    if (error) throw new Error(`Upsert başarısız (${error.code}): ${error.message}`);
    console.log(`  ✓ ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  const { count, error } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("source", file.source);
  if (error) throw new Error(error.message);
  console.log(`Bitti. words tablosunda ${count} ${file.source} kelimesi var.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
