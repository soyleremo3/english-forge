import { describe, expect, it } from "vitest";
import { checkAnswer, isPassing, normalizeAnswer } from "./answer-check";

describe("normalizeAnswer — Türkçe", () => {
  it("I/İ/ı/i harflerini Türkçe kurala göre küçültür", () => {
    expect(normalizeAnswer("IŞIK", "tr")).toBe("ışık");
    expect(normalizeAnswer("İYİ", "tr")).toBe("iyi");
    expect(normalizeAnswer("Irmak", "tr")).toBe("ırmak");
    expect(normalizeAnswer("İstanbul", "tr")).toBe("istanbul");
  });

  it("parantez içini ve tür etiketini yok sayar", () => {
    expect(normalizeAnswer("yüz (sayı)", "tr")).toBe("yüz");
    expect(normalizeAnswer("(fiil) sürmek", "tr")).toBe("sürmek");
  });

  it("baştaki 'bir'i yok sayar ama tek başına 'bir'i korur", () => {
    expect(normalizeAnswer("bir kitap", "tr")).toBe("kitap");
    expect(normalizeAnswer("Bir", "tr")).toBe("bir");
  });

  it("noktalama ve fazla boşlukları temizler", () => {
    expect(normalizeAnswer("  gitmek!!  ", "tr")).toBe("gitmek");
    expect(normalizeAnswer("elde   etmek.", "tr")).toBe("elde etmek");
  });
});

describe("normalizeAnswer — İngilizce", () => {
  it("fiillerde baştaki 'to'yu yok sayar", () => {
    expect(normalizeAnswer("to go", "en")).toBe("go");
    expect(normalizeAnswer("To Run", "en")).toBe("run");
  });

  it("baştaki a / an / the'yi yok sayar", () => {
    expect(normalizeAnswer("a book", "en")).toBe("book");
    expect(normalizeAnswer("an apple", "en")).toBe("apple");
    expect(normalizeAnswer("The house", "en")).toBe("house");
  });

  it("kelimenin kendisi 'to' ya da 'the' ise silmez", () => {
    expect(normalizeAnswer("to", "en")).toBe("to");
    expect(normalizeAnswer("the", "en")).toBe("the");
  });

  it("İngilizcede I'yı Türkçe kurala göre küçültmez", () => {
    expect(normalizeAnswer("IDEA", "en")).toBe("idea");
  });
});

describe("checkAnswer", () => {
  const off = { aiEnabled: false };
  const on = { aiEnabled: true };

  it("birebir eşleşme doğru", () => {
    expect(checkAnswer("gitmek", ["gitmek"], "tr", off).result).toBe("correct");
    expect(checkAnswer("to go", ["go"], "en", off).result).toBe("correct");
  });

  it("Türkçe büyük harfli cevap doğru (İ/ı sorunu yok)", () => {
    expect(checkAnswer("IŞIK", ["ışık"], "tr", off).result).toBe("correct");
    expect(checkAnswer("İYİ", ["iyi"], "tr", off).result).toBe("correct");
    // Türkçe kurala göre "I" → "ı"; "ilk" ile eşleşmez
    expect(checkAnswer("ILK", ["ilk"], "tr", off).result).toBe("wrong");
  });

  it("alternatif cevaplardan biri tutarsa doğru", () => {
    expect(checkAnswer("colour", ["color", "colour"], "en", off).result).toBe("correct");
    expect(checkAnswer("vakit", ["zaman", "vakit"], "tr", off).result).toBe("correct");
  });

  it("parantezli beklenen cevap, parantezsiz yazınca doğru", () => {
    expect(checkAnswer("sağ", ["doğru", "sağ (yön)"], "tr", off).result).toBe("correct");
  });

  it("5 harfli kelimede 1 harf hata neredeyse", () => {
    expect(checkAnswer("hause", ["house"], "en", off)).toEqual({ result: "almost", matched: "house" });
    expect(checkAnswer("recieve", ["receive"], "en", off).result).toBe("almost");
  });

  it("4 harfli kelimede 1 harf hata yanlış (tam eşleşme gerekir)", () => {
    expect(checkAnswer("bok", ["book"], "en", off).result).toBe("wrong");
    expect(checkAnswer("gtmek", ["gitmek"], "tr", off).result).toBe("almost");
    expect(checkAnswer("yzü", ["yüz"], "tr", off).result).toBe("wrong");
  });

  it("2 harf hata yanlış", () => {
    expect(checkAnswer("hosue2", ["house"], "en", off).result).toBe("wrong");
  });

  it("boş cevap yanlış", () => {
    expect(checkAnswer("   ", ["go"], "en", on).result).toBe("wrong");
  });

  it("eşleşme yoksa yapay zekâ açıkken belirsiz, kapalıyken yanlış", () => {
    expect(checkAnswer("tell", ["say"], "en", on).result).toBe("unsure");
    expect(checkAnswer("tell", ["say"], "en", off).result).toBe("wrong");
  });

  it("isPassing: doğru ve neredeyse geçer", () => {
    expect(isPassing("correct")).toBe(true);
    expect(isPassing("almost")).toBe(true);
    expect(isPassing("wrong")).toBe(false);
    expect(isPassing("unsure")).toBe(false);
  });
});
