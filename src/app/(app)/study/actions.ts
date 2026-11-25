"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import {
  type GroupQuizResult,
  markWordKnown,
  type StudyWord,
  submitGroupQuiz,
} from "@/lib/new-words";

export type KnownActionResult = { ok: true; replacement: StudyWord | null } | { ok: false };

/** "Bunu zaten biliyorum": kelimeyi known yapar, sıradaki kelimeyi aynı gruba ekler. */
export async function markKnownAction(wordId: number): Promise<KnownActionResult> {
  const id = z.number().int().positive().parse(wordId);
  const { supabase, userId, now } = await requireUser();
  try {
    const { replacement } = await markWordKnown(supabase, userId, now, id);
    return { ok: true, replacement };
  } catch {
    return { ok: false };
  }
}

const submitSchema = z.object({
  groupIndex: z.number().int().min(0).max(50),
  answers: z
    .array(
      z.object({
        wordId: z.number().int().positive(),
        direction: z.enum(["tr_en", "en_tr"]),
        answer: z.string().max(500),
        appealed: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
});

export type SubmitQuizInput = z.infer<typeof submitSchema>;
export type SubmitQuizResult = { ok: true; result: GroupQuizResult } | { ok: false };

/** Grup sınavını kaydeder: FSRS kartları, review_logs, quiz_attempts, XP ve görev ilerlemesi. */
export async function submitGroupQuizAction(input: SubmitQuizInput): Promise<SubmitQuizResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, userId, now } = await requireUser();
  try {
    const result = await submitGroupQuiz(supabase, userId, now, parsed.data.groupIndex, parsed.data.answers);
    return { ok: true, result };
  } catch {
    return { ok: false };
  }
}
