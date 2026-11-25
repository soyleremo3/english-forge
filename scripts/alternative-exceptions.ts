import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type AlternativeRules,
  alternativeExceptionsSchema,
  buildAlternativeRules,
} from "@/lib/words/enriched-word";

/**
 * data/alternative-exceptions.json: yazım farkı kuralının yanıldığı çiftler.
 * Yeni istisna eklemek için dosyaya şu biçimde bir nesne ekle:
 *   { "lemma": "story", "alternative": "storey", "kind": "exclude", "reason": "..." }
 * kind: "exclude" = alternatif olarak kabul etme, "allow" = kural elese de kabul et.
 */
export function loadAlternativeRules(root: string = process.cwd()): AlternativeRules {
  const raw = readFileSync(path.join(root, "data/alternative-exceptions.json"), "utf8");
  return buildAlternativeRules(alternativeExceptionsSchema.parse(JSON.parse(raw)));
}
