"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthError } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

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
      <Notice tone="success">
        Si ese correo tiene una cuenta, te llegará un link para elegir
        contraseña.
      </Notice>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@correo.com"
          />
        </Field>
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Spinner /> Enviando…
            </>
          ) : (
            "Mandar link"
          )}
        </Button>
      </FieldGroup>
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
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="password">Contraseña nueva</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">Repite la contraseña</FieldLabel>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        {error ? <AuthError>{error}</AuthError> : null}
        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? (
            <>
              <Spinner /> Guardando…
            </>
          ) : (
            "Guardar contraseña"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
