"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { tr } from "@/i18n/tr";
import { sendMagicLink, type LoginState } from "./actions";

const queryErrors: Record<string, string> = {
  private: tr.auth.private,
  link: tr.auth.linkError,
  profile: tr.auth.profileError,
};

const actionErrors = {
  invalid: tr.auth.invalidEmail,
  private: tr.auth.private,
  rate: tr.auth.rateLimited,
  send: tr.auth.sendError,
} as const;

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    { status: "idle" },
  );

  const queryError = queryErrors[searchParams.get("error") ?? ""];
  const message =
    state.status === "error"
      ? actionErrors[state.reason]
      : state.status === "idle"
        ? queryError
        : undefined;

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-xl bg-accent-soft p-4 text-sm">
        {tr.auth.sent}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {tr.auth.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={tr.auth.emailPlaceholder}
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={message ? "login-message" : undefined}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base"
        />
      </div>
      {message && (
        <p id="login-message" role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? tr.auth.sending : tr.auth.submit}
      </button>
    </form>
  );
}
