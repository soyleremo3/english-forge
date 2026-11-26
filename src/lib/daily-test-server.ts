import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPassing } from "@/lib/answer-check";
import { type CardFields, nextReview } from "@/lib/fsrs";
import { loadStudyWords, type StudyWord, type SubmittedAnswer } from "@/lib/new-words";
import type { Settings } from "@/lib/settings";
import { dailyTestXp, MISTAKE_LOOKBACK_DAYS, selectDailyTestWords } from "@/lib/study/daily-test";
import { isPlanComplete } from "@/lib/study/new-words-plan";
import { finalResult, gradeAnswer, type QuizAnswer, scoreQuiz, withAppeal } from "@/lib/study/quiz";
import { ensureStudyDay, loadSettings, loadToday, updateDayTasks } from "@/lib/study-days";
import type { Database, Json } from "@/lib/supabase/database.types";
import { addDays, getStudyDate, type IsoDate, startOfStudyDay } from "@/lib/time";
import { parseTasks } from "@/lib/today/tasks";

// Günlük test (SPEC 5.4): bütün gruplar bitince açılır. Bugünün yeni kelimeleri + son 7 günde hata
// yapılan en fazla 8 kelime, karışık yön, yazılı. Soru listesi ilk açılışta study_days'e sabitlenir.

type Db = SupabaseClient<Database>;

function fail(what: string, message: string): never {
  throw new Error(`${what}: ${message}`);
}

export type DailyTestState =
  | { status: "locked"; date: IsoDate }
  | { status: "empty"; date: IsoDate }
  | {
      status: "open" | "done";
      date: IsoDate;
      settings: Settings;
      words: StudyWord[];
      /** Bugünün yeni kelimelerinden kaçı testte (kalanı son 7 günün hataları) */
      todayCount: number;
      score: number | null;
    };

/** Son 7 günde (bugün dahil) yanlış cevaplanan, hâlâ tekrarda olan kelimeler. */
async function recentMistakes(supabase: Db, userId: string, date: IsoDate) {
  const since = startOfStudyDay(addDays(date, -(MISTAKE_LOOKBACK_DAYS - 1)));
  const { data, error } = await supabase
    .from("review_logs")
    .select("created_at, user_words!inner(word_id, status)")
    .eq("user_id", userId)
    .eq("result", "wrong")
    .gte("created_at", since.toISOString())
    .in("user_words.status", ["learning", "review"]);
  if (error) fail("Son hatalar okunamadı", error.message);
  return data.map((r) => ({ wordId: r.user_words.word_id, at: r.created_at }));
}

export async function loadDailyTest(supabase: Db, userId: string, now: Date): Promise<DailyTestState> {
  const date = getStudyDate(now);
  const [settings, day] = await Promise.all([loadSettings(supabase, userId), ensureStudyDay(supabase, userId, date)]);
  const tasks = parseTasks(day.tasks);
  const plan = tasks.new_words?.plan;
  const daily = tasks.daily_test;

  if (!daily?.done && !(plan && isPlanComplete(plan))) return { status: "locked", date };

  let wordIds = daily?.wordIds;
  if (!wordIds) {
    const planIds = plan ? plan.groups.flat() : [];
    // Bugünün kelimelerinden yalnızca öğrenilenler ("zaten biliyorum" denenler hariç).
    const { data, error } = await supabase
      .from("user_words")
      .select("word_id")
      .eq("user_id", userId)
      .in("status", ["learning", "review"])
      .in("word_id", planIds.length ? planIds : [-1]);
    if (error) fail("Bugünün kelimeleri okunamadı", error.message);
    const learned = new Set(data.map((r) => r.word_id));
    const todayIds = planIds.filter((id) => learned.has(id));
    wordIds = selectDailyTestWords(todayIds, await recentMistakes(supabase, userId, date));
    const fixed = wordIds;
    await updateDayTasks(supabase, userId, date, (t) => ({
      ...t,
      daily_test: { done: t.daily_test?.done ?? false, count: t.daily_test?.count ?? 0, wordIds: fixed },
    }));
  }

  if (wordIds.length === 0) return { status: "empty", date };
  const planIds = new Set(plan ? plan.groups.flat() : []);
  return {
    status: daily?.done ? "done" : "open",
    date,
    settings,
    todayCount: wordIds.filter((id) => planIds.has(id)).length,
    words: await loadStudyWords(supabase, userId, wordIds),
    score: daily?.score ?? day.daily_test_score ?? null,
  };
}

export type DailyTestResult = {
  alreadySaved: boolean;
  xpGained: number;
  correct: number;
  total: number;
  percent: number;
};

/**
 * Günlük testi kaydeder: puan study_days.daily_test_score'a, yanlışlar FSRS'te Again (doğrular FSRS'e
 * dokunmaz), review_logs (daily_test) + quiz_attempts (daily), XP, görev tamamlanır (puan şartı yok).
 */
export async function submitDailyTest(
  supabase: Db,
  userId: string,
  now: Date,
  submitted: readonly SubmittedAnswer[],
): Promise<DailyTestResult> {
  const state = await loadDailyTest(supabase, userId, now);
  if (state.status === "locked" || state.status === "empty") fail("Günlük test açık değil", state.status);
  if (state.status === "done") return { alreadySaved: true, xpGained: 0, correct: 0, total: 0, percent: state.score ?? 0 };

  const ids = submitted.map((a) => a.wordId);
  const expected = state.words.map((w) => w.wordId);
  if (ids.length !== expected.length || new Set(ids).size !== ids.length || !ids.every((id) => expected.includes(id))) {
    fail("Test cevapları soru listesiyle uyuşmuyor", `${ids.length}/${expected.length}`);
  }

  const words = new Map(state.words.map((w) => [w.wordId, w]));
  const answers: QuizAnswer[] = submitted.map((a) => {
    const word = words.get(a.wordId);
    if (!word) fail("Kelime bulunamadı", String(a.wordId));
    const result = gradeAnswer(word, a.direction, a.answer);
    return { ...a, answer: a.answer.trim().slice(0, 500), result, appealed: a.appealed && result === "wrong" };
  });

  const { data: rows, error: rowsError } = await supabase
    .from("user_words")
    .select("id, word_id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review")
    .eq("user_id", userId)
    .in("word_id", expected);
  if (rowsError) fail("Kartlar okunamadı", rowsError.message);
  const rowByWord = new Map(rows.map((r) => [r.word_id, r]));

  for (const a of answers) {
    const word = words.get(a.wordId);
    const row = rowByWord.get(a.wordId);
    if (!word || !row) continue;
    const passed = isPassing(finalResult(a));

    const update: Database["public"]["Tables"]["user_words"]["Update"] = {};
    if (!passed && row.due) {
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
      const card = nextReview(fields, now, "again", { retention: state.settings.desired_retention });
      Object.assign(update, card, { status: card.state === 2 ? "review" : "learning" });
    }
    if (a.appealed) {
      const appealed = withAppeal(word, a.direction, a.answer);
      update.accepted_answers_en = appealed.accepted_answers_en;
      update.accepted_answers_tr = appealed.accepted_answers_tr;
    }
    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from("user_words").update(update).eq("id", row.id).eq("user_id", userId);
      if (error) fail("Kart güncellenemedi", error.message);
    }

    const { error: logError } = await supabase.from("review_logs").insert({
      user_id: userId,
      // Uygulamanın saati (geliştirmede simüle edilen gün dahil); "son 7 gün" hesabı buna dayanır.
      created_at: now.toISOString(),
      user_word_id: row.id,
      kind: "daily_test",
      rating: passed ? null : 1,
      direction: a.direction,
      answer: a.answer,
      result: finalResult(a),
    });
    if (logError) fail("Test kaydı yazılamadı", logError.message);
  }

  const score = scoreQuiz(answers);
  const { error: quizError } = await supabase.from("quiz_attempts").insert({
    user_id: userId,
    created_at: now.toISOString(),
    kind: "daily",
    study_date: state.date,
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
  if (quizError) fail("Test kaydedilemedi", quizError.message);

  const xpGained = dailyTestXp(score.correct, score.total);
  await updateDayTasks(
    supabase,
    userId,
    state.date,
    (t) => ({ ...t, daily_test: { done: true, count: 1, wordIds: expected, score: score.percent } }),
    { xpDelta: xpGained, extra: { daily_test_score: score.percent } },
  );
  await loadToday(supabase, userId, now);

  return { alreadySaved: false, xpGained, correct: score.correct, total: score.total, percent: score.percent };
}
