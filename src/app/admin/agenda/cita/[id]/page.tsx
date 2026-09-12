import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Check } from "lucide-react";
import { DateTimeInput } from "@/components/date-time-input";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";
import {
  cancelAppointment,
  moveAppointment,
  setAppointmentOutcome,
} from "../../actions";

export const metadata = { title: "Cita · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export default async function CitaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;
  const { error, ok } = await searchParams;

  const data = await withTenant(ctx.tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id },
      include: { customer: true, service: true, barber: true },
    });
    if (!appt) return null;
    const barbers = await tx.barber.findMany({
      where: { active: true, services: { some: { serviceId: appt.serviceId } } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    });
    return { appt, barbers };
  });
  if (!data) notFound();
  const { appt, barbers } = data;

  const editable = appt.status === "pending" || appt.status === "confirmed";
  const startLocal = DateTime.fromJSDate(appt.startsAt, { zone: "utc" })
    .setZone(tenant.timezone)
    .toFormat("yyyy-MM-dd'T'HH:mm");
  const dayISO = startLocal.slice(0, 10);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <Link
          href={`/admin/agenda?date=${dayISO}`}
          className="text-sm underline opacity-70"
        >
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{appt.service.name}</h1>
        <p className="text-sm opacity-70">
          {formatZoned(tenant.timezone, appt.startsAt)} · {appt.barber.displayName}
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Cambios guardados.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
        <p>
          <span className="opacity-60">Cliente:</span>{" "}
          <Link
            href={`/admin/customers/${appt.customerId}`}
            className="font-medium underline"
          >
            {appt.customer.name}
          </Link>{" "}
          · {appt.customer.phone}
        </p>
        <p>
          <span className="opacity-60">Precio:</span> $
          {Number(appt.priceAtBooking)}
        </p>
        <p>
          <span className="opacity-60">Estado:</span>{" "}
          {STATUS_LABEL[appt.status] ?? appt.status}
          {appt.status === "cancelled" && appt.cancelledBy ? (
            <span className="opacity-70">
              {" "}
              ({appt.cancelledBy === "customer"
                ? "canceló el cliente"
                : "canceló la barbería"}
              {appt.cancelReason ? `: ${appt.cancelReason}` : ""})
            </span>
          ) : null}
        </p>
        {appt.notes ? (
          <p>
            <span className="opacity-60">Notas:</span> {appt.notes}
          </p>
        ) : null}
      </div>

      {editable ? (
        <>
          <div className="flex gap-2">
            <form action={setAppointmentOutcome.bind(null, appt.id, "completed")}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
              >
                <Check className="h-4 w-4" /> Completada
              </button>
            </form>
            <form action={setAppointmentOutcome.bind(null, appt.id, "no_show")}>
              <button
                type="submit"
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400"
              >
                No asistió
              </button>
            </form>
          </div>

          <form
            action={moveAppointment.bind(null, appt.id)}
            className="flex flex-col gap-3"
          >
            <h2 className="text-lg font-semibold">Mover cita</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="startLocal">
                  Nueva fecha y hora
                </label>
                <DateTimeInput
                  id="startLocal"
                  name="startLocal"
                  type="datetime-local"
                  required
                  defaultValue={startLocal}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" htmlFor="barberId">
                  Barbero
                </label>
                <select
                  id="barberId"
                  name="barberId"
                  required
                  defaultValue={appt.barberId}
                  className={inputClass}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Mover
            </button>
          </form>

          <form
            action={cancelAppointment.bind(null, appt.id)}
            className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15"
          >
            <h2 className="text-lg font-semibold">Cancelar cita</h2>
            <input
              name="reason"
              maxLength={200}
              placeholder="Motivo (opcional)"
              className={inputClass}
            />
            <button
              type="submit"
              className="self-start rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400"
            >
              Cancelar cita
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
