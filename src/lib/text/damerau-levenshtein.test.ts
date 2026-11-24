import { describe, expect, it } from "vitest";
import { damerauLevenshtein } from "./damerau-levenshtein";

describe("damerauLevenshtein", () => {
  it("aynı metinde 0", () => {
    expect(damerauLevenshtein("word", "word")).toBe(0);
  });

  it("boş metinde diğerinin uzunluğu", () => {
    expect(damerauLevenshtein("", "abc")).toBe(3);
    expect(damerauLevenshtein("abc", "")).toBe(3);
  });

  it("ekleme, silme ve değiştirme birer adım", () => {
    expect(damerauLevenshtein("color", "colour")).toBe(1);
    expect(damerauLevenshtein("colour", "color")).toBe(1);
    expect(damerauLevenshtein("gray", "grey")).toBe(1);
  });

  it("yan yana harf yer değişimi tek adım", () => {
    expect(damerauLevenshtein("center", "centre")).toBe(1);
    expect(damerauLevenshtein("recieve", "receive")).toBe(1);
  });

  it("farklı kelimelerde büyük mesafe", () => {
    expect(damerauLevenshtein("say", "tell")).toBe(4);
    expect(damerauLevenshtein("kitten", "sitting")).toBe(3);
  });

  it("Türkçe karakterleri ayrı harf sayar", () => {
    expect(damerauLevenshtein("ışık", "isik")).toBe(3);
  });
});
