import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema } from "./settings";

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
