import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettingsForm, resolveSettings, settingsSchema } from "./settings";

describe("DEFAULT_SETTINGS", () => {
  it("şemaya uyar", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("SPEC varsayılanlarını taşır", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      daily_new: 8,
      group_size: 8,
      quiz_direction: "mixed",
      min_sentences: 3,
      desired_retention: 0.9,
      review_cap: 150,
      ielts_target_date: "2028-04-15",
    });
    expect(DEFAULT_SETTINGS.required_tasks).toEqual([
      "review",
      "new_words",
      "daily_test",
      "sentences",
    ]);
  });
});

describe("resolveSettings", () => {
  it("eksik ve bozuk alanlarda varsayılanı kullanır", () => {
    const s = resolveSettings({ daily_new: 12, group_size: 99, cefr: "B1" });
    expect(s.daily_new).toBe(12);
    expect(s.group_size).toBe(8);
    expect(s.cefr).toBe("B1");
    expect(s.review_cap).toBe(150);
  });

  it("nesne değilse bütün varsayılanları döner", () => {
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe("parseSettingsForm", () => {
  function form(overrides: Record<string, string | string[] | null> = {}) {
    const values: Record<string, string | string[] | null> = {
      daily_new: "12",
      group_size: "8",
      shuffle_rounds: null,
      quiz_direction: "tr_en",
      required_tasks: ["review", "new_words"],
      min_sentences: "4",
      desired_retention: "0.85",
      review_cap: "200",
      review_buttons: "four",
      typed_review_every: "4",
      tts_accent: "en-GB",
      ai_enabled: "on",
      journal_ai: null,
      ielts_target_date: "2028-05-01",
      cefr: "B1",
      ...overrides,
    };
    const fd = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (v === null) continue;
      for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
    }
    return fd;
  }

  it("geçerli formu tiplere çevirir", () => {
    const res = parseSettingsForm(form());
    expect(res).toEqual({
      ok: true,
      settings: {
        daily_new: 12,
        group_size: 8,
        shuffle_rounds: false,
        quiz_direction: "tr_en",
        required_tasks: ["review", "new_words"],
        min_sentences: 4,
        desired_retention: 0.85,
        review_cap: 200,
        review_buttons: "four",
        typed_review_every: 4,
        tts_accent: "en-GB",
        ai_enabled: true,
        journal_ai: false,
        ielts_target_date: "2028-05-01",
        cefr: "B1",
      },
    });
  });

  it("sınır dışı değerleri alan bazında reddeder", () => {
    const res = parseSettingsForm(form({ daily_new: "30", group_size: "5", required_tasks: [] }));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(Object.keys(res.errors).sort()).toEqual(["daily_new", "group_size", "required_tasks"]);
    }
  });

  it("geçersiz tarih ve seçenekleri reddeder", () => {
    const res = parseSettingsForm(form({ ielts_target_date: "2028-13-40", cefr: "Z9" }));
    expect(res.ok).toBe(false);
  });
});
