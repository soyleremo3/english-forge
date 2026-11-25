import Link from "next/link";
import { Suspense } from "react";
import { GroupQuiz } from "@/components/quiz/group-quiz";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { ensureNewWordsPlan, loadStudyWords } from "@/lib/new-words";
import { isPlanComplete } from "@/lib/study/new-words-plan";

// Grup sınavı (SPEC 5.3): /study/quiz/1 = bugünün 1. grubu.
export default function GroupQuizPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <section className="space-y-4">
      <Link href="/study/new" className="text-sm text-accent hover:underline">
        ← {tr.study.title}
      </Link>
      <Suspense fallback={<p className="text-muted">{tr.quiz.loading}</p>}>
        <QuizLoader params={params} />
      </Suspense>
    </section>
  );
}

async function QuizLoader({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, userId, now }] = await Promise.all([params, requireUser()]);
  const groupNumber = Number(id);
  const { date, settings, plan } = await ensureNewWordsPlan(supabase, userId, now);
  const groupIndex = groupNumber - 1;
  const group = Number.isInteger(groupNumber) ? plan.groups[groupIndex] : undefined;

  if (!group) {
    return <p className="rounded-xl bg-surface-hover p-4">{tr.quiz.groupNotFound}</p>;
  }

  const words = await loadStudyWords(supabase, userId, group);
  return (
    <>
      <h1 className="text-2xl font-semibold">{tr.quiz.title(groupNumber)}</h1>
      <GroupQuiz
        key={`${date}:${groupIndex}`}
        quizKey={`${date}:quiz:${groupIndex}`}
        groupIndex={groupIndex}
        words={words}
        directionSetting={settings.quiz_direction}
        shuffle={settings.shuffle_rounds}
        accent={settings.tts_accent}
        nextHref="/study/new"
        completed={plan.completed.includes(groupIndex)}
        allGroupsDone={isPlanComplete(plan)}
      />
    </>
  );
}
