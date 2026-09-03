import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Crear cuenta · BarberDesk" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-sm opacity-70">
          Después de registrarte podrás dar de alta tu barbería.
        </p>
      </div>

      {signupEnabled ? (
        <SignupForm />
      ) : (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          El registro está cerrado. Pide a un administrador que te invite.
        </p>
      )}

      <p className="text-sm opacity-70">
        ¿Ya tienes cuenta?{" "}
        <Link className="underline" href="/login">
          Entrar
        </Link>
      </p>
    </main>
  );
}
