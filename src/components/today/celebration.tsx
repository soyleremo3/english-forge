import Link from "next/link";
import { tr } from "@/i18n/tr";

// Basit kutlama kartı. Konfeti ve gün özeti adım 7'de eklenecek (SPEC 4).
export function Celebration({ streak, xpToday }: { streak: number; xpToday: number }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-success/40 bg-success/10 p-5"
    >
      <p className="text-3xl" aria-hidden="true">
        🎉
      </p>
      <h2 className="mt-2 text-xl font-semibold">{tr.celebration.title}</h2>
      <p className="mt-1">{tr.celebration.body(streak)}</p>
      <p className="mt-1 text-sm text-muted">{tr.celebration.xp(xpToday)}</p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white"
      >
        {tr.celebration.close}
      </Link>
    </section>
  );
}
