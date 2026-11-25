import { z } from "zod";

// profiles.settings (SPEC bölüm 11). Varsayılanlar SPEC 4, 5 ve 6'dan.
export const taskKeys = ["review", "new_words", "daily_test", "sentences"] as const;
export type TaskKey = (typeof taskKeys)[number];

export const QUIZ_DIRECTIONS = ["mixed", "tr_en", "en_tr"] as const;
export const TTS_ACCENTS = ["en-US", "en-GB"] as const;
export const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const SETTINGS_LIMITS = {
  daily_new: { min: 4, max: 24 },
  group_size: { min: 6, max: 10 },
  min_sentences: { min: 3, max: 8 },
  desired_retention: { min: 0.7, max: 0.99 },
  review_cap: { min: 10, max: 1000 },
} as const;

const L = SETTINGS_LIMITS;

export const settingsSchema = z.object({
  daily_new: z.number().int().min(L.daily_new.min).max(L.daily_new.max),
  group_size: z.number().int().min(L.group_size.min).max(L.group_size.max),
  quiz_direction: z.enum(QUIZ_DIRECTIONS),
  required_tasks: z.array(z.enum(taskKeys)).min(1),
  min_sentences: z.number().int().min(L.min_sentences.min).max(L.min_sentences.max),
  desired_retention: z.number().min(L.desired_retention.min).max(L.desired_retention.max),
  review_cap: z.number().int().min(L.review_cap.min).max(L.review_cap.max),
  tts_accent: z.enum(TTS_ACCENTS),
  ai_enabled: z.boolean(),
  journal_ai: z.boolean(),
  ielts_target_date: z.iso.date(),
  cefr: z.enum(CEFR_OPTIONS),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof Settings;

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

/**
 * Veritabanındaki ayarları okur: geçerli alanları alır, eksik ya da bozuk alanlarda varsayılanı kullanır.
 * Böylece yeni bir ayar eklendiğinde eski profiller bozulmaz.
 */
export function resolveSettings(raw: unknown): Settings {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(settingsSchema.shape) as SettingsKey[]) {
    const field = settingsSchema.shape[key].safeParse(source[key]);
    result[key] = field.success ? field.data : DEFAULT_SETTINGS[key];
  }
  return settingsSchema.parse(result);
}

/** HTML formundan gelen değerleri (hepsi metin) ayar şemasına uygun tiplere çevirip doğrular. */
export const settingsFormSchema = z.object({
  daily_new: z.coerce.number(),
  group_size: z.coerce.number(),
  quiz_direction: z.string(),
  required_tasks: z.array(z.string()),
  min_sentences: z.coerce.number(),
  desired_retention: z.coerce.number(),
  review_cap: z.coerce.number(),
  tts_accent: z.string(),
  ai_enabled: z.boolean(),
  journal_ai: z.boolean(),
  ielts_target_date: z.string(),
  cefr: z.string(),
}).pipe(settingsSchema);

export type SettingsFieldErrors = Partial<Record<SettingsKey, string[]>>;

export function parseSettingsForm(
  formData: FormData,
): { ok: true; settings: Settings } | { ok: false; errors: SettingsFieldErrors } {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const parsed = settingsFormSchema.safeParse({
    daily_new: text("daily_new"),
    group_size: text("group_size"),
    quiz_direction: text("quiz_direction"),
    required_tasks: formData.getAll("required_tasks").map(String),
    min_sentences: text("min_sentences"),
    desired_retention: text("desired_retention"),
    review_cap: text("review_cap"),
    tts_accent: text("tts_accent"),
    ai_enabled: formData.get("ai_enabled") === "on",
    journal_ai: formData.get("journal_ai") === "on",
    ielts_target_date: text("ielts_target_date"),
    cefr: text("cefr"),
  });
  if (parsed.success) return { ok: true, settings: parsed.data };
  return { ok: false, errors: z.flattenError(parsed.error).fieldErrors as SettingsFieldErrors };
}
