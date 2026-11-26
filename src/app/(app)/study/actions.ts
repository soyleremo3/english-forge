"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { type DailyTestResult, submitDailyTest } from "@/lib/daily-test-server";
import { finishReviewSession, type ReviewAnswerResult, submitReviewAnswer } from "@/lib/reviews";
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

const gradeSchema = z.enum(["again", "hard", "good", "easy"]);

const reviewAnswerSchema = z.object({
  wordId: z.number().int().positive(),
  grade: gradeSchema,
  typed: z.object({ answer: z.string().max(500), appealed: z.boolean() }).optional(),
});

export type ReviewAnswerActionResult = { ok: true; result: ReviewAnswerResult } | { ok: false };

/** Tekrar: kartın o günkü ilk cevabını FSRS'e işler (sunucu, aynı gün ikinci cevabı yok sayar). */
export async function reviewAnswerAction(input: z.infer<typeof reviewAnswerSchema>): Promise<ReviewAnswerActionResult> {
  const parsed = reviewAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, userId, now } = await requireUser();
  try {
    return { ok: true, result: await submitReviewAnswer(supabase, userId, now, parsed.data) };
  } catch {
    return { ok: false };
  }
}

/** Tekrar oturumu bitti: görev tamamlanır. */
export async function finishReviewAction(): Promise<{ ok: boolean }> {
  const { supabase, userId, now } = await requireUser();
  try {
    await finishReviewSession(supabase, userId, now);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const dailySchema = z.object({ answers: submitSchemaAnswers() });

function submitSchemaAnswers() {
  return z
    .array(
      z.object({
        wordId: z.number().int().positive(),
        direction: z.enum(["tr_en", "en_tr"]),
        answer: z.string().max(500),
        appealed: z.boolean(),
      }),
    )
    .min(1)
    .max(100);
}

export type SubmitDailyResult = { ok: true; result: DailyTestResult } | { ok: false };

/** Günlük testi kaydeder: puan, yanlışlar FSRS'te Again, XP, görev. */
export async function submitDailyTestAction(input: z.infer<typeof dailySchema>): Promise<SubmitDailyResult> {
  const parsed = dailySchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { supabase, userId, now } = await requireUser();
  try {
    return { ok: true, result: await submitDailyTest(supabase, userId, now, parsed.data.answers) };
  } catch {
    return { ok: false };
  }
}

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
