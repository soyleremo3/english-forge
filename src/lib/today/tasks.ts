import { z } from "zod";
import { type Settings, type TaskKey, taskKeys } from "@/lib/settings";
import { newWordsPlanSchema } from "@/lib/study/new-words-plan";

// Bugün ekranının görev modeli (SPEC 4). study_days.tasks jsonb'sinin biçimi ve
// görev durumlarının hesaplanması burada; veritabanına dokunmaz (saf fonksiyonlar).

export const taskProgressSchema = z.object({
  done: z.boolean().default(false),
  count: z.number().int().min(0).default(0),
});

export type TaskProgress = z.infer<typeof taskProgressSchema>;

/** Yeni kelimeler görevi ayrıca günün sabit kelime planını taşır (SPEC 5.3). */
export const newWordsProgressSchema = taskProgressSchema.extend({
  plan: newWordsPlanSchema.optional(),
});

export type NewWordsProgress = z.infer<typeof newWordsProgressSchema>;

/** Günlük test ayrıca gün içinde sabit kalan soru listesini ve puanı taşır (SPEC 5.4). */
export const dailyTestProgressSchema = taskProgressSchema.extend({
  wordIds: z.array(z.number().int().positive()).optional(),
  score: z.number().min(0).max(100).optional(),
});

export type DailyTestProgress = z.infer<typeof dailyTestProgressSchema>;

export const storedTasksSchema = z.object({
  review: taskProgressSchema.optional(),
  new_words: newWordsProgressSchema.optional(),
  daily_test: dailyTestProgressSchema.optional(),
  sentences: taskProgressSchema.optional(),
});

export type StoredTasks = z.infer<typeof storedTasksSchema>;

/** study_days.tasks jsonb'sini güvenle okur; bozuk alanları yok sayar. */
export function parseTasks(raw: unknown): StoredTasks {
  const parsed = storedTasksSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function updateTaskProgress(
  tasks: StoredTasks,
  key: TaskKey,
  patch: Partial<TaskProgress>,
): StoredTasks {
  const current = tasks[key] ?? { done: false, count: 0 };
  return { ...tasks, [key]: { ...current, ...patch } };
}

export type TaskStatus = "done" | "in_progress" | "pending" | "locked";

export type TaskView = {
  key: TaskKey;
  status: TaskStatus;
  /** Yapılan miktar (tekrar edilen kart, öğrenilen kelime, yazılan cümle) */
  count: number;
  /** Hedef miktar; sayaç anlamsızsa null (günlük test) */
  total: number | null;
  /** Kendiliğinden tamamlandı (ör. vadesi gelen kart yok) */
  auto: boolean;
  href: string;
};

export const TASK_HREFS: Record<TaskKey, string> = {
  review: "/study/review",
  new_words: "/study/new",
  daily_test: "/study/daily-test",
  sentences: "/sentences",
};

export type TaskContext = {
  /** Şu an vadesi gelmiş tekrar kartı sayısı */
  dueCount: number;
  settings: Pick<Settings, "daily_new" | "min_sentences" | "review_cap">;
};

function statusOf(done: boolean, count: number): TaskStatus {
  if (done) return "done";
  return count > 0 ? "in_progress" : "pending";
}

export function buildTaskViews(tasks: StoredTasks, ctx: TaskContext): TaskView[] {
  const review = tasks.review ?? { done: false, count: 0 };
  const newWords: NewWordsProgress = tasks.new_words ?? { done: false, count: 0 };
  const dailyTest = tasks.daily_test ?? { done: false, count: 0 };
  const sentences = tasks.sentences ?? { done: false, count: 0 };

  // Tekrar: kart yoksa kendiliğinden tamam. Hedef, kalan kartlar + bugün yapılanlar (üst sınırlı).
  const reviewTotal = Math.min(ctx.dueCount + review.count, ctx.settings.review_cap);
  // Kendiliğinden tamam: bugün hiç kart yoktu (çalışılıp bitirilen gün "Tamamlandı" görünür).
  const reviewAuto = !review.done && ctx.dueCount === 0 && review.count === 0;
  const reviewDone = review.done || ctx.dueCount === 0;

  // Günlük test yalnızca yeni kelimeler bitince açılır.
  const dailyLocked = !dailyTest.done && !newWords.done;

  const sentencesDone = sentences.done || sentences.count >= ctx.settings.min_sentences;

  return [
    {
      key: "review",
      status: statusOf(reviewDone, review.count),
      count: review.count,
      total: reviewTotal,
      auto: reviewAuto,
      href: TASK_HREFS.review,
    },
    {
      key: "new_words",
      status: statusOf(newWords.done, newWords.count),
      count: newWords.count,
      // Plan varsa günün sabit kelime sayısı, yoksa ayardaki günlük sayı.
      total: newWords.plan ? newWords.plan.groups.flat().length : ctx.settings.daily_new,
      auto: false,
      href: TASK_HREFS.new_words,
    },
    {
      key: "daily_test",
      status: dailyLocked ? "locked" : statusOf(dailyTest.done, dailyTest.count),
      count: dailyTest.count,
      total: null,
      auto: false,
      href: TASK_HREFS.daily_test,
    },
    {
      key: "sentences",
      status: statusOf(sentencesDone, sentences.count),
      count: sentences.count,
      total: ctx.settings.min_sentences,
      auto: false,
      href: TASK_HREFS.sentences,
    },
  ];
}

export type DayProgress = { done: number; total: number; complete: boolean };

/** Zorunlu görevlerin kaçı bitti; hepsi bittiyse gün tamamdır. */
export function dayProgress(views: readonly TaskView[], required: readonly TaskKey[]): DayProgress {
  const req = required.length > 0 ? required : taskKeys;
  const done = views.filter((v) => req.includes(v.key) && v.status === "done").length;
  return { done, total: req.length, complete: done === req.length };
}
