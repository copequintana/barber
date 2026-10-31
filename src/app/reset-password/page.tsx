import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Restablecer contraseña · BarberDesk" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");
  const { token } = await searchParams;

  return (
    <AuthShell
      title={token ? "Elige tu contraseña" : "Restablecer contraseña"}
      description={
        token
          ? "Escribe la contraseña nueva para tu cuenta."
          : "Te mandamos un link a tu correo para elegir una contraseña nueva."
      }
      footer={
        <Link className="font-medium text-foreground underline underline-offset-4" href="/login">
          Volver a entrar
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
