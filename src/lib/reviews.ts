import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPassing } from "@/lib/answer-check";
import { type CardFields, nextReview, type ReviewGrade, reviewedToday } from "@/lib/fsrs";
import { loadStudyWords, type StudyWord } from "@/lib/new-words";
import type { Settings } from "@/lib/settings";
import { finalResult, gradeAnswer, type QuizResult, withAppeal } from "@/lib/study/quiz";
import { ensureStudyDay, loadSettings, loadToday, updateDayTasks } from "@/lib/study-days";
import type { Database } from "@/lib/supabase/database.types";
import { endOfStudyDay, getStudyDate, type IsoDate, startOfStudyDay } from "@/lib/time";
import { parseTasks, updateTaskProgress } from "@/lib/today/tasks";
import { XP } from "@/lib/xp";

// Tekrar (SPEC 5.5): vadesi gelen kartlar, review_cap sınırı, FSRS'e yalnızca kartın o günkü ilk cevabı.

type Db = SupabaseClient<Database>;

function fail(what: string, message: string): never {
  throw new Error(`${what}: ${message}`);
}

const RATING: Record<ReviewGrade, number> = { again: 1, hard: 2, good: 3, easy: 4 };

export type ReviewQueue = {
  date: IsoDate;
  settings: Settings;
  cards: StudyWord[];
  /** Bugün vadesi gelen toplam kart (sınır öncesi) */
  totalDue: number;
  /** Günlük sınır yüzünden yarına kalan kart */
  overflow: number;
  /** Bugün zaten tekrar edilen kart */
  reviewedToday: number;
  /** Bugün tekrar edilmiş kartların verisi (sayfa yenilenince oturum kaldığı yerden sürsün) */
  todayCards: StudyWord[];
  /** Bugün ilk cevabı "Bilemedim" olan kartlar (ek tur) */
  relearnIds: number[];
  /** Görev bugün tamamlandı mı */
  done: boolean;
};

/** Bugünün tekrar kuyruğu: vadesi çalışma günü bitmeden gelen kartlar, vade sırasıyla, sınır kadar. */
export async function loadReviewQueue(supabase: Db, userId: string, now: Date): Promise<ReviewQueue> {
  const date = getStudyDate(now);
  const [settings, day] = await Promise.all([loadSettings(supabase, userId), ensureStudyDay(supabase, userId, date)]);
  const review = parseTasks(day.tasks).review ?? { done: false, count: 0 };
  const remaining = Math.max(0, settings.review_cap - review.count);

  const { data, count, error } = await supabase
    .from("user_words")
    .select("word_id", { count: "exact" })
    .eq("user_id", userId)
    .in("status", ["learning", "review"])
    .lt("due", endOfStudyDay(date).toISOString())
    .order("due", { ascending: true })
    .order("id", { ascending: true })
    .limit(Math.max(remaining, 1));
  if (error) fail("Tekrar kartları okunamadı", error.message);

  const ids = remaining === 0 ? [] : data.map((r) => r.word_id);
  const totalDue = count ?? 0;

  // Bugün tekrar edilen kartlar ve ilk cevabı Again olanlar (ek tur). Görev bittiyse ek tur yok.
  const { data: logs, error: logError } = await supabase
    .from("review_logs")
    .select("rating, created_at, user_words!inner(word_id)")
    .eq("user_id", userId)
    .in("kind", ["review", "typed_review"])
    .gte("created_at", startOfStudyDay(date).toISOString())
    .order("created_at", { ascending: true });
  if (logError) fail("Bugünün tekrarları okunamadı", logError.message);
  const todayIds = [...new Set(logs.map((l) => l.user_words.word_id))];
  const relearnIds = review.done
    ? []
    : todayIds.filter((id) => logs.find((l) => l.user_words.word_id === id)?.rating === RATING.again);

  const [cards, todayCards] = await Promise.all([
    loadStudyWords(supabase, userId, ids),
    loadStudyWords(supabase, userId, todayIds),
  ]);
  return {
    date,
    settings,
    cards,
    totalDue,
    overflow: Math.max(0, totalDue - ids.length),
    reviewedToday: review.count,
    done: review.done,
    todayCards,
    relearnIds,
  };
}

export type ReviewAnswerInput = {
  wordId: number;
  /** Kartla tekrarda kullanıcının seçtiği not; yazılı soruda yok sayılır (sunucu cevaptan hesaplar) */
  grade: ReviewGrade;
  /** Yazılı soru (her N. kart): cevap ve itiraz */
  typed?: { answer: string; appealed: boolean };
};

export type ReviewAnswerResult = {
  alreadyReviewed: boolean;
  grade: ReviewGrade;
  result?: QuizResult;
  xpGained: number;
};

/**
 * Bir kartın o günkü İLK cevabını FSRS'e işler. Kart bugün zaten değerlendirildiyse hiçbir şey yapmaz
 * ("Bilemedim" ek turları ve tekrar gönderimler FSRS'i etkilemez).
 */
export async function submitReviewAnswer(
  supabase: Db,
  userId: string,
  now: Date,
  input: ReviewAnswerInput,
): Promise<ReviewAnswerResult> {
  const date = getStudyDate(now);
  const settings = await loadSettings(supabase, userId);
  const { data: row, error } = await supabase
    .from("user_words")
    .select(
      "id, word_id, status, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review",
    )
    .eq("user_id", userId)
    .eq("word_id", input.wordId)
    .single();
  if (error) fail("Kart bulunamadı", error.message);
  if (row.status !== "learning" && row.status !== "review") fail("Kart tekrarda değil", row.status);

  // İlk cevap kuralı: kart bugün zaten değerlendirildiyse (vadesi artık ileride olsa da) hiçbir şey yapma.
  if (reviewedToday(row.last_review, now)) {
    return { alreadyReviewed: true, grade: input.grade, xpGained: 0 };
  }
  if (!row.due || new Date(row.due) >= endOfStudyDay(date)) fail("Kartın vadesi gelmedi", String(row.due));

  let grade = input.grade;
  let result: QuizResult | undefined;
  let acceptedEn: string[] | undefined;

  if (input.typed) {
    const [word] = await loadStudyWords(supabase, userId, [input.wordId]);
    if (!word) fail("Kelime bulunamadı", String(input.wordId));
    const graded = gradeAnswer(word, "tr_en", input.typed.answer);
    const appealed = input.typed.appealed && graded === "wrong";
    result = finalResult({ result: graded, appealed });
    grade = isPassing(result) ? "good" : "again";
    if (appealed) acceptedEn = withAppeal(word, "tr_en", input.typed.answer).accepted_answers_en;
  }

  const fields: CardFields = {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review,
  };
  const card = nextReview(fields, now, grade, { retention: settings.desired_retention });

  const { error: updateError } = await supabase
    .from("user_words")
    .update({
      ...card,
      status: card.state === 2 ? "review" : "learning",
      ...(acceptedEn ? { accepted_answers_en: acceptedEn } : {}),
    })
    .eq("id", row.id)
    .eq("user_id", userId);
  if (updateError) fail("Kart güncellenemedi", updateError.message);

  const { error: logError } = await supabase.from("review_logs").insert({
    user_id: userId,
    // Uygulamanın saati (geliştirmede simüle edilen gün dahil); "bugünün tekrarları" buna dayanır.
    created_at: now.toISOString(),
    user_word_id: row.id,
    kind: input.typed ? "typed_review" : "review",
    rating: RATING[grade],
    direction: "tr_en",
    answer: input.typed ? input.typed.answer.trim().slice(0, 500) : null,
    result: result ?? null,
  });
  if (logError) fail("Tekrar kaydı yazılamadı", logError.message);

  const xpGained = XP.reviewCard + (result && isPassing(result) ? XP.correctAnswer : 0);
  await updateDayTasks(
    supabase,
    userId,
    date,
    (tasks) => updateTaskProgress(tasks, "review", { count: (tasks.review?.count ?? 0) + 1 }),
    { xpDelta: xpGained },
  );
  return { alreadyReviewed: false, grade, result, xpGained };
}

/** Oturum bitti: Tekrar görevi tamamlanır (sınır yüzünden yarına kalan kartlar olsa bile). */
export async function finishReviewSession(supabase: Db, userId: string, now: Date): Promise<void> {
  const date = getStudyDate(now);
  await updateDayTasks(supabase, userId, date, (tasks) => updateTaskProgress(tasks, "review", { done: true }));
  await loadToday(supabase, userId, now);
}
