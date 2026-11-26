import { describe, expect, it } from "vitest";
import type { ReviewGrade } from "@/lib/fsrs";
import {
  createReviewSession,
  currentCard,
  isReviewSessionValid,
  isTypedCard,
  type ReviewSessionState,
  reviewReducer,
  shouldSubmit,
} from "./review-session";

const answer = (s: ReviewSessionState, grade: ReviewGrade) => reviewReducer(s, { type: "answer", grade });
const run = (s: ReviewSessionState, ...grades: ReviewGrade[]) => grades.reduce(answer, s);

describe("tekrar oturumu — ana tur", () => {
  it("kartları sırayla gösterir; her cevaptan sonra ön yüze döner", () => {
    let s = createReviewSession([1, 2, 3]);
    expect(currentCard(s)).toBe(1);
    s = reviewReducer(s, { type: "flip" });
    expect(s.flipped).toBe(true);
    s = answer(s, "good");
    expect(currentCard(s)).toBe(2);
    expect(s.flipped).toBe(false);
  });

  it("kart yoksa oturum baştan bitmiştir", () => {
    expect(createReviewSession([]).phase).toBe("done");
  });

  it("hepsi bilinirse ek tur olmadan biter", () => {
    const s = run(createReviewSession([1, 2]), "good", "easy");
    expect(s.phase).toBe("done");
    expect(s.firstGrades).toEqual({ 1: "good", 2: "easy" });
  });

  it("Hard bilinmiş sayılır, ek tura girmez", () => {
    const s = run(createReviewSession([1]), "hard");
    expect(s.phase).toBe("done");
  });
});

describe("tekrar oturumu — 'Bilemedim' ek turları", () => {
  it("Bilemedim denen kartlar ana turdan sonra yeniden gelir", () => {
    const s = run(createReviewSession([1, 2, 3]), "again", "good", "again");
    expect(s.phase).toBe("relearn");
    expect(s.relearn).toEqual([1, 3]);
    expect(currentCard(s)).toBe(1);
  });

  it("'Bildim' denene kadar döngüde kalır", () => {
    let s = run(createReviewSession([1, 2]), "again", "again"); // ek tur: [1, 2]
    s = answer(s, "again"); // 1 sona → [2, 1]
    expect(currentCard(s)).toBe(2);
    s = answer(s, "good"); // 2 çıktı → [1]
    expect(currentCard(s)).toBe(1);
    s = answer(s, "again"); // 1 yine kaldı → [1]
    expect(currentCard(s)).toBe(1);
    s = answer(s, "good");
    expect(s.phase).toBe("done");
  });

  it("ek turlar FSRS'i etkilemez: yalnızca kartın o günkü ilk cevabı kayıtlıdır", () => {
    let s = run(createReviewSession([1, 2]), "again", "good");
    const firstGrades = { ...s.firstGrades };
    expect(firstGrades).toEqual({ 1: "again", 2: "good" });

    // Ek turlarda 1 önce yine Bilemedim, sonra Bildim
    s = run(s, "again", "again", "good");
    expect(s.phase).toBe("done");
    expect(s.firstGrades).toEqual(firstGrades);
  });

  it("FSRS'e gönderim yalnızca ana turdaki ilk cevapta yapılır", () => {
    let s = createReviewSession([1, 2]);
    expect(shouldSubmit(s)).toBe(true);
    s = answer(s, "again");
    expect(shouldSubmit(s)).toBe(true); // kart 2, ilk cevap
    s = answer(s, "good");
    expect(s.phase).toBe("relearn");
    expect(shouldSubmit(s)).toBe(false); // ek tur
  });
});

describe("yeniden açılış", () => {
  it("ana tur boşsa bugünün 'Bilemedim' kartlarıyla ek turdan başlar", () => {
    const s = createReviewSession([], [7, 8]);
    expect(s.phase).toBe("relearn");
    expect(currentCard(s)).toBe(7);
  });

  it("ana turda olan kart ek tur listesine ikinci kez girmez", () => {
    expect(createReviewSession([1, 2], [2, 3]).relearn).toEqual([3]);
  });

  it("kayıtlı oturum: kalan kartlar oturumda ve verileri elde ise geçerli", () => {
    const s = run(createReviewSession([1, 2, 3]), "again");
    const known = new Set([1, 2, 3]);
    expect(isReviewSessionValid(s, [2, 3], known)).toBe(true); // 1 tekrar edildi, sunucu artık göndermiyor
    expect(isReviewSessionValid(s, [2, 3, 9], known)).toBe(false); // yeni kart gelmiş
    expect(isReviewSessionValid(s, [2, 3], new Set([2, 3]))).toBe(false); // 1'in verisi yok
  });
});

describe("yazılı sorular", () => {
  it("ana turda her 5. kart yazılı", () => {
    let s = createReviewSession([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const typed: number[] = [];
    while (s.phase === "main") {
      if (isTypedCard(s, 5)) typed.push(currentCard(s) ?? -1);
      s = answer(s, "good");
    }
    expect(typed).toEqual([5, 10]);
  });

  it("0 ise hiç yazılı soru yok; ek turlar hep kart", () => {
    const s = createReviewSession([1, 2, 3]);
    expect(isTypedCard(s, 0)).toBe(false);
    const relearn = run(createReviewSession([1]), "again");
    expect(isTypedCard(relearn, 1)).toBe(false);
  });
});
