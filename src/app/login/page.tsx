import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · BarberDesk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");
  const { ok } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <div className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <h1 className="text-2xl font-bold">BarberDesk</h1>
        </div>
        <p className="text-sm opacity-70">Entra para administrar tu barbería.</p>
      </div>

      {ok === "password" ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Contraseña guardada. Ya puedes entrar.
        </p>
      ) : null}

      <LoginForm />

      <p className="text-sm opacity-70">
        <Link className="underline" href="/reset-password">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      {signupEnabled ? (
        <p className="text-sm opacity-70">
          ¿No tienes cuenta?{" "}
          <Link className="underline" href="/signup">
            Crea tu cuenta
          </Link>
        </p>
      ) : null}
    </main>
  );
}
