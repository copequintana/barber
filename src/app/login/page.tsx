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
        signupEnabled ? (
          <p>
            ¿No tienes cuenta?{" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href="/signup">
              Crea tu cuenta
            </Link>
          </p>
        ) : null
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
