import { type AnswerLang, type AnswerResult, checkAnswer, isPassing } from "@/lib/answer-check";
import { shuffled } from "@/lib/study/group-session";

// Yazılı sınav mantığı (SPEC 5.3 grup sınavı, 5.6 cevap kontrolü). Saf fonksiyonlar.

export type QuizDirection = "tr_en" | "en_tr";
export type QuizDirectionSetting = "mixed" | QuizDirection;

/** Sınavda sorulan kelimenin ihtiyaç duyulan alanları. */
export type QuizWord = {
  wordId: number;
  lemma: string;
  pos: string | null;
  tr_meanings: string[];
  en_alternatives: string[];
  custom_tr: string[];
  /** İtirazla kabul edilen İngilizce cevaplar (yalnızca TR→EN sorularında geçerli) */
  accepted_answers_en: string[];
  /** İtirazla kabul edilen Türkçe cevaplar (yalnızca EN→TR sorularında geçerli) */
  accepted_answers_tr: string[];
};

export type QuizItem = { wordId: number; direction: QuizDirection };

/** Kesin sonuç (Aşama 1'de "belirsiz" yok: eşleşmeyen cevap yanlıştır). */
export type QuizResult = Exclude<AnswerResult, "unsure">;

export type QuizAnswer = {
  wordId: number;
  direction: QuizDirection;
  answer: string;
  result: QuizResult;
  /** "Aslında doğruydu" itirazı yapıldı mı */
  appealed: boolean;
};

/**
 * Soruları hazırlar: her kelime bir kez, karışık sırada.
 * Karışık yönde yarısı (tek sayıda yukarı yuvarlanır) TR→EN, kalanı EN→TR.
 */
export function buildQuizItems(
  wordIds: readonly number[],
  setting: QuizDirectionSetting,
  rng: () => number = Math.random,
): QuizItem[] {
  const order = shuffled(wordIds, rng);
  if (setting !== "mixed") return order.map((wordId) => ({ wordId, direction: setting }));
  const trEnCount = Math.ceil(order.length / 2);
  const trEnIds = new Set(shuffled(order, rng).slice(0, trEnCount));
  return order.map((wordId) => ({ wordId, direction: trEnIds.has(wordId) ? "tr_en" : "en_tr" }));
}

export function answerLang(direction: QuizDirection): AnswerLang {
  return direction === "tr_en" ? "en" : "tr";
}

/** Soru yönüne göre kabul edilen cevaplar. İtiraz listeleri yöne göre ayrıdır. */
export function acceptedAnswers(word: QuizWord, direction: QuizDirection): string[] {
  return direction === "tr_en"
    ? [word.lemma, ...word.en_alternatives, ...word.accepted_answers_en]
    : [...word.tr_meanings, ...word.custom_tr, ...word.accepted_answers_tr];
}

/** Yanlış cevapta gösterilecek doğru cevap. */
export function expectedAnswer(word: QuizWord, direction: QuizDirection): string {
  return direction === "tr_en" ? word.lemma : word.tr_meanings.join(", ");
}

/** Cevabı değerlendirir. Aşama 1: yapay zekâ yok, eşleşmeyen cevap yanlış (itiraz edilebilir). */
export function gradeAnswer(word: QuizWord, direction: QuizDirection, answer: string): QuizResult {
  const { result } = checkAnswer(answer, acceptedAnswers(word, direction), answerLang(direction), {
    aiEnabled: false,
  });
  return result === "unsure" ? "wrong" : result;
}

/** İtiraz edilen yanlış cevap doğru sayılır. */
export function finalResult(answer: Pick<QuizAnswer, "result" | "appealed">): QuizResult {
  return answer.result === "wrong" && answer.appealed ? "correct" : answer.result;
}

export function isAnswerPassing(answer: Pick<QuizAnswer, "result" | "appealed">): boolean {
  return isPassing(finalResult(answer));
}

/** İtiraz edilen cevabı yalnızca o yönün kabul listesine ekler. */
export function withAppeal(word: QuizWord, direction: QuizDirection, answer: string): QuizWord {
  const value = answer.trim();
  if (!value) return word;
  if (direction === "tr_en") {
    return word.accepted_answers_en.includes(value)
      ? word
      : { ...word, accepted_answers_en: [...word.accepted_answers_en, value] };
  }
  return word.accepted_answers_tr.includes(value)
    ? word
    : { ...word, accepted_answers_tr: [...word.accepted_answers_tr, value] };
}

export type QuizScore = { correct: number; total: number; percent: number; wrongIds: number[] };

export function scoreQuiz(answers: readonly QuizAnswer[]): QuizScore {
  const correct = answers.filter(isAnswerPassing).length;
  const total = answers.length;
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    wrongIds: answers.filter((a) => !isAnswerPassing(a)).map((a) => a.wordId),
  };
}
