"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getDayOffset } from "@/lib/dev/clock";
import { DEV_DAY_OFFSET_COOKIE, isDevToolsEnabled } from "@/lib/dev/dev-tools";
import { deleteStudyDay } from "@/lib/study-days";
import { getStudyDate } from "@/lib/time";

// Geliştirici araçları (yalnızca `next dev`). Production'da her action 404 döner ve hiçbir şey yapmaz.

function assertDev(): void {
  if (!isDevToolsEnabled()) notFound();
}

/** (Simüle edilen) bugünün study_days kaydını siler: görevler, günün XP'si ve seriye katkısı. */
export async function devResetToday(): Promise<void> {
  assertDev();
  const { supabase, userId, now } = await requireUser();
  await deleteStudyDay(supabase, userId, getStudyDate(now));
  redirect("/");
}

/** Tarihi bir gün ileri alır (ertesi günü denemek için). */
export async function devAdvanceDay(): Promise<void> {
  assertDev();
  await requireUser();
  const next = (await getDayOffset()) + 1;
  (await cookies()).set(DEV_DAY_OFFSET_COOKIE, String(next), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

/** Gerçek tarihe döner. */
export async function devResetClock(): Promise<void> {
  assertDev();
  await requireUser();
  (await cookies()).delete(DEV_DAY_OFFSET_COOKIE);
  redirect("/");
}
