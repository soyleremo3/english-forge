import { Suspense } from "react";
import { tr } from "@/i18n/tr";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium text-accent">{tr.app.name}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tr.auth.title}</h1>
      <p className="mt-2 mb-6 text-muted">{tr.auth.subtitle}</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
