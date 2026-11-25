import { damerauLevenshtein } from "@/lib/text/damerau-levenshtein";

// Cevap kontrol kuralları (SPEC 5.6). Saf fonksiyonlar; istemcide ve sunucuda aynı sonucu verir.

export type AnswerLang = "en" | "tr";
export type AnswerResult = "correct" | "almost" | "wrong" | "unsure";

/** "Neredeyse" için en az harf sayısı (SPEC 5.6: 5 ve daha uzun). */
export const ALMOST_MIN_LETTERS = 5;

const PUNCTUATION = /[\p{P}\p{S}]/gu;

function stripLeading(text: string, words: readonly string[]): string {
  for (const w of words) {
    const prefix = `${w} `;
    if (text.startsWith(prefix) && text.length > prefix.length) return text.slice(prefix.length);
  }
  return text;
}

/**
 * Karşılaştırma için metni normalize eder:
 * - küçük harf (Türkçede toLocaleLowerCase('tr'): I→ı, İ→i)
 * - Türkçede parantez içleri atılır ("yüz (sayı)" → "yüz", "(fiil) sürmek" → "sürmek")
 * - noktalama atılır, boşluklar sadeleşir
 * - İngilizcede baştaki "to" ve "a / an / the", Türkçede baştaki "bir" yok sayılır
 */
export function normalizeAnswer(text: string, lang: AnswerLang): string {
  let s = lang === "tr" ? text.toLocaleLowerCase("tr") : text.toLocaleLowerCase("en");
  if (lang === "tr") s = s.replace(/\([^)]*\)/g, " ");
  s = s.replace(PUNCTUATION, " ").replace(/\s+/g, " ").trim();
  if (lang === "en") {
    s = stripLeading(s, ["to"]);
    s = stripLeading(s, ["a", "an", "the"]);
  } else {
    s = stripLeading(s, ["bir"]);
  }
  return s;
}

const letterCount = (s: string) => s.replace(/\s/g, "").length;

export type CheckResult = {
  result: AnswerResult;
  /** Eşleşen kabul edilen cevap (normalize edilmiş) */
  matched?: string;
};

/**
 * Cevabı kabul edilen cevaplarla karşılaştırır.
 * - correct: normalize edilmiş hâlleri birebir aynı
 * - almost: beklenen cevap 5+ harf ve Damerau-Levenshtein mesafesi 1 (doğru sayılır, yazım uyarısı)
 * - unsure: eşleşme yok ve yapay zekâ açık (sınav sonunda yapay zekâya sorulur)
 * - wrong: eşleşme yok ve yapay zekâ kapalı
 */
export function checkAnswer(
  answer: string,
  accepted: readonly string[],
  lang: AnswerLang,
  options: { aiEnabled: boolean } = { aiEnabled: false },
): CheckResult {
  const given = normalizeAnswer(answer, lang);
  if (given.length === 0) return { result: "wrong" };

  const candidates = [...new Set(accepted.map((a) => normalizeAnswer(a, lang)).filter((a) => a.length > 0))];

  const exact = candidates.find((c) => c === given);
  if (exact) return { result: "correct", matched: exact };

  const close = candidates.find(
    (c) => letterCount(c) >= ALMOST_MIN_LETTERS && damerauLevenshtein(given, c) === 1,
  );
  if (close) return { result: "almost", matched: close };

  return { result: options.aiEnabled ? "unsure" : "wrong" };
}

/** Sınavda doğru sayılan sonuçlar (neredeyse de doğru sayılır). */
export function isPassing(result: AnswerResult): boolean {
  return result === "correct" || result === "almost";
}
