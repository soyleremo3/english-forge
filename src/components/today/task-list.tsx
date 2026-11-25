import Link from "next/link";
import { tr } from "@/i18n/tr";
import type { TaskKey } from "@/lib/settings";
import type { TaskStatus, TaskView } from "@/lib/today/tasks";

const STATUS_STYLES: Record<TaskStatus, string> = {
  done: "bg-success/15 text-success",
  in_progress: "bg-warning/15 text-warning",
  pending: "bg-surface-hover text-muted",
  locked: "bg-surface-hover text-muted",
};

function counterText(view: TaskView): string | null {
  if (view.key === "review" && view.auto) return tr.today.reviewNone;
  if (view.key === "daily_test" && view.status === "locked") return tr.today.dailyTestLockedHint;
  if (view.total === null) return null;
  return tr.today.counter(Math.min(view.count, view.total), view.total);
}

export function TaskList({
  views,
  required,
}: {
  views: readonly TaskView[];
  required: readonly TaskKey[];
}) {
  return (
    <ol className="space-y-2">
      {views.map((view, i) => {
        const locked = view.status === "locked";
        const counter = counterText(view);
        const content = (
          <>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                view.status === "done" ? "bg-success text-white" : "bg-accent-soft text-accent"
              }`}
              aria-hidden="true"
            >
              {view.status === "done" ? "✓" : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{tr.today.tasks[view.key]}</span>
                {!required.includes(view.key) && (
                  <span className="text-xs text-muted">{tr.today.optional}</span>
                )}
              </span>
              <span className="block text-sm text-muted">
                {counter ?? tr.today.taskHints[view.key]}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[view.status]}`}>
              {tr.today.status[view.status]}
            </span>
          </>
        );

        const base = "flex items-center gap-3 rounded-xl border border-border bg-surface p-4";
        return (
          <li key={view.key}>
            {locked ? (
              <div className={`${base} opacity-70`} aria-disabled="true">
                {content}
              </div>
            ) : (
              <Link href={view.href} className={`${base} hover:bg-surface-hover`}>
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
