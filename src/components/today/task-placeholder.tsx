import Link from "next/link";
import { Suspense } from "react";
import { completeTaskTemporary } from "@/app/(app)/actions";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import type { TaskKey } from "@/lib/settings";
import { loadToday } from "@/lib/study-days";

// Görev ekranları yapılana kadar her görev rotasında gösterilen iskelet.
// Durumu ve sayacı gösterir; geçici "tamamlandı" butonuyla akış uçtan uca denenebilir.
export function TaskPlaceholder({ taskKey }: { taskKey: TaskKey }) {
  return (
    <section className="space-y-4">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← {tr.taskPage.back}
      </Link>
      <h1 className="text-2xl font-semibold">{tr.today.tasks[taskKey]}</h1>
      <p className="text-muted">{tr.today.taskHints[taskKey]}</p>
      <Suspense fallback={<p className="text-muted">{tr.today.loading}</p>}>
        <TaskState taskKey={taskKey} />
      </Suspense>
    </section>
  );
}

async function TaskState({ taskKey }: { taskKey: TaskKey }) {
  const { supabase, userId, now } = await requireUser();
  const today = await loadToday(supabase, userId, now);
  const view = today.views.find((v) => v.key === taskKey);
  if (!view) return null;

  if (view.status === "locked") {
    return <p className="rounded-xl bg-surface-hover p-4">{tr.taskPage.locked}</p>;
  }
  if (view.status === "done") {
    return <p className="rounded-xl bg-success/10 p-4 font-medium text-success">✓ {tr.taskPage.alreadyDone}</p>;
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <p>{tr.taskPage.comingSoon}</p>
      {view.total !== null && (
        <p className="text-sm text-muted tabular-nums">{tr.today.counter(view.count, view.total)}</p>
      )}
      <form action={completeTaskTemporary}>
        <input type="hidden" name="task" value={taskKey} />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {tr.taskPage.tempComplete}
        </button>
      </form>
      <p className="text-xs text-muted">{tr.taskPage.tempHint}</p>
    </div>
  );
}
