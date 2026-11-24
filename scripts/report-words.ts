/**
 * data/words.ngsl.json için kalite özeti: işlev kelimeleri, alternatifi olanlar, kural uyarıları.
 *
 *   npm run words:report
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ruleWarnings, wordsFileSchema } from "@/lib/words/enriched-word";

const file = wordsFileSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "data/words.ngsl.json"), "utf8")),
);
const words = file.words;

const fw = words.filter((w) => w.is_function_word);
const withAlt = words.filter((w) => w.en_alternatives.length > 0);
const warned = words
  .map((w) => ({ w, msgs: ruleWarnings(w) }))
  .filter((x) => x.msgs.length > 0);

console.log(`Toplam: ${words.length} kelime`);
console.log(`\nİşlev kelimesi (${fw.length}):`);
console.log(fw.map((w) => `${w.lemma} (${w.pos})`).join(", ") || "-");
console.log(`\nAlternatifi olan (${withAlt.length}):`);
for (const w of withAlt) console.log(`  ${w.lemma} → ${w.en_alternatives.join(", ")}`);
console.log(`\nKural uyarısı alan (${warned.length}):`);
for (const { w, msgs } of warned) console.log(`  ${w.lemma} (${w.pos}) [${w.tr_meanings.join(" | ")}]: ${msgs.join("; ")}`);
