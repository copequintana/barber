import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { getMembershipsWithTenant } from "@/lib/tenancy";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Crear barbería · BarberDesk" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await getMembershipsWithTenant(user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Crea tu barbería</h1>
        <p className="text-sm opacity-70">
          Después podrás agregar barberos, servicios y horarios.
        </p>
      </div>
      <OnboardingForm />
      {memberships.length > 0 ? (
        <p className="text-sm">
          <Link className="underline" href="/select-tenant">
            ← Volver a mis barberías
          </Link>
        </p>
      ) : null}
    </main>
  );
}
