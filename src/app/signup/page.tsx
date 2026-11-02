import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { MessageCircle } from "lucide-react";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { demoRequestUrl } from "@/lib/sales-contact";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Crear cuenta · BarberDesk" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.user) redirect("/select-tenant");
  const demoUrl = demoRequestUrl();

  return (
    <AuthShell
      title={signupEnabled ? "Crear cuenta" : "Pide tu demo"}
      description={signupEnabled ? "Después de registrarte das de alta tu barbería." : "Las cuentas de BarberDesk se crean después de una demo."}
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
        <div className="flex flex-col gap-4">
          <Notice>
            Te mostramos BarberDesk funcionando en tu celular con una barbería de ejemplo. Si te convence, damos de alta tu barbería y te llega un
            correo para crear tu contraseña.
          </Notice>
          {demoUrl ? (
            <Button asChild size="lg" className="w-full">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Pide tu demo por WhatsApp
              </a>
            </Button>
          ) : (
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/">Conoce BarberDesk</Link>
            </Button>
          )}
        </div>
      )}
    </AuthShell>
  );
}
