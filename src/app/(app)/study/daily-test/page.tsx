import Link from "next/link";
import { Suspense } from "react";
import { DailyTest } from "@/components/quiz/daily-test";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { loadDailyTest } from "@/lib/daily-test-server";

// Günlük test (SPEC 5.4).
export default function DailyTestPage() {
  return (
    <section className="space-y-4">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← {tr.dailyTest.back}
      </Link>
      <h1 className="text-2xl font-semibold">{tr.dailyTest.title}</h1>
      <Suspense fallback={<p className="text-muted">{tr.dailyTest.loading}</p>}>
        <DailyTestLoader />
      </Suspense>
    </section>
  );
}

async function DailyTestLoader() {
  const { supabase, userId, now } = await requireUser();
  const state = await loadDailyTest(supabase, userId, now);

  if (state.status === "locked") {
    return (
      <div className="space-y-3 rounded-xl bg-surface-hover p-4">
        <p>{tr.dailyTest.locked}</p>
        <Link href="/study/new" className="inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
          {tr.dailyTest.toNewWords}
        </Link>
      </div>
    );
  }
  if (state.status === "empty") return <p className="rounded-xl bg-surface-hover p-4">{tr.dailyTest.empty}</p>;

  return (
    <>
      <p className="text-muted">{tr.dailyTest.intro(state.todayCount, state.words.length - state.todayCount)}</p>
      <DailyTest key={state.date} date={state.date} words={state.words} completed={state.status === "done"} score={state.score} />
    </>
  );
}
