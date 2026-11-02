import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, MessageCircle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signupEnabled } from "@/lib/flags";
import { requireUser } from "@/lib/guards";
import { canRunDemos } from "@/lib/platform-guard";
import { demoRequestUrl } from "@/lib/sales-contact";
import { getMembershipsWithTenant } from "@/lib/tenancy";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Crear barbería · BarberDesk" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await getMembershipsWithTenant(user.id);

  if (!signupEnabled) {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, isVendor: true, isPlatformAdmin: true },
    });
    if (profile && canRunDemos(profile)) redirect("/platform/alta");
    if (memberships.length > 0) redirect("/select-tenant");
    const demoUrl = demoRequestUrl();

    async function logout() {
      "use server";
      await signOut({ redirectTo: "/login" });
    }

    return (
      <AuthShell
        title="Tu cuenta no tiene barbería"
        description={`Entraste como ${user.email}.`}
        footer={
          <form action={logout}>
            <button type="submit" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </form>
        }
      >
        <div className="flex flex-col gap-4">
          <Notice>
            Si trabajas en una barbería, pide al dueño que te agregue como barbero. Si tienes una barbería y quieres usar BarberDesk, primero te la
            mostramos y después la damos de alta.
          </Notice>
          {demoUrl ? (
            <Button asChild size="lg" className="w-full">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Pide tu demo
              </a>
            </Button>
          ) : null}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      title="Crea tu barbería"
      description="Después podrás agregar barberos, servicios y horarios."
      footer={
        memberships.length > 0 ? (
          <Link className="font-medium text-foreground underline underline-offset-4" href="/select-tenant">
            Volver a mis barberías
          </Link>
        ) : null
      }
    >
      <OnboardingForm />
    </AuthShell>
  );
}
