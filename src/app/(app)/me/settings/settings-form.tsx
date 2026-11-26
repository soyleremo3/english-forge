"use client";

import { useActionState } from "react";
import { tr } from "@/i18n/tr";
import {
  CEFR_OPTIONS,
  QUIZ_DIRECTIONS,
  REVIEW_BUTTON_MODES,
  SETTINGS_LIMITS,
  type Settings,
  type SettingsKey,
  TTS_ACCENTS,
  taskKeys,
} from "@/lib/settings";
import { saveSettingsAction, type SettingsFormState } from "./actions";

const F = tr.settings.fields;
const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base aria-[invalid=true]:border-danger";

export function SettingsForm({ initial }: { initial: Settings }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    saveSettingsAction,
    { status: "idle" },
  );
  const values = state.status === "saved" ? state.settings : initial;
  const errors = state.status === "invalid" ? state.errors : {};

  const errorText = (key: SettingsKey) =>
    errors[key] ? (key === "required_tasks" ? tr.settings.errors.required_tasks : tr.settings.errors.generic) : null;

  const field = (key: SettingsKey, control: React.ReactNode) => {
    const err = errorText(key);
    const hint = F[key].hint;
    return (
      <div className="space-y-1.5">
        <label htmlFor={key} className="block text-sm font-medium">
          {F[key].label}
        </label>
        {control}
        {hint && (
          <p id={`${key}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {err && (
          <p id={`${key}-error`} role="alert" className="text-xs text-danger">
            {err}
          </p>
        )}
      </div>
    );
  };

  const describedBy = (key: SettingsKey) =>
    [F[key].hint ? `${key}-hint` : null, errors[key] ? `${key}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  const numberInput = (
    key: "daily_new" | "group_size" | "min_sentences" | "review_cap" | "desired_retention" | "typed_review_every",
    step = 1,
  ) =>
    field(
      key,
      <input
        id={key}
        name={key}
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        min={SETTINGS_LIMITS[key].min}
        max={SETTINGS_LIMITS[key].max}
        step={step}
        defaultValue={values[key]}
        required
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={describedBy(key)}
        className={inputClass}
      />,
    );

  const checkbox = (key: "ai_enabled" | "journal_ai" | "shuffle_rounds") => (
    <div className="flex items-start gap-3">
      <input
        id={key}
        name={key}
        type="checkbox"
        defaultChecked={values[key]}
        aria-describedby={`${key}-hint`}
        className="mt-1 size-5 accent-[var(--accent)]"
      />
      <div>
        <label htmlFor={key} className="font-medium">
          {F[key].label}
        </label>
        <p id={`${key}-hint`} className="text-xs text-muted">
          {F[key].hint}
        </p>
      </div>
    </div>
  );

  const section = (title: string, children: React.ReactNode) => (
    <fieldset className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <legend className="px-1 text-sm font-semibold text-muted">{title}</legend>
      {children}
    </fieldset>
  );

  // Kaydedilen değerler formu yeniden doldursun diye key ile yeniden oluştur.
  const formKey = state.status === "saved" ? JSON.stringify(state.settings) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      {section(
        tr.settings.sections.words,
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {numberInput("daily_new")}
            {numberInput("group_size")}
          </div>
          {checkbox("shuffle_rounds")}
          {field(
            "quiz_direction",
            <select
              id="quiz_direction"
              name="quiz_direction"
              defaultValue={values.quiz_direction}
              aria-describedby={describedBy("quiz_direction")}
              className={inputClass}
            >
              {QUIZ_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {tr.settings.quizDirections[d]}
                </option>
              ))}
            </select>,
          )}
        </>,
      )}

      {section(
        tr.settings.sections.day,
        <>
          <fieldset
            className="space-y-2"
            aria-describedby={["required_tasks-hint", errors.required_tasks ? "required_tasks-error" : ""].join(" ").trim()}
          >
            <legend className="text-sm font-medium">{F.required_tasks.label}</legend>
            {taskKeys.map((k) => (
              <label key={k} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="required_tasks"
                  value={k}
                  defaultChecked={values.required_tasks.includes(k)}
                  className="size-5 accent-[var(--accent)]"
                />
                <span>{tr.today.tasks[k]}</span>
              </label>
            ))}
            <p id="required_tasks-hint" className="text-xs text-muted">
              {F.required_tasks.hint}
            </p>
            {errors.required_tasks && (
              <p id="required_tasks-error" role="alert" className="text-xs text-danger">
                {tr.settings.errors.required_tasks}
              </p>
            )}
          </fieldset>
          {numberInput("min_sentences")}
        </>,
      )}

      {section(
        tr.settings.sections.review,
        <div className="grid gap-4 sm:grid-cols-2">
          {numberInput("desired_retention", 0.01)}
          {numberInput("review_cap")}
          {field(
            "review_buttons",
            <select id="review_buttons" name="review_buttons" defaultValue={values.review_buttons} className={inputClass}>
              {REVIEW_BUTTON_MODES.map((m) => (
                <option key={m} value={m}>
                  {tr.settings.reviewButtons[m]}
                </option>
              ))}
            </select>,
          )}
          {numberInput("typed_review_every")}
        </div>,
      )}

      {section(
        tr.settings.sections.general,
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            "tts_accent",
            <select id="tts_accent" name="tts_accent" defaultValue={values.tts_accent} className={inputClass}>
              {TTS_ACCENTS.map((a) => (
                <option key={a} value={a}>
                  {tr.settings.ttsAccents[a]}
                </option>
              ))}
            </select>,
          )}
          {field(
            "cefr",
            <select
              id="cefr"
              name="cefr"
              defaultValue={values.cefr}
              aria-describedby={describedBy("cefr")}
              className={inputClass}
            >
              {CEFR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>,
          )}
          {field(
            "ielts_target_date",
            <input
              id="ielts_target_date"
              name="ielts_target_date"
              type="date"
              defaultValue={values.ielts_target_date}
              required
              aria-invalid={errors.ielts_target_date ? true : undefined}
              aria-describedby={describedBy("ielts_target_date")}
              className={inputClass}
            />,
          )}
        </div>,
      )}

      {section(tr.settings.sections.ai, <>{checkbox("ai_enabled")}{checkbox("journal_ai")}</>)}

      <div className="sticky bottom-20 flex items-center gap-3 rounded-2xl bg-background/90 py-2 backdrop-blur md:bottom-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {pending ? tr.settings.saving : tr.settings.save}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.status === "saved" && <span className="text-success">{tr.settings.saved}</span>}
          {state.status === "invalid" && <span className="text-danger">{tr.settings.invalid}</span>}
          {state.status === "error" && <span className="text-danger">{tr.settings.saveError}</span>}
        </p>
      </div>
    </form>
  );
}
