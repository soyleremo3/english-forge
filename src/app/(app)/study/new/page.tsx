import Link from "next/link";
import { Suspense } from "react";
import { NewWordsStudy } from "@/components/study/new-words-study";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { ensureNewWordsPlan, loadStudyWords } from "@/lib/new-words";
import { nextGroupIndex } from "@/lib/study/new-words-plan";

// Grup çalışması (SPEC 5.3): günün kelimeleri 8'lik gruplar hâlinde, sıradaki grup.
export default function NewWordsPage() {
  return (
    <section className="space-y-4">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← {tr.study.back}
      </Link>
      <h1 className="text-2xl font-semibold">{tr.study.title}</h1>
      <Suspense fallback={<p className="text-muted">{tr.study.loading}</p>}>
        <NewWordsLoader />
      </Suspense>
    </section>
  );
}

async function NewWordsLoader() {
  const { supabase, userId, now } = await requireUser();
  const { date, settings, plan } = await ensureNewWordsPlan(supabase, userId, now);

  if (plan.groups.length === 0) {
    return <p className="rounded-xl bg-surface-hover p-4">{tr.study.emptyQueue}</p>;
  }

  const groupIndex = nextGroupIndex(plan);
  if (groupIndex === null) {
    return (
      <div className="space-y-3 rounded-2xl bg-success/10 p-5" role="status">
        <p className="text-lg font-semibold text-success">✓ {tr.study.allDone}</p>
        <p className="text-muted">{tr.study.allDoneHint}</p>
        <Link href="/" className="inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
          {tr.study.toToday}
        </Link>
      </div>
    );
  }

  const words = await loadStudyWords(supabase, userId, plan.groups[groupIndex]);
  return (
    <NewWordsStudy
      key={`${date}:${groupIndex}`}
      date={date}
      groupIndex={groupIndex}
      groupCount={plan.groups.length}
      words={words}
      shuffle={settings.shuffle_rounds}
      accent={settings.tts_accent}
    />
  );
}
