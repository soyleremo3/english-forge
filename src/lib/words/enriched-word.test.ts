import { describe, expect, it } from "vitest";
import {
  type AiWord,
  buildAlternativeRules,
  isAcceptedAlternative,
  isFunctionWord,
  isSpellingVariant,
  matchBatch,
  meaningWordCount,
  ruleWarnings,
  sanitizeWord,
  splitPosTag,
} from "./enriched-word";

const word = (lemma: string, extra: Partial<AiWord> = {}): AiWord => ({
  lemma,
  pos: "verb",
  tr_meanings: ["gitmek"],
  en_alternatives: [],
  en_definition: "to move somewhere",
  example_en: "I go to school every day.",
  example_tr: "Her gün okula giderim.",
  cefr: "A1",
  ...extra,
});

describe("matchBatch", () => {
  it("partideki kelimeleri büyük/küçük harf fark etmeden eşler ve sırayı korur", () => {
    const { matched, missing } = matchBatch(
      [
        { lemma: "go", rank: 10 },
        { lemma: "make", rank: 11 },
      ],
      [word("Make"), word("go")],
    );
    expect(matched.map((w) => [w.lemma, w.rank])).toEqual([
      ["go", 10],
      ["make", 11],
    ]);
    expect(missing).toEqual([]);
  });

  it("eksik kelimeleri bildirir, fazlalık ve kopyaları atar", () => {
    const { matched, missing } = matchBatch(
      [
        { lemma: "go", rank: 1 },
        { lemma: "take", rank: 2 },
      ],
      [word("go"), word("go"), word("extra")],
    );
    expect(matched).toHaveLength(1);
    expect(missing).toEqual(["take"]);
  });
});

describe("isFunctionWord", () => {
  it("ana anlamın türüne göre işaretler", () => {
    expect(isFunctionWord("the", "determiner")).toBe(true);
    expect(isFunctionWord("she", "pronoun")).toBe(true);
    expect(isFunctionWord("of", "preposition")).toBe(true);
    expect(isFunctionWord("and", "conjunction")).toBe(true);
    expect(isFunctionWord("will", "modal")).toBe(true);
    expect(isFunctionWord("be", "auxiliary")).toBe(true);
    expect(isFunctionWord("not", "adverb")).toBe(true);
  });

  it("ana anlamı içerik kelimesi olanları işaretlemez", () => {
    expect(isFunctionWord("have", "verb")).toBe(false);
    expect(isFunctionWord("do", "verb")).toBe(false);
    expect(isFunctionWord("time", "noun")).toBe(false);
    expect(isFunctionWord("there", "adverb")).toBe(false);
  });
});

describe("isSpellingVariant", () => {
  it("İngiliz/Amerikan yazım farklarını kabul eder", () => {
    expect(isSpellingVariant("color", "colour")).toBe(true);
    expect(isSpellingVariant("center", "centre")).toBe(true);
    expect(isSpellingVariant("gray", "grey")).toBe(true);
    expect(isSpellingVariant("realize", "realise")).toBe(true);
    expect(isSpellingVariant("catalog", "catalogue")).toBe(true);
    expect(isSpellingVariant("traveled", "travelled")).toBe(true);
  });

  it("eş anlamlıları ve aynı kelimeyi reddeder", () => {
    expect(isSpellingVariant("say", "tell")).toBe(false);
    expect(isSpellingVariant("run", "jog")).toBe(false);
    expect(isSpellingVariant("right", "correct")).toBe(false);
    expect(isSpellingVariant("get", "receive")).toBe(false);
    expect(isSpellingVariant("affect", "effect")).toBe(false);
    expect(isSpellingVariant("color", "Color")).toBe(false);
  });

  it("-s / -es eki almış biçimleri reddeder", () => {
    expect(isSpellingVariant("schedule", "schedules")).toBe(false);
    expect(isSpellingVariant("box", "boxes")).toBe(false);
    expect(isSpellingVariant("schedules", "schedule")).toBe(false);
  });
});

describe("istisna listesi", () => {
  const rules = buildAlternativeRules([
    { lemma: "story", alternative: "storey", kind: "exclude", reason: "kat" },
    { lemma: "toward", alternative: "towards", kind: "allow", reason: "US/UK" },
  ]);

  it("exclude çiftini iki yönde de reddeder", () => {
    expect(isAcceptedAlternative(rules, "story", "storey")).toBe(false);
    expect(isAcceptedAlternative(rules, "Storey", "story")).toBe(false);
  });

  it("allow çiftini -s kuralına rağmen kabul eder", () => {
    expect(isSpellingVariant("toward", "towards")).toBe(false);
    expect(isAcceptedAlternative(rules, "toward", "towards")).toBe(true);
  });

  it("listede olmayanlarda yazım farkı kuralını uygular", () => {
    expect(isAcceptedAlternative(rules, "color", "colour")).toBe(true);
    expect(isAcceptedAlternative(rules, "schedule", "schedules")).toBe(false);
  });

  it("sanitizeWord istisnalara göre süzer", () => {
    const story = sanitizeWord(
      { ...word("story", { pos: "noun", en_alternatives: ["storey"] }), rank: 1 },
      rules,
    );
    expect(story.en_alternatives).toEqual([]);
    const toward = sanitizeWord(
      { ...word("toward", { pos: "preposition", en_alternatives: ["towards"] }), rank: 2 },
      rules,
    );
    expect(toward.en_alternatives).toEqual(["towards"]);
  });
});

describe("sanitizeWord", () => {
  it("tekrarlanan Türkçe anlamları siler (etiket, parantez, harf büyüklüğü fark etmez)", () => {
    const w = sanitizeWord({
      ...word("get", { tr_meanings: ["almak", "elde etmek", "Almak (ulaşmak)"] }),
      rank: 1,
    });
    expect(w.tr_meanings).toEqual(["almak", "elde etmek"]);
  });

  it("Türkçe İ/ı harflerini doğru karşılaştırır", () => {
    const w = sanitizeWord({ ...word("x", { tr_meanings: ["İyi", "iyi", "ılık"] }), rank: 1 });
    expect(w.tr_meanings).toEqual(["İyi", "ılık"]);
  });

  it("alternatiflerde yalnızca yazım farklarını bırakır", () => {
    const w = sanitizeWord({
      ...word("color", { pos: "noun", en_alternatives: ["hue", "colour", "Colour", "shade"] }),
      rank: 1,
    });
    expect(w.en_alternatives).toEqual(["colour"]);
  });

  it("işlev kelimesi bayrağını türden hesaplar", () => {
    expect(sanitizeWord({ ...word("of", { pos: "preposition" }), rank: 4 }).is_function_word).toBe(true);
    expect(sanitizeWord({ ...word("have", { pos: "verb" }), rank: 8 }).is_function_word).toBe(false);
  });
});

describe("splitPosTag", () => {
  it("baştaki tür etiketini ayırır", () => {
    expect(splitPosTag("(fiil) sürmek")).toEqual({ tag: "fiil", text: "sürmek" });
    expect(splitPosTag("(sıfat) cimri")).toEqual({ tag: "sıfat", text: "cimri" });
    expect(splitPosTag("yüz (sayı)")).toEqual({ tag: null, text: "yüz (sayı)" });
  });
});

describe("meaningWordCount", () => {
  it("parantez içini ve tür etiketini saymaz", () => {
    expect(meaningWordCount("yüz (sayı olarak)")).toBe(1);
    expect(meaningWordCount("elde etmek")).toBe(2);
    expect(meaningWordCount("(fiil) anlamına gelmek")).toBe(2);
  });
});

describe("ruleWarnings", () => {
  it("doğru etiketlenmiş kelimede uyarı vermez", () => {
    expect(ruleWarnings({ lemma: "last", pos: "adjective", tr_meanings: ["son", "(fiil) sürmek"] })).toEqual([]);
    expect(
      ruleWarnings({ lemma: "mean", pos: "verb", tr_meanings: ["anlamına gelmek", "kastetmek", "(sıfat) cimri"] }),
    ).toEqual([]);
  });

  it("-mek/-mak ile biten isim anlamlarına (yemek) uyarı vermez", () => {
    expect(ruleWarnings({ lemma: "food", pos: "noun", tr_meanings: ["yiyecek", "yemek"] })).toEqual([]);
    expect(ruleWarnings({ lemma: "bread", pos: "noun", tr_meanings: ["ekmek"] })).toEqual([]);
  });

  it("isim anlamı etiketsiz fiili hâlâ yakalar", () => {
    expect(ruleWarnings({ lemma: "cook", pos: "verb", tr_meanings: ["pişirmek", "aşçı"] })).toHaveLength(1);
  });

  it("modal ve yardımcı fiillerde mastar ya da ek anlamına uyarı vermez", () => {
    expect(ruleWarnings({ lemma: "can", pos: "modal", tr_meanings: ["-ebilmek"] })).toEqual([]);
    expect(ruleWarnings({ lemma: "will", pos: "modal", tr_meanings: ["-ecek"] })).toEqual([]);
  });

  it("etiketsiz farklı tür anlamlarını yakalar", () => {
    expect(ruleWarnings({ lemma: "last", pos: "adjective", tr_meanings: ["son", "sürmek"] })).toHaveLength(1);
    expect(ruleWarnings({ lemma: "mean", pos: "verb", tr_meanings: ["anlamına gelmek", "cimri"] })).toHaveLength(1);
  });

  it("uzun anlamı ve mastar olmayan (fiil) etiketini yakalar", () => {
    expect(ruleWarnings({ lemma: "x", pos: "noun", tr_meanings: ["çok uzun bir açıklama"] })).toHaveLength(1);
    expect(ruleWarnings({ lemma: "x", pos: "noun", tr_meanings: ["şey", "(fiil) koşu"] })).toHaveLength(1);
  });
});
