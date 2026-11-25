import { describe, expect, it } from "vitest";
import {
  createSession,
  currentWordId,
  type GroupSessionState,
  isSessionValid,
  type SessionAction,
  sessionReducer,
  shuffled,
} from "./group-session";

const noShuffle = { shuffle: false };
const run = (state: GroupSessionState, ...actions: SessionAction[]) =>
  actions.reduce((s, a) => sessionReducer(s, a, noShuffle), state);
const knew = (k: boolean): SessionAction[] => [{ type: "flip" }, { type: "rate", knew: k }];

describe("grup çalışması — kart ve tur", () => {
  it("ilk tur kelimeleri sırayla gösterir, kart ön yüzle başlar", () => {
    const s = createSession([1, 2, 3]);
    expect(currentWordId(s)).toBe(1);
    expect(s.flipped).toBe(false);
    expect(run(s, { type: "flip" }).flipped).toBe(true);
  });

  it("arka yüz görünmeden Bildim/Bilemedim çalışmaz", () => {
    const s = createSession([1, 2, 3]);
    expect(run(s, { type: "rate", knew: true })).toEqual(s);
  });

  it("Bildim denen kelime aktif listeden çıkar ve sonraki turda gelmez", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, ...knew(true), ...knew(false), ...knew(false)); // 1 bildi, 2 ve 3 bilemedi
    expect(s.round).toBe(2);
    expect(s.order).toEqual([2, 3]);
    expect(currentWordId(s)).toBe(2);
  });

  it("Bilemedim denen kelime listede kalır, döngü sonsuzdur", () => {
    let s = createSession([1, 2]);
    for (let i = 0; i < 5; i++) s = run(s, ...knew(false), ...knew(false));
    expect(s.round).toBe(6);
    expect(s.active).toEqual([1, 2]);
    expect(s.phase).toBe("study");
  });

  it("son kelimeden sonra başa döner (ileri okuyla da)", () => {
    let s = createSession([1, 2]);
    s = run(s, { type: "next" }, { type: "next" });
    expect(s.round).toBe(2);
    expect(currentWordId(s)).toBe(1);
  });

  it("geri ok önceki karta gider, ilk kartta yerinde kalır; kart ön yüze döner", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, { type: "next" }, { type: "flip" }, { type: "prev" });
    expect(currentWordId(s)).toBe(1);
    expect(s.flipped).toBe(false);
    s = run(s, { type: "prev" });
    expect(currentWordId(s)).toBe(1);
  });

  it("geri dönülen kelime yeniden değerlendirilebilir (Bildim → Bilemedim)", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, ...knew(true), { type: "prev" }, ...knew(false));
    expect(s.active).toContain(1);
  });
});

describe("grup çalışması — aktif kelime kalmayınca", () => {
  it("hepsi bilinince 'bir daha?' sorusu çıkar", () => {
    const s = run(createSession([1, 2]), ...knew(true), ...knew(true));
    expect(s.phase).toBe("ask");
    expect(currentWordId(s)).toBeNull();
  });

  it("Evet: gruptaki bütün kelimeler yeniden aktif, yeni tur", () => {
    let s = run(createSession([1, 2, 3]), ...knew(true), ...knew(true), ...knew(true));
    s = run(s, { type: "repeat" });
    expect(s.phase).toBe("study");
    expect(s.active).toEqual([1, 2, 3]);
    expect(s.order).toEqual([1, 2, 3]);
    expect(s.round).toBe(2);
  });
});

describe("grup çalışması — karıştırma", () => {
  it("yeni turda sıra karışır (ayar açık)", () => {
    const rng = () => 0; // Fisher-Yates, hep 0 → döndürme
    let s = createSession([1, 2, 3, 4]);
    s = [...knew(false), ...knew(false), ...knew(false), ...knew(false)].reduce(
      (st, a) => sessionReducer(st, a, { shuffle: true, rng }),
      s,
    );
    expect(s.round).toBe(2);
    expect(s.order).toEqual(shuffled([1, 2, 3, 4], rng));
    expect(s.order).not.toEqual([1, 2, 3, 4]);
  });

  it("ayar kapalıyken grup sırası korunur", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, ...knew(false), ...knew(false), ...knew(false));
    expect(s.order).toEqual([1, 2, 3]);
  });
});

describe("grup çalışması — 'Bunu zaten biliyorum'", () => {
  it("kelimeyi aynı konumda yenisiyle değiştirir; yeni kelime aktif olur", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, { type: "next" }, { type: "replace", oldId: 2, newId: 9 });
    expect(s.wordIds).toEqual([1, 9, 3]);
    expect(currentWordId(s)).toBe(9);
    expect(s.active).toContain(9);
    expect(s.active).not.toContain(2);
  });

  it("yedek yoksa kelime çıkar ve sıradaki karta geçilir", () => {
    let s = createSession([1, 2, 3]);
    s = run(s, { type: "next" }, { type: "replace", oldId: 2, newId: null });
    expect(s.wordIds).toEqual([1, 3]);
    expect(currentWordId(s)).toBe(3);
  });

  it("son kelime çıkarılırsa yeni tura geçilir", () => {
    let s = createSession([1, 2]);
    s = run(s, { type: "next" }, { type: "replace", oldId: 2, newId: null });
    expect(s.round).toBe(2);
    expect(currentWordId(s)).toBe(1);
  });
});

describe("isSessionValid", () => {
  it("aynı grup için kayıtlı oturumu kabul eder, farklı grubu reddeder", () => {
    const s = run(createSession([1, 2, 3]), ...knew(true));
    expect(isSessionValid(s, [1, 2, 3])).toBe(true);
    expect(isSessionValid(s, [1, 2, 4])).toBe(false);
    expect(isSessionValid(s, [1, 2])).toBe(false);
  });
});
