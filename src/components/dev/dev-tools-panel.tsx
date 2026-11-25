import { Suspense } from "react";
import { devAdvanceDay, devResetClock, devResetToday } from "@/app/(app)/me/dev-actions";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { getDayOffset } from "@/lib/dev/clock";
import { isDevToolsEnabled, isTestEmail } from "@/lib/dev/dev-tools";
import { getStudyDate } from "@/lib/time";

const T = tr.devTools;

// Yalnızca `next dev`'de çizilir. Production'da null döner; action'lar da ayrıca korunur.
export function DevToolsPanel() {
  if (!isDevToolsEnabled()) return null;
  return (
    <section
      aria-labelledby="dev-tools-title"
      className="space-y-3 rounded-2xl border-2 border-dashed border-warning/60 p-5"
    >
      <h2 id="dev-tools-title" className="font-semibold text-warning">
        {T.title}
      </h2>
      <p className="text-sm text-muted">{T.hint}</p>
      <Suspense fallback={null}>
        <DevToolsBody />
      </Suspense>
    </section>
  );
}

async function DevToolsBody() {
  const { now, email } = await requireUser();
  const offset = await getDayOffset();
  const isTest = isTestEmail(email);
  const button =
    "rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover";

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm ${
          isTest ? "bg-warning/15" : "bg-danger/15"
        }`}
      >
        <span className="text-muted">{T.signedInAs}</span>
        <span className="font-medium break-all">{email ?? "?"}</span>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${
            isTest ? "bg-warning text-black" : "bg-danger text-white"
          }`}
        >
          {isTest ? T.testBadge : T.realBadge}
        </span>
      </div>
      {!isTest && <p className="text-xs text-danger">{T.realWarning}</p>}
      <p className="text-sm tabular-nums">
        {T.studyDate(getStudyDate(now))}
        {offset > 0 && <span className="ml-2 font-medium text-warning">{T.offset(offset)}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={devResetToday}>
          <button type="submit" className={button}>
            {T.resetToday}
          </button>
        </form>
        <form action={devAdvanceDay}>
          <button type="submit" className={button}>
            {T.advanceDay}
          </button>
        </form>
        {offset > 0 && (
          <form action={devResetClock}>
            <button type="submit" className={button}>
              {T.resetClock}
            </button>
          </form>
        )}
      </div>
      <p className="text-xs text-muted">{T.resetTodayHint}</p>
    </>
  );
}

/** Tarih kaydırılmışsa Bugün ekranında uyarı şeridi (yalnızca geliştirmede). */
export async function DevClockBanner() {
  if (!isDevToolsEnabled()) return null;
  const offset = await getDayOffset();
  if (offset === 0) return null;
  const { now } = await requireUser();
  return (
    <p className="rounded-xl border border-dashed border-warning/60 px-4 py-2 text-sm text-warning">
      {T.banner(getStudyDate(now), offset)}
    </p>
  );
}
