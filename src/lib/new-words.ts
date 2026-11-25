import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPassing } from "@/lib/answer-check";
import { firstReview } from "@/lib/fsrs";
import type { Settings } from "@/lib/settings";
import {
  composeDayWords,
  createPlan,
  isPlanComplete,
  learnedCount,
  markGroupCompleted,
  type NewWordsPlan,
  planWordIds,
  replaceWordInPlan,
} from "@/lib/study/new-words-plan";
import {
  finalResult,
  gradeAnswer,
  type QuizAnswer,
  type QuizDirection,
  type QuizWord,
  scoreQuiz,
  withAppeal,
} from "@/lib/study/quiz";
import { ensureStudyDay, loadSettings, loadToday } from "@/lib/study-days";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getStudyDate, type IsoDate } from "@/lib/time";
import { parseTasks, type StoredTasks } from "@/lib/today/tasks";
import { XP } from "@/lib/xp";

// Yeni kelimeler: günün planı, grup kelimeleri, "Bunu zaten biliyorum" ve grup sınavı kaydı (SPEC 5.2, 5.3).

type Db = SupabaseClient<Database>;

function fail(what: string, message: string): never {
  throw new Error(`${what}: ${message}`);
}

/** Kart ve sınav ekranlarının ihtiyaç duyduğu kelime verisi. */
export type StudyWord = QuizWord & {
  userWordId: number;
  en_definition: string | null;
  example_en: string | null;
  example_tr: string | null;
};

type PlanContext = {
  date: IsoDate;
  settings: Settings;
  plan: NewWordsPlan;
  tasks: StoredTasks;
  dayXp: number;
};

async function writeNewWordsTask(
  supabase: Db,
  userId: string,
  date: IsoDate,
  tasks: StoredTasks,
  plan: NewWordsPlan,
  xp?: number,
): Promise<void> {
  const next: StoredTasks = {
    ...tasks,
    new_words: { done: isPlanComplete(plan), count: learnedCount(plan), plan },
  };
  const { error } = await supabase
    .from("study_days")
    .update({ tasks: next as unknown as Json, ...(xp === undefined ? {} : { xp }) })
    .eq("user_id", userId)
    .eq("study_date", date);
  if (error) fail("Kelime planı kaydedilemedi", error.message);
}

/** Önceki günlerden kalan, bitirilmemiş kelimeler (status='new'), eskiden yeniye ve sıklık sırasıyla. */
async function carryoverWordIds(supabase: Db, userId: string, date: IsoDate, exclude: ReadonlySet<number>) {
  const { data, error } = await supabase
    .from("user_words")
    .select("word_id, introduced_on, words(rank)")
    .eq("user_id", userId)
    .eq("status", "new")
    .or(`introduced_on.is.null,introduced_on.lt.${date}`);
  if (error) fail("Devreden kelimeler okunamadı", error.message);
  return data
    .filter((r) => !exclude.has(r.word_id))
    .sort(
      (a, b) =>
        (a.introduced_on ?? "").localeCompare(b.introduced_on ?? "") ||
        (a.words?.rank ?? Number.MAX_SAFE_INTEGER) - (b.words?.rank ?? Number.MAX_SAFE_INTEGER),
    )
    .map((r) => r.word_id);
}

async function freshWordIds(supabase: Db, limit: number): Promise<number[]> {
  if (limit <= 0) return [];
  const { data, error } = await supabase.rpc("next_fresh_words", { p_limit: limit });
  if (error) fail("Yeni kelime kuyruğu okunamadı", error.message);
  return data.map((w) => w.id);
}

/**
 * Seçilen kelimeleri bugüne bağlar: yeni olanlar status='new' ile eklenir,
 * devredenlerin introduced_on'u bugüne çekilir.
 */
async function attachToDay(supabase: Db, userId: string, date: IsoDate, wordIds: readonly number[]) {
  if (wordIds.length === 0) return;
  const { error: insertError } = await supabase.from("user_words").upsert(
    wordIds.map((word_id) => ({ user_id: userId, word_id, status: "new", introduced_on: date })),
    { onConflict: "user_id,word_id", ignoreDuplicates: true },
  );
  if (insertError) fail("Kelimeler güne eklenemedi", insertError.message);

  const { error: updateError } = await supabase
    .from("user_words")
    .update({ introduced_on: date })
    .eq("user_id", userId)
    .eq("status", "new")
    .in("word_id", [...wordIds]);
  if (updateError) fail("Kelimeler güne bağlanamadı", updateError.message);
}

/** Sıradaki kelimeleri seçer: önce devredenler, sonra kuyruk. Toplam en fazla `limit`. */
async function pickWords(supabase: Db, userId: string, date: IsoDate, limit: number, exclude: ReadonlySet<number>) {
  const carry = await carryoverWordIds(supabase, userId, date, exclude);
  const fresh = carry.length >= limit ? [] : await freshWordIds(supabase, limit - carry.length);
  return composeDayWords(carry, fresh.filter((id) => !exclude.has(id)), limit);
}

/**
 * Günün yeni kelime planını döner; yoksa oluşturur ve study_days'e sabitler.
 * Plan gün içinde değişmez (ayarlar değişse bile).
 */
export async function ensureNewWordsPlan(supabase: Db, userId: string, now: Date): Promise<PlanContext> {
  const date = getStudyDate(now);
  const [settings, day] = await Promise.all([
    loadSettings(supabase, userId),
    ensureStudyDay(supabase, userId, date),
  ]);
  const tasks = parseTasks(day.tasks);
  const existing = tasks.new_words?.plan;
  if (existing) return { date, settings, plan: existing, tasks, dayXp: day.xp };

  const wordIds = await pickWords(supabase, userId, date, settings.daily_new, new Set());
  await attachToDay(supabase, userId, date, wordIds);
  const plan = createPlan(wordIds, settings.group_size);
  await writeNewWordsTask(supabase, userId, date, tasks, plan);
  return { date, settings, plan, tasks, dayXp: day.xp };
}

/** Kelimeleri verilen sırayla, kullanıcıya özel alanlarıyla (itirazlar, özel anlamlar) yükler. */
export async function loadStudyWords(
  supabase: Db,
  userId: string,
  wordIds: readonly number[],
): Promise<StudyWord[]> {
  if (wordIds.length === 0) return [];
  const { data, error } = await supabase
    .from("user_words")
    .select(
      "id, word_id, custom_tr, accepted_answers_en, accepted_answers_tr, words(lemma, pos, tr_meanings, en_alternatives, en_definition, example_en, example_tr)",
    )
    .eq("user_id", userId)
    .in("word_id", [...wordIds]);
  if (error) fail("Kelimeler okunamadı", error.message);

  const byWord = new Map(data.map((r) => [r.word_id, r]));
  return wordIds.flatMap((id) => {
    const r = byWord.get(id);
    if (!r?.words) return [];
    return [
      {
        wordId: id,
        userWordId: r.id,
        lemma: r.words.lemma,
        pos: r.words.pos,
        tr_meanings: r.words.tr_meanings,
        en_alternatives: r.words.en_alternatives,
        en_definition: r.words.en_definition,
        example_en: r.words.example_en,
        example_tr: r.words.example_tr,
        custom_tr: r.custom_tr ?? [],
        accepted_answers_en: r.accepted_answers_en,
        accepted_answers_tr: r.accepted_answers_tr,
      },
    ];
  });
}

/**
 * "Bunu zaten biliyorum" (SPEC 5.2): kelime known olur, kuyruktaki sıradaki kelime aynı gruba eklenir.
 * Sınavı bitmiş gruptaki kelimeye uygulanmaz.
 */
export async function markWordKnown(
  supabase: Db,
  userId: string,
  now: Date,
  wordId: number,
): Promise<{ replacement: StudyWord | null }> {
  const ctx = await ensureNewWordsPlan(supabase, userId, now);
  const groupIndex = ctx.plan.groups.findIndex((g) => g.includes(wordId));
  if (groupIndex === -1) fail("Kelime bugünün planında yok", String(wordId));
  if (ctx.plan.completed.includes(groupIndex)) fail("Grubun sınavı zaten yapıldı", String(groupIndex));

  const { error } = await supabase
    .from("user_words")
    .update({ status: "known" })
    .eq("user_id", userId)
    .eq("word_id", wordId);
  if (error) fail("Kelime 'biliyorum' olarak işaretlenemedi", error.message);

  const [nextId] = await pickWords(supabase, userId, ctx.date, 1, new Set(planWordIds(ctx.plan)));
  if (nextId !== undefined) await attachToDay(supabase, userId, ctx.date, [nextId]);
  const plan = replaceWordInPlan(ctx.plan, wordId, nextId ?? null);
  await writeNewWordsTask(supabase, userId, ctx.date, ctx.tasks, plan);

  if (nextId === undefined) return { replacement: null };
  const [replacement] = await loadStudyWords(supabase, userId, [nextId]);
  return { replacement: replacement ?? null };
}

export type SubmittedAnswer = Pick<QuizAnswer, "wordId" | "direction" | "answer" | "appealed">;

export type GroupQuizResult = {
  alreadySaved: boolean;
  xpGained: number;
  correct: number;
  total: number;
  percent: number;
  allGroupsDone: boolean;
};

const RATING = { good: 3, again: 1 } as const;

/**
 * Grup sınavını kaydeder (SPEC 5.3):
 * - Cevaplar sunucuda yeniden kontrol edilir; itiraz yalnızca "yanlış" cevapta geçerlidir.
 * - Her kelime FSRS kartına dönüşür: doğru/neredeyse → Good, yanlış → Again; ilk tekrar ertesi gün.
 * - status='learning'; itiraz edilen cevap yalnızca o yönün kabul listesine eklenir.
 * - review_logs + quiz_attempts yazılır; XP: kelime başına 10, doğru cevap başına 3.
 * - Grup bitmiş işaretlenir; bütün gruplar bitince Yeni kelimeler görevi tamamlanır.
 */
export async function submitGroupQuiz(
  supabase: Db,
  userId: string,
  now: Date,
  groupIndex: number,
  submitted: readonly SubmittedAnswer[],
): Promise<GroupQuizResult> {
  const ctx = await ensureNewWordsPlan(supabase, userId, now);
  const group = ctx.plan.groups[groupIndex];
  if (!group) fail("Grup bulunamadı", String(groupIndex));
  if (ctx.plan.completed.includes(groupIndex)) {
    return { alreadySaved: true, xpGained: 0, correct: 0, total: 0, percent: 0, allGroupsDone: isPlanComplete(ctx.plan) };
  }

  // Her kelime tam bir kez cevaplanmış olmalı.
  const ids = submitted.map((a) => a.wordId);
  if (ids.length !== group.length || new Set(ids).size !== ids.length || !ids.every((id) => group.includes(id))) {
    fail("Sınav cevapları grupla uyuşmuyor", `${ids.length}/${group.length}`);
  }

  const words = new Map((await loadStudyWords(supabase, userId, group)).map((w) => [w.wordId, w]));
  const answers: QuizAnswer[] = submitted.map((a) => {
    const word = words.get(a.wordId);
    if (!word) fail("Kelime bulunamadı", String(a.wordId));
    const result = gradeAnswer(word, a.direction, a.answer);
    return { ...a, answer: a.answer.trim().slice(0, 500), result, appealed: a.appealed && result === "wrong" };
  });

  for (const a of answers) {
    const word = words.get(a.wordId);
    if (!word) continue;
    const passed = isPassing(finalResult(a));
    const card = firstReview(now, passed ? "good" : "again", { retention: ctx.settings.desired_retention });
    const updated = a.appealed ? withAppeal(word, a.direction as QuizDirection, a.answer) : word;

    const { error: uwError } = await supabase
      .from("user_words")
      .update({
        ...card,
        status: "learning",
        accepted_answers_en: updated.accepted_answers_en,
        accepted_answers_tr: updated.accepted_answers_tr,
      })
      .eq("id", word.userWordId)
      .eq("user_id", userId);
    if (uwError) fail("Kelime kartı kaydedilemedi", uwError.message);

    const { error: logError } = await supabase.from("review_logs").insert({
      user_id: userId,
      user_word_id: word.userWordId,
      kind: "group_quiz",
      rating: passed ? RATING.good : RATING.again,
      direction: a.direction,
      answer: a.answer,
      result: finalResult(a),
    });
    if (logError) fail("Tekrar kaydı yazılamadı", logError.message);
  }

  const score = scoreQuiz(answers);
  const { error: quizError } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    kind: "group",
    study_date: ctx.date,
    score: score.percent,
    items: answers.map((a) => ({
      word_id: a.wordId,
      direction: a.direction,
      answer: a.answer,
      result: a.result,
      appealed: a.appealed,
      final: finalResult(a),
    })) as unknown as Json,
  });
  if (quizError) fail("Sınav kaydedilemedi", quizError.message);

  const xpGained = group.length * XP.newWord + score.correct * XP.correctAnswer;
  const plan = markGroupCompleted(ctx.plan, groupIndex);
  // XP'yi güncel gün kaydı üzerine ekle (bu sırada başka bir güncelleme olmuş olabilir).
  const day = await ensureStudyDay(supabase, userId, ctx.date);
  await writeNewWordsTask(supabase, userId, ctx.date, parseTasks(day.tasks), plan, day.xp + xpGained);

  // Bütün zorunlu görevler bittiyse gün burada tamamlanır.
  await loadToday(supabase, userId, now);

  return {
    alreadySaved: false,
    xpGained,
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    allGroupsDone: isPlanComplete(plan),
  };
}
