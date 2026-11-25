import { Suspense } from "react";
import { DevClockBanner } from "@/components/dev/dev-tools-panel";
import { Celebration } from "@/components/today/celebration";
import { ProgressRing } from "@/components/today/progress-ring";
import { TaskList } from "@/components/today/task-list";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { loadToday } from "@/lib/study-days";

// Bugün ekranı (SPEC 4): seri, ilerleme halkası, XP, seviye ve dört görev.
export default function TodayPage({ searchParams }: { searchParams: Promise<{ celebrate?: string }> }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-accent">{tr.app.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr.today.title}</h1>
      </header>
      <Suspense fallback={<p className="text-muted">{tr.today.loading}</p>}>
        <TodayContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TodayContent({ searchParams }: { searchParams: Promise<{ celebrate?: string }> }) {
  const [{ celebrate }, { supabase, userId, now }] = await Promise.all([searchParams, requireUser()]);
  const today = await loadToday(supabase, userId, now);
  const { streak, progress, level, totalXp, day } = today;
  const showCelebration = celebrate === "1" && day.completed_at !== null;

  return (
    <>
      <DevClockBanner />
      {showCelebration && <Celebration streak={streak.current} xpToday={day.xp} />}

      <section className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-5">
        <ProgressRing done={progress.done} total={progress.total} />
        <dl className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{tr.today.streak}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {streak.current > 0 ? (
                <>
                  <span aria-hidden="true">🔥 </span>
                  {tr.today.streakDays(streak.current)}
                </>
              ) : (
                <span className="text-base text-muted">{tr.today.streakStart}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{tr.today.xp}</dt>
            <dd className="text-xl font-semibold tabular-nums">{totalXp}</dd>
            {day.xp > 0 && <dd className="text-xs text-success">{tr.today.xpToday(day.xp)}</dd>}
          </div>
          <div>
            <dt className="text-xs text-muted">{tr.today.level}</dt>
            <dd className="text-xl font-semibold tabular-nums">{level.level}</dd>
            <dd className="mt-1">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-label={tr.today.level}
                aria-valuemin={level.levelStartXp}
                aria-valuemax={level.nextLevelXp}
                aria-valuenow={totalXp}
              >
                <div className="h-full bg-accent" style={{ width: `${Math.round(level.progress * 100)}%` }} />
              </div>
              <span className="text-xs text-muted tabular-nums">
                {tr.today.levelNext(totalXp, level.nextLevelXp)}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {progress.complete && !showCelebration && (
        <p className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          ✓ {tr.today.dayDone}
        </p>
      )}

      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="mb-3 text-lg font-semibold">
          {tr.today.tasksTitle}
        </h2>
        <TaskList views={today.views} required={today.settings.required_tasks} />
      </section>
    </>
  );
}
