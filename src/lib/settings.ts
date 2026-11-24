import { z } from "zod";

// profiles.settings (SPEC bölüm 11). Varsayılanlar SPEC 4, 5 ve 6'dan.
export const taskKeys = ["review", "new_words", "daily_test", "sentences"] as const;

export const settingsSchema = z.object({
  daily_new: z.number().int().min(4).max(24),
  group_size: z.number().int().min(6).max(10),
  quiz_direction: z.enum(["mixed", "tr_en", "en_tr"]),
  required_tasks: z.array(z.enum(taskKeys)),
  min_sentences: z.number().int().min(3).max(8),
  desired_retention: z.number().min(0.7).max(0.99),
  review_cap: z.number().int().min(10).max(1000),
  tts_accent: z.enum(["en-US", "en-GB"]),
  ai_enabled: z.boolean(),
  journal_ai: z.boolean(),
  ielts_target_date: z.iso.date(),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  daily_new: 8,
  group_size: 8,
  quiz_direction: "mixed",
  required_tasks: [...taskKeys],
  min_sentences: 3,
  desired_retention: 0.9,
  review_cap: 150,
  tts_accent: "en-US",
  ai_enabled: false,
  journal_ai: true,
  ielts_target_date: "2028-04-15",
  cefr: "A2",
};
