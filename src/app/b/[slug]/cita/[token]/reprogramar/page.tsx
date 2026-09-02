import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { getAppointmentByToken } from "@/lib/booking";
import { getTenantBySlug } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";
import { ReschedulePicker } from "./picker";

export const metadata = { title: "Reprogramar cita · BarberDesk" };

export default async function ReprogramarPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const appt = await getAppointmentByToken(tenant.id, token);
  if (!appt) notFound();
  if (!appt.cancelable) redirect(`/b/${slug}/cita/${token}?error=1`);

  const todayISO = DateTime.now().setZone(tenant.timezone).toISODate()!;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-8">
      <div>
        <Link
          href={`/b/${slug}/cita/${token}`}
          className="text-sm underline opacity-70"
        >
          ← Mi cita
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Cambiar horario</h1>
        <p className="text-sm opacity-70">
          {appt.serviceName} con {appt.barberName} · actualmente{" "}
          {formatZoned(tenant.timezone, appt.startsAt)}. Elige el nuevo
          horario (mismo barbero).
        </p>
      </div>

      <ReschedulePicker
        slug={slug}
        token={token}
        serviceId={appt.serviceId}
        barberId={appt.barberId}
        timezone={tenant.timezone}
        todayISO={todayISO}
        maxAdvanceDays={tenant.maxAdvanceDays}
      />
    </main>
  );
}
