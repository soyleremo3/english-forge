import { z } from "zod";
import { damerauLevenshtein } from "@/lib/text/damerau-levenshtein";

// Zenginleştirilmiş kelime kaydı (SPEC 5.1). data/words.ngsl.json ve seed betiği bunu kullanır.

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const POS_VALUES = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "determiner",
  "auxiliary",
  "modal",
  "interjection",
  "number",
] as const;

export type Pos = (typeof POS_VALUES)[number];

/** Modelden beklenen tek kelimelik çıktı. is_function_word modelden istenmez, kod hesaplar. */
export const aiWordSchema = z.object({
  lemma: z.string().min(1).max(100),
  pos: z.enum(POS_VALUES),
  tr_meanings: z.array(z.string().min(1).max(60)).min(1).max(3),
  en_alternatives: z.array(z.string().min(1).max(60)).max(3),
  en_definition: z.string().min(3).max(200),
  example_en: z.string().min(3).max(200),
  example_tr: z.string().min(3).max(220),
  cefr: z.enum(CEFR_LEVELS),
});

export const aiBatchSchema = z.object({
  words: z.array(aiWordSchema),
});

export type AiWord = z.infer<typeof aiWordSchema>;

/** JSON dosyasında saklanan kayıt: model çıktısı + listedeki sıra + hesaplanan işlev kelimesi bayrağı. */
export const enrichedWordSchema = aiWordSchema.extend({
  rank: z.number().int().positive(),
  is_function_word: z.boolean(),
});

export type EnrichedWord = z.infer<typeof enrichedWordSchema>;

export const wordsFileSchema = z.object({
  source: z.literal("ngsl"),
  list_version: z.literal("1.2"),
  license: z.literal("CC BY-SA 4.0"),
  words: z.array(enrichedWordSchema),
});

export type WordsFile = z.infer<typeof wordsFileSchema>;

// ---------------------------------------------------------------------------
// İşlev kelimesi (SPEC 5.1): ana anlamın türüne göre, kodla belirlenir.
// ---------------------------------------------------------------------------

const FUNCTION_POS: ReadonlySet<Pos> = new Set([
  "determiner",
  "pronoun",
  "preposition",
  "conjunction",
  "auxiliary",
  "modal",
]);

export function isFunctionWord(lemma: string, pos: Pos): boolean {
  return FUNCTION_POS.has(pos) || lemma.trim().toLowerCase() === "not";
}

// ---------------------------------------------------------------------------
// Alternatifler: yalnızca yazım farkları (color/colour, center/centre, gray/grey).
// ---------------------------------------------------------------------------

/** b, a'nın sonuna yalnızca -s / -es eklenmiş hali mi? */
function isSuffixForm(a: string, b: string): boolean {
  return b === `${a}s` || b === `${a}es`;
}

/**
 * Kuralın yanıldığı çiftler (data/alternative-exceptions.json):
 * - "exclude": yazım farkı gibi görünen ama farklı kelime (story/storey).
 * - "allow": kuralın elediği ama gerçek yazım farkı olan (toward/towards).
 */
export const alternativeExceptionsSchema = z.array(
  z.object({
    lemma: z.string().min(1),
    alternative: z.string().min(1),
    kind: z.enum(["exclude", "allow"]),
    reason: z.string().min(1),
  }),
);

export type AlternativeException = z.infer<typeof alternativeExceptionsSchema>[number];

export type AlternativeRules = {
  exclude: ReadonlySet<string>;
  allow: ReadonlySet<string>;
};

export const NO_ALTERNATIVE_RULES: AlternativeRules = { exclude: new Set(), allow: new Set() };

const pairKey = (lemma: string, alternative: string) =>
  `${lemma.trim().toLowerCase()}→${alternative.trim().toLowerCase()}`;

/** İstisna listesini hızlı arama için kümelere çevirir (iki yön de kapsanır). */
export function buildAlternativeRules(list: readonly AlternativeException[]): AlternativeRules {
  const exclude = new Set<string>();
  const allow = new Set<string>();
  for (const e of list) {
    const target = e.kind === "allow" ? allow : exclude;
    target.add(pairKey(e.lemma, e.alternative));
    target.add(pairKey(e.alternative, e.lemma));
  }
  return { exclude, allow };
}

/** Alternatif sınavda kabul edilir mi? Önce istisnalar, sonra yazım farkı kuralı. */
export function isAcceptedAlternative(
  rules: AlternativeRules,
  lemma: string,
  alternative: string,
): boolean {
  const key = pairKey(lemma, alternative);
  if (rules.allow.has(key)) return true;
  if (rules.exclude.has(key)) return false;
  return isSpellingVariant(lemma, alternative);
}

/**
 * Aynı kelimenin farklı yazımı mı? Eş anlamlı kelimeleri eler.
 * Kural: tek kelime, ilk iki harf aynı ve Damerau-Levenshtein mesafesi
 * 3+ harfli kelimelerde en fazla 2 (catalog/catalogue gibi), kısa kelimelerde 1.
 */
export function isSpellingVariant(lemma: string, alternative: string): boolean {
  const a = lemma.trim().toLowerCase();
  const b = alternative.trim().toLowerCase();
  if (a === b || a.length === 0 || b.length === 0) return false;
  if (/\s/.test(a) !== /\s/.test(b)) return false;
  // Çoğul ya da 3. tekil ek (schedule/schedules, box/boxes) yazım farkı değildir.
  if (isSuffixForm(a, b) || isSuffixForm(b, a)) return false;
  if (a.slice(0, 2) !== b.slice(0, 2)) return false;
  const maxDistance = Math.min(a.length, b.length) >= 5 ? 2 : 1;
  return damerauLevenshtein(a, b) <= maxDistance;
}

// ---------------------------------------------------------------------------
// Türkçe anlamlar
// ---------------------------------------------------------------------------

/** Ana türden farklı bir anlamın başına yazılan tür etiketleri: "(fiil) sürmek". */
export const TR_POS_TAGS: Record<Pos, string> = {
  noun: "isim",
  verb: "fiil",
  adjective: "sıfat",
  adverb: "zarf",
  pronoun: "zamir",
  preposition: "edat",
  conjunction: "bağlaç",
  determiner: "belirteç",
  auxiliary: "yardımcı fiil",
  modal: "yardımcı fiil",
  interjection: "ünlem",
  number: "sayı",
};

const TAG_PATTERN = new RegExp(
  `^\\((${[...new Set(Object.values(TR_POS_TAGS))].join("|")})\\)\\s*`,
  "i",
);

/** Anlamın başındaki tür etiketini ayırır: "(fiil) sürmek" → { tag: "fiil", text: "sürmek" }. */
export function splitPosTag(meaning: string): { tag: string | null; text: string } {
  const m = meaning.match(TAG_PATTERN);
  if (!m) return { tag: null, text: meaning.trim() };
  return { tag: m[1].toLocaleLowerCase("tr"), text: meaning.slice(m[0].length).trim() };
}

const stripParens = (s: string) => s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

const isInfinitive = (s: string) => /m[ae]k$/.test(stripParens(s));

/** Modal ve yardımcı fiillerin anlamı mastar ("-ebilmek") ya da ek ("-ecek") olabilir; ikisi de doğal. */
const VERB_LIKE_POS: ReadonlySet<Pos> = new Set(["verb", "modal", "auxiliary"]);

/** Parantez dışındaki kelime sayısı (parantez içi açıklama ve tür etiketi sayılmaz). */
export function meaningWordCount(meaning: string): number {
  const text = stripParens(meaning);
  return text.length === 0 ? 0 : text.split(" ").length;
}

/**
 * İçerik kurallarına uymayan durumları listeler (kaydı engellemez; konsolda gözden geçirmek için):
 * 3 kelimeden uzun anlam, mastar olmayan fiil anlamı, tür etiketi eksik görünen anlam.
 */
export function ruleWarnings(word: Pick<EnrichedWord, "lemma" | "pos" | "tr_meanings">): string[] {
  const out: string[] = [];
  for (const meaning of word.tr_meanings) {
    const { tag, text } = splitPosTag(meaning);
    if (meaningWordCount(text) > 3) out.push(`3 kelimeden uzun: "${meaning}"`);

    if (tag === "fiil" && !isInfinitive(text)) {
      out.push(`(fiil) etiketli ama mastar değil: "${meaning}"`);
    } else if (tag === null && word.pos === "verb" && !isInfinitive(text)) {
      out.push(`fiilin anlamı mastar değil ya da tür etiketi eksik: "${meaning}"`);
    } else if (
      tag === null &&
      word.pos !== "noun" && // "yemek", "ekmek" gibi -mek/-mak ile biten isimler fiil değildir
      !VERB_LIKE_POS.has(word.pos) &&
      isInfinitive(text)
    ) {
      out.push(`fiil gibi görünen anlamda (fiil) etiketi eksik: "${meaning}"`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Temizlik ve eşleştirme
// ---------------------------------------------------------------------------

const trKey = (s: string) => stripParens(splitPosTag(s).text).toLocaleLowerCase("tr");

/**
 * Model çıktısını kurallara göre temizler ve işlev kelimesi bayrağını hesaplar:
 * - Türkçe anlamlarda kopyaları siler (etiket, parantez, büyük/küçük harf fark etmez), sırayı korur.
 * - Alternatiflerde yalnızca yazım farklarını bırakır; "to"yu, lemmayı ve kopyaları atar.
 */
export function sanitizeWord(
  word: AiWord & { rank: number },
  rules: AlternativeRules = NO_ALTERNATIVE_RULES,
): EnrichedWord {
  const seenTr = new Set<string>();
  const tr_meanings = word.tr_meanings
    .map((m) => m.replace(/\s+/g, " ").trim())
    .filter((m) => {
      const key = trKey(m);
      if (key.length === 0 || seenTr.has(key)) return false;
      seenTr.add(key);
      return true;
    });

  const seenEn = new Set<string>();
  const en_alternatives = word.en_alternatives
    .map((a) => a.replace(/^to\s+/i, "").replace(/\s+/g, " ").trim())
    .filter((a) => {
      const key = a.toLowerCase();
      if (seenEn.has(key) || !isAcceptedAlternative(rules, word.lemma, a)) return false;
      seenEn.add(key);
      return true;
    });

  return {
    ...word,
    tr_meanings,
    en_alternatives,
    is_function_word: isFunctionWord(word.lemma, word.pos),
  };
}

/** Modelin döndürdüğü listeyi partideki kelimelerle eşleştirir; fazlalıkları atar, kopyaları tekler. */
export function matchBatch(
  batch: ReadonlyArray<{ lemma: string; rank: number }>,
  output: ReadonlyArray<AiWord>,
  rules: AlternativeRules = NO_ALTERNATIVE_RULES,
): { matched: EnrichedWord[]; missing: string[] } {
  const byLemma = new Map<string, AiWord>();
  for (const w of output) {
    const key = w.lemma.trim().toLowerCase();
    if (!byLemma.has(key)) byLemma.set(key, w);
  }
  const matched: EnrichedWord[] = [];
  const missing: string[] = [];
  for (const { lemma, rank } of batch) {
    const hit = byLemma.get(lemma.toLowerCase());
    if (hit) matched.push(sanitizeWord({ ...hit, lemma, rank }, rules));
    else missing.push(lemma);
  }
  return { matched, missing };
}
