"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

/** Sin token: pide el email para mandar el link. Con token (link del correo): pide la contraseña nueva. */
export function ResetPasswordForm({ token }: { token?: string }) {
  if (token) return <SetPasswordForm token={token} />;
  return <RequestLinkForm />;
}

function RequestLinkForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });
    // Siempre mostramos éxito, exista o no ese email — no revelamos qué
    // correos tienen cuenta.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Si ese correo tiene una cuenta, te llegará un link para elegir
        contraseña.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">Restablecer contraseña</h1>
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
        className={inputClass}
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Mandar link"}
      </button>
    </form>
  );
}

function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    const { error: authError } = await authClient.resetPassword({
      newPassword,
      token,
    });
    if (authError) {
      setError(
        authError.message ??
          "El link ya no es válido — pide uno nuevo.",
      );
      setSubmitting(false);
      return;
    }
    router.push("/login?ok=password");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">Elige tu contraseña</h1>
      <label className="text-sm font-medium" htmlFor="password">
        Contraseña nueva (mínimo 8 caracteres)
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        className={inputClass}
      />
      <label className="text-sm font-medium" htmlFor="confirm">
        Repite la contraseña
      </label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        className={inputClass}
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
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
