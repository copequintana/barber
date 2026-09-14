import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <div className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <h1 className="text-2xl font-bold">BarberDesk</h1>
        </div>
      </div>

      <ResetPasswordForm token={token} />

      <p className="text-sm opacity-70">
        <Link className="underline" href="/login">
          ← Volver a entrar
        </Link>
      </p>
    </main>
  );
}
