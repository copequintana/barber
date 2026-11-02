import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
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
    <AuthShell
      title="Entrar"
      description="Administra la agenda de tu barbería."
      footer={
        <p>
          ¿No tienes cuenta?{" "}
          <Link className="font-medium text-foreground underline underline-offset-4" href={signupEnabled ? "/signup" : "/"}>
            {signupEnabled ? "Crea tu cuenta" : "Pide tu demo"}
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        {ok === "password" ? (
          <Notice tone="success">Contraseña guardada. Ya puedes entrar.</Notice>
        ) : null}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
