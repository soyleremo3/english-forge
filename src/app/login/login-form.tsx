"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { tr } from "@/i18n/tr";
import {
  type LoginErrorReason,
  type LoginState,
  requestEmailCodeAction,
  signInWithPasswordAction,
  verifyEmailCodeAction,
} from "./actions";

const ERRORS: Record<LoginErrorReason, string> = {
  invalid: tr.auth.invalidEmail,
  private: tr.auth.private,
  credentials: tr.auth.wrongCredentials,
  code: tr.auth.wrongCode,
  rate: tr.auth.rateLimited,
  disabled: tr.auth.codeDisabled,
  failed: tr.auth.failed,
};

const QUERY_ERRORS: Record<string, string> = {
  private: tr.auth.private,
};

const inputClass = "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base";
const primaryButton =
  "w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60";

const idle: LoginState = { status: "idle" };

export function LoginForm({ codeEnabled }: { codeEnabled: boolean }) {
  const [mode, setMode] = useState<"password" | "code">("password");
  return mode === "password" ? (
    <PasswordForm onUseCode={codeEnabled ? () => setMode("code") : undefined} />
  ) : (
    <EmailCodeForm onUsePassword={() => setMode("password")} />
  );
}

function ErrorText({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

function EmailField({ defaultValue, invalid }: { defaultValue?: string; invalid: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="email" className="text-sm font-medium">
        {tr.auth.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        inputMode="email"
        autoCapitalize="off"
        defaultValue={defaultValue}
        placeholder={tr.auth.emailPlaceholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "login-error" : undefined}
        className={inputClass}
      />
    </div>
  );
}

function PasswordForm({ onUseCode }: { onUseCode?: () => void }) {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signInWithPasswordAction, idle);
  const [showPassword, setShowPassword] = useState(false);

  const message =
    state.status === "error" ? ERRORS[state.reason] : QUERY_ERRORS[searchParams.get("error") ?? ""];
  const email = state.status === "error" ? state.email : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <EmailField defaultValue={email} invalid={state.status === "error"} />
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {tr.auth.passwordLabel}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            aria-invalid={state.status === "error" || undefined}
            aria-describedby={message ? "login-error" : undefined}
            className={`${inputClass} pr-24`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm text-muted hover:text-foreground"
          >
            {showPassword ? tr.auth.hidePassword : tr.auth.showPassword}
          </button>
        </div>
      </div>
      <ErrorText id="login-error" message={message} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? tr.auth.signingIn : tr.auth.submit}
      </button>
      {onUseCode && (
        <button type="button" onClick={onUseCode} className="w-full text-sm text-muted underline-offset-4 hover:underline">
          {tr.auth.useCode}
        </button>
      )}
    </form>
  );
}

function EmailCodeForm({ onUsePassword }: { onUsePassword: () => void }) {
  const [requestState, requestAction, requesting] = useActionState(requestEmailCodeAction, idle);
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailCodeAction, idle);

  const sentTo =
    requestState.status === "code-sent"
      ? requestState.email
      : verifyState.status === "error" && verifyState.email
        ? verifyState.email
        : null;

  if (!sentTo) {
    const message = requestState.status === "error" ? ERRORS[requestState.reason] : undefined;
    return (
      <form action={requestAction} className="space-y-4">
        <p className="text-sm text-muted">{tr.auth.codeIntro}</p>
        <EmailField invalid={requestState.status === "error"} />
        <ErrorText id="login-error" message={message} />
        <button type="submit" disabled={requesting} className={primaryButton}>
          {requesting ? tr.auth.sending : tr.auth.sendCode}
        </button>
        <button type="button" onClick={onUsePassword} className="w-full text-sm text-muted underline-offset-4 hover:underline">
          {tr.auth.usePassword}
        </button>
      </form>
    );
  }

  const message = verifyState.status === "error" ? ERRORS[verifyState.reason] : undefined;
  return (
    <form action={verifyAction} className="space-y-4">
      <p role="status" className="rounded-xl bg-accent-soft p-3 text-sm">
        {tr.auth.codeSent(sentTo)}
      </p>
      <input type="hidden" name="email" value={sentTo} />
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-medium">
          {tr.auth.codeLabel}
        </label>
        <input
          id="code"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          autoFocus
          aria-invalid={verifyState.status === "error" || undefined}
          aria-describedby={message ? "login-error" : undefined}
          className={`${inputClass} text-center text-2xl tracking-[0.5em] tabular-nums`}
        />
      </div>
      <ErrorText id="login-error" message={message} />
      <button type="submit" disabled={verifying} className={primaryButton}>
        {verifying ? tr.auth.signingIn : tr.auth.verifyCode}
      </button>
      <button type="button" onClick={onUsePassword} className="w-full text-sm text-muted underline-offset-4 hover:underline">
        {tr.auth.usePassword}
      </button>
    </form>
  );
}
