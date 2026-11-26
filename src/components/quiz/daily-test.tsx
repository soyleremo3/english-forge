"use client";

import Link from "next/link";
import { submitDailyTestAction } from "@/app/(app)/study/actions";
import { QuizSession } from "@/components/quiz/quiz-session";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";

// Günlük test (SPEC 5.4): ortak QuizSession, karışık yön, itiraz serbest; puan şartı yok.
export function DailyTest({ date, words, completed, score }: { date: string; words: StudyWord[]; completed: boolean; score: number | null }) {
  const toToday = (
    <Link href="/" className="inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
      {tr.dailyTest.toToday}
    </Link>
  );
  return (
    <QuizSession
      storageKey={`${date}:daily`}
      words={words}
      directionSetting="mixed"
      allowAppeal
      completed={completed}
      onSave={async (answers) => {
        const res = await submitDailyTestAction({
          answers: answers.map((a) => ({ wordId: a.wordId, direction: a.direction, answer: a.answer, appealed: a.appealed })),
        });
        return res.ok ? res.result : null;
      }}
      renderAlreadyCompleted={() => (
        <section className="space-y-3 rounded-2xl bg-success/10 p-5" role="status">
          <p className="font-medium text-success">✓ {tr.dailyTest.alreadyDone(score ?? 0)}</p>
          {toToday}
        </section>
      )}
      renderDone={({ saved }) => (
        <div className="space-y-3 rounded-2xl bg-success/10 p-4" role="status">
          <p className="font-medium text-success">
            {saved?.alreadySaved ? tr.dailyTest.alreadyDone(saved.percent) : tr.dailyTest.saved(saved?.xpGained ?? 0, saved?.percent ?? 0)}
          </p>
          {saved && !saved.alreadySaved && saved.total > 0 && saved.correct === saved.total && (
            <p className="text-sm">🎉 {tr.dailyTest.perfect}</p>
          )}
          {toToday}
        </div>
      )}
    />
  );
}
