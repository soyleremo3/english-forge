import { tr } from "@/i18n/tr";

// Günlük ilerleme halkası: tamamlanan / zorunlu görevler (SPEC 4).
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 112;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(done / total, 1) : 0;
  const complete = total > 0 && done >= total;

  return (
    <div
      role="img"
      aria-label={tr.today.progressLabel(done, total)}
      className="relative size-28 shrink-0"
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className={`transition-[stroke-dashoffset] duration-500 ${complete ? "stroke-success" : "stroke-accent"}`}
        />
      </svg>
      <div className="absolute inset-3 flex flex-col items-center justify-center text-center">
        <span className="text-2xl leading-none font-semibold tabular-nums">
          {tr.today.progressValue(done, total)}
        </span>
        <span className="mt-1 text-[11px] leading-tight text-muted">{tr.today.progressShort}</span>
      </div>
    </div>
  );
}
