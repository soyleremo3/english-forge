import Link from "next/link";
import { DevToolsPanel } from "@/components/dev/dev-tools-panel";
import { tr } from "@/i18n/tr";

export default function MePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{tr.me.title}</h1>
      <Link
        href="/me/settings"
        className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:bg-surface-hover"
      >
        <span>
          <span className="block font-medium">{tr.me.settings}</span>
          <span className="block text-sm text-muted">{tr.me.settingsHint}</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <DevToolsPanel />
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
