import { describe, expect, it } from "vitest";
import {
  acceptedAnswers,
  buildQuizItems,
  expectedAnswer,
  finalResult,
  gradeAnswer,
  type QuizAnswer,
  type QuizWord,
  scoreQuiz,
  withAppeal,
} from "./quiz";

const word = (extra: Partial<QuizWord> = {}): QuizWord => ({
  wordId: 1,
  lemma: "go",
  pos: "verb",
  tr_meanings: ["gitmek", "(isim) sıra"],
  en_alternatives: [],
  custom_tr: [],
  accepted_answers_en: [],
  accepted_answers_tr: [],
  ...extra,
});

describe("buildQuizItems", () => {
  const ids = [1, 2, 3, 4, 5, 6, 7, 8];

  it("her kelime bir kez sorulur", () => {
    const items = buildQuizItems(ids, "mixed");
    expect(items.map((i) => i.wordId).sort((a, b) => a - b)).toEqual(ids);
  });

  it("karışık: yarısı TR→EN, yarısı EN→TR", () => {
    const items = buildQuizItems(ids, "mixed");
    expect(items.filter((i) => i.direction === "tr_en")).toHaveLength(4);
    expect(items.filter((i) => i.direction === "en_tr")).toHaveLength(4);
  });

  it("tek sayıda kelimede TR→EN bir fazla (yukarı yuvarlanır)", () => {
    const items = buildQuizItems([1, 2, 3, 4, 5], "mixed");
    expect(items.filter((i) => i.direction === "tr_en")).toHaveLength(3);
  });

  it("yalnızca TR→EN ya da yalnızca EN→TR ayarı", () => {
    expect(buildQuizItems(ids, "tr_en").every((i) => i.direction === "tr_en")).toBe(true);
    expect(buildQuizItems(ids, "en_tr").every((i) => i.direction === "en_tr")).toBe(true);
  });
});

describe("acceptedAnswers ve gradeAnswer", () => {
  it("TR→EN: lemma, yazım alternatifleri ve İngilizce itirazlar", () => {
    const w = word({ lemma: "color", en_alternatives: ["colour"], accepted_answers_en: ["hue"] });
    expect(acceptedAnswers(w, "tr_en")).toEqual(["color", "colour", "hue"]);
    expect(gradeAnswer(w, "tr_en", "colour")).toBe("correct");
    expect(gradeAnswer(w, "tr_en", "hue")).toBe("correct");
  });

  it("EN→TR: Türkçe anlamlar (etiket/parantez yok sayılır) ve Türkçe itirazlar", () => {
    const w = word({ accepted_answers_tr: ["yürümek"] });
    expect(gradeAnswer(w, "en_tr", "Gitmek")).toBe("correct");
    expect(gradeAnswer(w, "en_tr", "sıra")).toBe("correct");
    expect(gradeAnswer(w, "en_tr", "yürümek")).toBe("correct");
  });

  it("TR→EN sorusunda fiilin başındaki 'to' kabul edilir", () => {
    expect(gradeAnswer(word(), "tr_en", "to go")).toBe("correct");
  });

  it("eşleşme yoksa yanlış (Aşama 1'de belirsiz yok)", () => {
    expect(gradeAnswer(word(), "tr_en", "walk")).toBe("wrong");
  });

  it("yanlışta gösterilecek doğru cevap yöne göre", () => {
    expect(expectedAnswer(word(), "tr_en")).toBe("go");
    expect(expectedAnswer(word(), "en_tr")).toBe("gitmek, (isim) sıra");
  });
});

describe("itiraz ('Aslında doğruydu')", () => {
  it("itiraz edilen yanlış cevap doğru sayılır", () => {
    expect(finalResult({ result: "wrong", appealed: true })).toBe("correct");
    expect(finalResult({ result: "wrong", appealed: false })).toBe("wrong");
  });

  it("Türkçe itiraz yalnızca EN→TR listesine girer; TR→EN sorusunda o Türkçe cevap YANLIŞ sayılır", () => {
    let w = word({ lemma: "go", tr_meanings: ["gitmek"] });
    expect(gradeAnswer(w, "en_tr", "yola çıkmak")).toBe("wrong");

    w = withAppeal(w, "en_tr", "yola çıkmak");
    expect(w.accepted_answers_tr).toEqual(["yola çıkmak"]);
    expect(w.accepted_answers_en).toEqual([]);

    // Artık EN→TR sorusunda doğru...
    expect(gradeAnswer(w, "en_tr", "yola çıkmak")).toBe("correct");
    // ...ama TR→EN sorusunda aynı Türkçe cevap yanlış.
    expect(gradeAnswer(w, "tr_en", "yola çıkmak")).toBe("wrong");
  });

  it("İngilizce itiraz yalnızca TR→EN listesine girer", () => {
    const w = withAppeal(word(), "tr_en", "leave");
    expect(w.accepted_answers_en).toEqual(["leave"]);
    expect(gradeAnswer(w, "tr_en", "leave")).toBe("correct");
    expect(gradeAnswer(w, "en_tr", "leave")).toBe("wrong");
  });

  it("aynı itirazı iki kez eklemez", () => {
    const w = withAppeal(withAppeal(word(), "tr_en", "leave"), "tr_en", "leave");
    expect(w.accepted_answers_en).toEqual(["leave"]);
  });
});

describe("scoreQuiz", () => {
  const a = (wordId: number, result: QuizAnswer["result"], appealed = false): QuizAnswer => ({
    wordId,
    direction: "tr_en",
    answer: "x",
    result,
    appealed,
  });

  it("neredeyse ve itiraz edilen doğru sayılır; yanlışlar listelenir", () => {
    const score = scoreQuiz([a(1, "correct"), a(2, "almost"), a(3, "wrong"), a(4, "wrong", true)]);
    expect(score).toEqual({ correct: 3, total: 4, percent: 75, wrongIds: [3] });
  });

  it("boş sınavda yüzde 0", () => {
    expect(scoreQuiz([]).percent).toBe(0);
  });
});
