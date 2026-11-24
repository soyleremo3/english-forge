/**
 * NGSL kelimelerini Gemini ile zenginleştirir (SPEC 5.1) ve data/words.ngsl.json'a yazar.
 *
 *   npm run enrich -- --limit 50          # en fazla 50 yeni kelime işle
 *   npm run enrich -- --delay 6000        # partiler arası bekleme (ms), varsayılan 5000
 *   npm run enrich -- --only get,set,run  # yalnızca bu kelimeleri (yeniden) üret
 *
 * Kaldığı yerden devam eder: JSON'da olan kelimeler atlanır. Her partiden sonra dosya kaydedilir.
 * Kota dolarsa durur; ertesi gün aynı komutla devam edilir.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { AiQuotaError, generateStructured, getModelChain } from "@/lib/ai";
import { ENRICH_WORDS_SYSTEM, enrichWordsPrompt } from "@/lib/prompts/enrich-words";
import {
  aiBatchSchema,
  type EnrichedWord,
  matchBatch,
  type WordsFile,
  ruleWarnings,
  wordsFileSchema,
} from "@/lib/words/enriched-word";
import { loadLocalEnv } from "./load-env";

const ROOT = process.cwd();
const RAW_CSV = path.join(ROOT, "data/raw/ngsl.csv");
const OUT_JSON = path.join(ROOT, "data/words.ngsl.json");
const BATCH_SIZE = 25;
const SCRIPT_TIMEOUT_MS = 45_000;

loadLocalEnv(ROOT);

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    delay: { type: "string", default: "5000" },
    only: { type: "string" },
  },
});
const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
const delayMs = Number(values.delay);
const only = values.only
  ? new Set(values.only.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean))
  : null;
if (!(limit > 0) || !(delayMs >= 0)) {
  console.error("Geçersiz parametre. Örnek: npm run enrich -- --limit 50");
  process.exit(1);
}

function readNgsl(): { lemma: string; rank: number }[] {
  const lines = readFileSync(RAW_CSV, "utf8").replace(/^﻿/, "").split(/\r?\n/);
  const header = lines[0].split(",");
  const lemmaCol = header.indexOf("Lemma");
  const rankCol = header.indexOf("SFI Rank");
  if (lemmaCol < 0 || rankCol < 0) throw new Error("ngsl.csv kolonları beklenenden farklı.");
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const cols = l.split(",");
      return { lemma: cols[lemmaCol].trim(), rank: Number(cols[rankCol]) };
    })
    .sort((a, b) => a.rank - b.rank);
}

function readExisting(): WordsFile {
  if (!existsSync(OUT_JSON)) {
    return { source: "ngsl", list_version: "1.2", license: "CC BY-SA 4.0", words: [] };
  }
  return wordsFileSchema.parse(JSON.parse(readFileSync(OUT_JSON, "utf8")));
}

function save(file: WordsFile): void {
  file.words.sort((a, b) => a.rank - b.rank);
  const tmp = `${OUT_JSON}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  renameSync(tmp, OUT_JSON);
}

/** Partideki kural ihlalleri (kaydı engellemez, gözden geçirmek için). */
function batchWarnings(words: EnrichedWord[]): string[] {
  return words.flatMap((w) => ruleWarnings(w).map((msg) => `${w.lemma} (${w.pos}): ${msg}`));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY boş. Anahtarı .env.local dosyasına ekle.");
  }
  const models = getModelChain();
  console.log(`Model sırası: ${models.join(" → ")}`);

  const all = readNgsl();
  const file = readExisting();
  const done = new Set(file.words.map((w) => w.lemma));
  let todo: { lemma: string; rank: number }[];
  if (only) {
    // --only: listedeki kelimeler, hazır olsalar bile yeniden üretilir.
    todo = all.filter((w) => only.has(w.lemma.toLowerCase()));
    const unknown = [...only].filter((w) => !todo.some((t) => t.lemma.toLowerCase() === w));
    if (unknown.length > 0) console.log(`NGSL'de yok, atlandı: ${unknown.join(", ")}`);
    const redo = new Set(todo.map((w) => w.lemma));
    file.words = file.words.filter((w) => !redo.has(w.lemma));
  } else {
    todo = all.filter((w) => !done.has(w.lemma)).slice(0, limit);
  }

  console.log(
    `NGSL: ${all.length} kelime · hazır: ${done.size} · bu çalıştırmada: ${todo.length} (${BATCH_SIZE}'erli partiler)`,
  );
  if (todo.length === 0) {
    console.log("Yapılacak kelime yok.");
    return;
  }

  let added = 0;
  const totalBatches = Math.ceil(todo.length / BATCH_SIZE);

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const n = i / BATCH_SIZE + 1;
    process.stdout.write(`[${n}/${totalBatches}] ${batch[0].lemma} … ${batch.at(-1)?.lemma} `);

    try {
      const { data, model } = await generateStructured({
        schema: aiBatchSchema,
        system: ENRICH_WORDS_SYSTEM,
        prompt: enrichWordsPrompt(batch.map((w) => w.lemma)),
        // Toplu, çevrimdışı iş: 25 kelimelik parti için uygulamadaki 20 sn yerine 45 sn.
        timeoutMs: SCRIPT_TIMEOUT_MS,
        onAttempt: (a) => {
          if (!a.ok) process.stdout.write(`(${a.model}: ${a.reason}) `);
        },
      });
      const { matched, missing } = matchBatch(batch, data.words);
      file.words.push(...matched);
      added += matched.length;
      save(file);
      console.log(`✓ ${matched.length} kelime · ${model}`);
      for (const warning of batchWarnings(matched)) console.log(`  uyarı: ${warning}`);
      if (missing.length > 0) {
        console.log(`  eksik kaldı (sonraki çalıştırmada tekrar denenecek): ${missing.join(", ")}`);
      }
    } catch (error) {
      if (error instanceof AiQuotaError) {
        console.log("✗ kota doldu");
        console.log(
          `\nGünlük Gemini kotası doldu. ${added} kelime eklendi, kaydedildi. Yarın aynı komutla devam et.`,
        );
        process.exitCode = 2;
        return;
      }
      console.log("✗ parti başarısız, atlandı (sonraki çalıştırmada tekrar denenecek)");
      if (error instanceof Error) console.log(`  sebep: ${error.message}`);
    }

    if (i + BATCH_SIZE < todo.length) await sleep(delayMs);
  }

  const emptyMeaning = file.words.filter((w) => w.tr_meanings.length === 0).length;
  console.log(
    `\nBitti. Bu çalıştırmada ${added} kelime eklendi. Toplam: ${file.words.length}/${all.length}. Anlamı boş: ${emptyMeaning}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
