import { PlaceholderPage } from "@/components/placeholder-page";
import { tr } from "@/i18n/tr";

export default function MePage() {
  return (
    <div className="space-y-6">
      <PlaceholderPage title={tr.nav.me} />
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
        >
          {tr.auth.signOut}
        </button>
      </form>
    </div>
  );
}
