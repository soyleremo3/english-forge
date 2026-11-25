/**
 * data/words.ngsl.json için kalite özeti: işlev kelimeleri, alternatifi olanlar,
 * kurala uymayan alternatifler ve içerik kuralı uyarıları.
 *
 *   npm run words:report
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { isAcceptedAlternative, ruleWarnings, wordsFileSchema } from "@/lib/words/enriched-word";
import { loadAlternativeRules } from "./alternative-exceptions";

const root = process.cwd();
const file = wordsFileSchema.parse(
  JSON.parse(readFileSync(path.join(root, "data/words.ngsl.json"), "utf8")),
);
const altRules = loadAlternativeRules(root);
const words = file.words;

const fw = words.filter((w) => w.is_function_word);
const withAlt = words.filter((w) => w.en_alternatives.length > 0);
const badAlt = withAlt
  .map((w) => ({
    w,
    bad: w.en_alternatives.filter((a) => !isAcceptedAlternative(altRules, w.lemma, a)),
  }))
  .filter((x) => x.bad.length > 0);
const warned = words
  .map((w) => ({ w, msgs: ruleWarnings(w) }))
  .filter((x) => x.msgs.length > 0);

console.log(`Toplam: ${words.length} kelime`);
console.log(`\nİşlev kelimesi (${fw.length}):`);
console.log(fw.map((w) => `${w.lemma} (${w.pos})`).join(", ") || "-");
console.log(`\nAlternatifi olan (${withAlt.length}):`);
for (const w of withAlt) console.log(`  ${w.lemma} → ${w.en_alternatives.join(", ")}`);
console.log(`\nKurala uymayan alternatif (${badAlt.length}):`);
for (const { w, bad } of badAlt) console.log(`  ${w.lemma} → ${bad.join(", ")}`);
console.log(`\nKural uyarısı alan (${warned.length}):`);
for (const { w, msgs } of warned) {
  console.log(`  ${w.lemma} (${w.pos}) [${w.tr_meanings.join(" | ")}]: ${msgs.join("; ")}`);
}

const problems = [...new Set([...badAlt.map((x) => x.w.lemma), ...warned.map((x) => x.w.lemma)])];
console.log(
  problems.length > 0
    ? `\nSorunlu kelimeler (yeniden üretmek için): npm run enrich -- --only ${problems.join(",")}`
    : "\nSorunlu kelime yok.",
);
