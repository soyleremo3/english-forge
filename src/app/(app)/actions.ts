"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { taskKeys } from "@/lib/settings";
import { loadToday, updateTask } from "@/lib/study-days";

const taskKeySchema = z.enum(taskKeys);

/**
 * GEÇİCİ: Görev ekranları yapılana kadar bir görevi "tamamlandı" işaretler.
 * Gerçek ekranlar (tekrar, grup çalışması, günlük test, cümleler) updateTask'ı kendileri çağıracak.
 */
export async function completeTaskTemporary(formData: FormData): Promise<void> {
  const key = taskKeySchema.parse(formData.get("task"));
  // Yeni kelimeler artık gerçek ekranla (grup çalışması + sınav) tamamlanır.
  if (key === "new_words") redirect("/study/new");
  if (key === "review") redirect("/study/review");
  if (key === "daily_test") redirect("/study/daily-test");
  const { supabase, userId, now } = await requireUser();
  const before = await loadToday(supabase, userId, now);

  // Günlük test kilitliyse işaretlenemez (SPEC 4).
  const view = before.views.find((v) => v.key === key);
  if (view?.status === "locked") redirect(view.href);

  const current = before.tasks[key];
  const { dayJustCompleted } = await updateTask(
    supabase,
    userId,
    key,
    { done: true, count: Math.max(current?.count ?? 0, view?.total ?? 1) },
    now,
  );
  redirect(dayJustCompleted ? "/?celebrate=1" : "/");
}
