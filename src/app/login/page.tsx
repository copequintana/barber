import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · BarberDesk" };

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">BarberDesk</h1>
        <p className="text-sm opacity-70">Entra para administrar tu barbería.</p>
      </div>

      <LoginForm />

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
