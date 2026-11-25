import Link from "next/link";
import { Suspense } from "react";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/study-days";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <Link href="/me" className="text-sm text-accent hover:underline">
        ← {tr.settings.back}
      </Link>
      <h1 className="text-2xl font-semibold">{tr.settings.title}</h1>
      <Suspense fallback={<p className="text-muted">{tr.today.loading}</p>}>
        <SettingsLoader />
      </Suspense>
    </div>
  );
}

async function SettingsLoader() {
  const { supabase, userId } = await requireUser();
  const settings = await loadSettings(supabase, userId);
  return <SettingsForm initial={settings} />;
}
