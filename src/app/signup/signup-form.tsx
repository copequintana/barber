"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const { error: authError } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (authError) {
      setError(
        authError.message ??
          "No se pudo crear la cuenta. Revisa los datos e intenta de nuevo.",
      );
      setSubmitting(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="name">
        Nombre
      </label>
      <input
        id="name"
        name="name"
        type="text"
        required
        autoComplete="name"
        placeholder="Tu nombre"
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
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
        Contraseña (mínimo 8 caracteres)
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
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
        className="rounded-md bg-foreground px-3 py-2 font-medium text-background disabled:opacity-60"
      >
        {submitting ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
