import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Crear cuenta · BarberDesk" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");

  return (
    <AuthShell
      title="Crear cuenta"
      description="Después de registrarte das de alta tu barbería."
      footer={
        <p>
          ¿Ya tienes cuenta?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
            Entrar
          </Link>
        </p>
      }
    >
      {signupEnabled ? (
        <SignupForm />
      ) : (
        <Notice tone="warning">
          El registro está cerrado. Pide a un administrador que te invite.
        </Notice>
      )}
    </AuthShell>
  );
}
