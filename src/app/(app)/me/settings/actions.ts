"use server";

import { requireUser } from "@/lib/auth/current-user";
import { parseSettingsForm, type Settings, type SettingsFieldErrors } from "@/lib/settings";
import { saveSettings } from "@/lib/study-days";

export type SettingsFormState =
  | { status: "idle" }
  | { status: "saved"; settings: Settings }
  | { status: "invalid"; errors: SettingsFieldErrors }
  | { status: "error" };

export async function saveSettingsAction(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = parseSettingsForm(formData);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const { supabase, userId } = await requireUser();
  try {
    await saveSettings(supabase, userId, parsed.settings);
  } catch {
    return { status: "error" };
  }
  return { status: "saved", settings: parsed.settings };
}
