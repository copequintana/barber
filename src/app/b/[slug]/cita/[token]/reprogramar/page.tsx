import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { BookingHeader } from "@/components/booking/page-header";
import { getAppointmentByToken } from "@/lib/booking";
import { getBarberWeekdays } from "@/lib/catalog";
import { getTenantBySlug } from "@/lib/tenancy";
import { longDateEs, utcToZoned } from "@/lib/time";
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
  const weekdays = await getBarberWeekdays(tenant.id, appt.barberId);
  const current = utcToZoned(tenant.timezone, appt.startsAt);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-6">
      <BookingHeader
        backHref={`/b/${slug}/cita/${token}`}
        backLabel="Volver a mi cita"
        eyebrow={tenant.name}
        title="Cambiar horario"
      />

      <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-card">
        <p className="eyebrow">Ahora</p>
        <p className="font-medium">
          {longDateEs(current)} · <span className="font-num">{current.toFormat("HH:mm")}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {appt.serviceName} con {appt.barberName} · elige el nuevo horario con el mismo barbero
        </p>
      </div>

      <ReschedulePicker
        slug={slug}
        token={token}
        serviceId={appt.serviceId}
        barberId={appt.barberId}
        weekdays={weekdays}
        timezone={tenant.timezone}
        todayISO={todayISO}
        maxAdvanceDays={tenant.maxAdvanceDays}
      />
    </main>
  );
}
