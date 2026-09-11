"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const { error: authError } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setSubmitting(false);
      return;
    }
    router.push("/select-tenant");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="tu@correo.com"
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
      <label className="text-sm font-medium" htmlFor="password">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
