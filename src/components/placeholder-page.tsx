import { tr } from "@/i18n/tr";

export function PlaceholderPage({
  title,
  laterPhase = false,
}: {
  title: string;
  laterPhase?: boolean;
}) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">
        {laterPhase ? tr.placeholder.laterPhase : tr.placeholder.comingSoon}
      </p>
    </section>
  );
}
