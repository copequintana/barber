import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/guards";
import { getMembershipsWithTenant } from "@/lib/tenancy";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Crear barbería · BarberDesk" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await getMembershipsWithTenant(user.id);

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
