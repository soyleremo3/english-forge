import { tr } from "@/i18n/tr";

// Bugün ekranı iskeleti (SPEC bölüm 4). Veriler sonraki adımlarda bağlanacak.
const tasks = [
  tr.today.tasks.review,
  tr.today.tasks.newWords,
  tr.today.tasks.dailyTest,
  tr.today.tasks.sentences,
];

const stats = [
  { label: tr.today.streak, value: "—" },
  { label: tr.today.progress, value: "0 / 4" },
  { label: tr.today.xp, value: "—" },
  { label: tr.today.level, value: "—" },
];

export default function TodayPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-accent">{tr.app.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {tr.today.title}
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="text-lg font-semibold">
          {tr.today.tasksTitle}
        </h2>
        <ol className="mt-3 space-y-2">
          {tasks.map((task, i) => (
            <li
              key={task}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {i + 1}
              </span>
              <span className="flex-1 font-medium">{task}</span>
              <span className="text-xs text-muted">{tr.today.taskPending}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
