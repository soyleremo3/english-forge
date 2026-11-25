import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSettings, type Settings, type TaskKey } from "@/lib/settings";
import { computeStreak, type StreakInfo } from "@/lib/streak";
import type { Database, Json } from "@/lib/supabase/database.types";
import { endOfStudyDay, getStudyDate, type IsoDate } from "@/lib/time";
import {
  buildTaskViews,
  type DayProgress,
  dayProgress,
  parseTasks,
  type StoredTasks,
  type TaskProgress,
  type TaskView,
  updateTaskProgress,
} from "@/lib/today/tasks";
import { type LevelInfo, levelFromXp, XP } from "@/lib/xp";

// study_days kaydını oluşturan, okuyan ve güncelleyen sunucu fonksiyonları (SPEC 4, 6, 11).

type Db = SupabaseClient<Database>;
type StudyDayRow = Database["public"]["Tables"]["study_days"]["Row"];

/** Seri hesabı için geriye bakılan gün sayısı (seri bundan uzunsa bile en az bu kadar gösterilir). */
const STREAK_LOOKBACK_DAYS = 400;

function fail(what: string, message: string): never {
  throw new Error(`${what}: ${message}`);
}

export async function loadSettings(supabase: Db, userId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("profiles")
    .select("settings")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail("Ayarlar okunamadı", error.message);
  return resolveSettings(data?.settings);
}

export async function saveSettings(supabase: Db, userId: string, settings: Settings): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, settings: settings as unknown as Json }, { onConflict: "user_id" });
  if (error) fail("Ayarlar kaydedilemedi", error.message);
}

/**
 * Bugün tekrar edilecek kart sayısı: vadesi bu çalışma günü bitmeden gelen kartlar.
 * Böylece "yarın" vadeli bir kart, ertesi çalışma gününün tamamında (04:00'ten itibaren) görünür.
 */
export async function countDueReviews(supabase: Db, userId: string, now: Date): Promise<number> {
  const dayEnd = endOfStudyDay(getStudyDate(now));
  const { count, error } = await supabase
    .from("user_words")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["learning", "review"])
    .lt("due", dayEnd.toISOString());
  if (error) fail("Tekrar kartları sayılamadı", error.message);
  return count ?? 0;
}

/** Günün kaydını yoksa oluşturur, varsa olduğu gibi bırakır; kaydı döner. */
export async function ensureStudyDay(supabase: Db, userId: string, date: IsoDate): Promise<StudyDayRow> {
  const { error: upsertError } = await supabase
    .from("study_days")
    .upsert(
      { user_id: userId, study_date: date },
      { onConflict: "user_id,study_date", ignoreDuplicates: true },
    );
  if (upsertError) fail("Gün kaydı oluşturulamadı", upsertError.message);

  const { data, error } = await supabase
    .from("study_days")
    .select("*")
    .eq("user_id", userId)
    .eq("study_date", date)
    .single();
  if (error) fail("Gün kaydı okunamadı", error.message);
  return data;
}

export type TodayState = {
  date: IsoDate;
  settings: Settings;
  day: StudyDayRow;
  tasks: StoredTasks;
  views: TaskView[];
  progress: DayProgress;
  streak: StreakInfo;
  totalXp: number;
  level: LevelInfo;
};

/** Bugün ekranının ihtiyaç duyduğu her şey. Gün kaydı yoksa oluşturur. */
export async function loadToday(supabase: Db, userId: string, now: Date = new Date()): Promise<TodayState> {
  const date = getStudyDate(now);
  const [settings, initialDay, dueCount, history] = await Promise.all([
    loadSettings(supabase, userId),
    ensureStudyDay(supabase, userId, date),
    countDueReviews(supabase, userId, now),
    loadHistory(supabase, userId),
  ]);

  const tasks = parseTasks(initialDay.tasks);
  const views = buildTaskViews(tasks, { dueCount, settings });
  const progress = dayProgress(views, settings.required_tasks);

  // Zorunlu görevler bir görev güncellemesi olmadan da tamamlanmış olabilir
  // (ör. ayarlardan zorunlu görev çıkarıldı ya da vadesi gelen kart kalmadı). Günü kapat.
  const day =
    progress.complete && initialDay.completed_at === null
      ? await markDayComplete(supabase, userId, initialDay, now)
      : initialDay;

  // Geçmiş, bugünkü kaydın en güncel hâliyle birleştirilir.
  const marks = history
    .filter((h) => h.study_date !== date)
    .map((h) => ({ date: h.study_date, completed: h.completed_at !== null, frozen: h.frozen }));
  marks.push({ date, completed: day.completed_at !== null, frozen: day.frozen });

  const totalXp =
    history.filter((h) => h.study_date !== date).reduce((sum, h) => sum + h.xp, 0) + day.xp;

  return {
    date,
    settings,
    day,
    tasks,
    views,
    progress,
    streak: computeStreak(marks, date),
    totalXp,
    level: levelFromXp(totalXp),
  };
}

/**
 * Bir günün study_days kaydını siler (görev durumu, o günün XP'si ve seriye katkısı gider).
 * FSRS kartlarına (user_words), tekrar kayıtlarına ve cümlelere dokunmaz.
 */
export async function deleteStudyDay(supabase: Db, userId: string, date: IsoDate): Promise<void> {
  const { error } = await supabase.from("study_days").delete().eq("user_id", userId).eq("study_date", date);
  if (error) fail("Gün kaydı silinemedi", error.message);
}

/** Günü tamamlar: completed_at yazılır, gün tamamlama XP'si eklenir. Yalnızca bir kez çağrılmalı. */
async function markDayComplete(
  supabase: Db,
  userId: string,
  day: StudyDayRow,
  now: Date,
): Promise<StudyDayRow> {
  const { data, error } = await supabase
    .from("study_days")
    .update({ completed_at: now.toISOString(), xp: day.xp + XP.dayComplete })
    .eq("user_id", userId)
    .eq("study_date", day.study_date)
    .is("completed_at", null)
    .select("*")
    .maybeSingle();
  if (error) fail("Gün tamamlanamadı", error.message);
  // Başka bir istek az önce tamamladıysa satır dönmez; mevcut kaydı yeniden oku.
  return data ?? ensureStudyDay(supabase, userId, day.study_date);
}

async function loadHistory(supabase: Db, userId: string) {
  const { data, error } = await supabase
    .from("study_days")
    .select("study_date, completed_at, frozen, xp")
    .eq("user_id", userId)
    .order("study_date", { ascending: false })
    .limit(STREAK_LOOKBACK_DAYS);
  if (error) fail("Gün geçmişi okunamadı", error.message);
  return data;
}

export type TaskUpdateResult = {
  /** Bu güncellemeyle gün tamamlandı mı (önceden tamamlanmamıştı)? */
  dayJustCompleted: boolean;
  state: TodayState;
};

/**
 * Bir görevin ilerlemesini günceller. Zorunlu görevlerin hepsi bittiyse günü tamamlar:
 * completed_at yazılır ve gün tamamlama XP'si (+50) eklenir. Gün bir kez tamamlanır.
 */
export async function updateTask(
  supabase: Db,
  userId: string,
  key: TaskKey,
  patch: Partial<TaskProgress>,
  now: Date = new Date(),
): Promise<TaskUpdateResult> {
  const before = await loadToday(supabase, userId, now);
  const tasks = updateTaskProgress(before.tasks, key, patch);

  const { error } = await supabase
    .from("study_days")
    .update({ tasks: tasks as unknown as Json })
    .eq("user_id", userId)
    .eq("study_date", before.date);
  if (error) fail("Görev güncellenemedi", error.message);

  // loadToday, zorunlu görevler bittiyse günü tamamlar (completed_at + XP).
  const state = await loadToday(supabase, userId, now);
  const dayJustCompleted = before.day.completed_at === null && state.day.completed_at !== null;
  return { dayJustCompleted, state };
}
