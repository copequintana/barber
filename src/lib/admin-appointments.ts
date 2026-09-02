import { DateTime } from "luxon";
import { isOverlapError, withTenant } from "./db";
import { getTenantById } from "./tenancy";
import { localInputToUtc } from "./time";

/**
 * Operaciones de agenda del staff (T11).
 *
 * A diferencia del flujo público, el staff NO está sujeto a grilla ni a
 * antelación mínima (un walk-in se registra "ahora mismo"). La única regla
 * inviolable sigue siendo el constraint anti-solape de la BD: cualquier
 * choque regresa `overlap` tipado.
 */

export type AdminApptError =
  | "invalid_input"
  | "not_found"
  | "overlap"
  | "not_editable"; // estados finales no se mueven/cancelan

export type AdminApptResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: AdminApptError };

export async function adminCreateAppointment(input: {
  tenantId: string;
  barberId: string;
  serviceId: string;
  customer: { name: string; phone: string };
  /** Fecha y hora de pared del tenant, formato datetime-local */
  startLocal: string;
  notes?: string;
}): Promise<AdminApptResult> {
  const tenant = await getTenantById(input.tenantId);
  if (!tenant) return { ok: false, error: "not_found" };

  const startsAt = localInputToUtc(tenant.timezone, input.startLocal);
  const name = input.customer.name.trim();
  const phone = input.customer.phone.trim();
  if (!startsAt || name.length < 2 || phone.length < 7) {
    return { ok: false, error: "invalid_input" };
  }

  try {
    return await withTenant(input.tenantId, async (tx) => {
      const barberService = await tx.barberService.findUnique({
        where: {
          barberId_serviceId: {
            barberId: input.barberId,
            serviceId: input.serviceId,
          },
        },
        include: { service: true, barber: true },
      });
      if (!barberService || !barberService.barber.active) {
        return { ok: false as const, error: "not_found" as const };
      }
      const { service } = barberService;
      const endsAt = new Date(
        startsAt.getTime() + (service.durationMin + service.bufferMin) * 60_000,
      );

      const customer = await tx.customer.upsert({
        where: { tenantId_phone: { tenantId: input.tenantId, phone } },
        update: { name },
        create: { tenantId: input.tenantId, name, phone },
      });

      const appt = await tx.appointment.create({
        data: {
          tenantId: input.tenantId,
          barberId: input.barberId,
          customerId: customer.id,
          serviceId: input.serviceId,
          startsAt,
          endsAt,
          status: "confirmed",
          priceAtBooking: barberService.priceOverride ?? service.price,
          notes: input.notes?.trim() || null,
        },
      });
      return { ok: true as const, appointmentId: appt.id };
    });
  } catch (e) {
    if (isOverlapError(e)) return { ok: false, error: "overlap" };
    throw e;
  }
}

export async function adminMoveAppointment(input: {
  tenantId: string;
  appointmentId: string;
  startLocal: string;
  /** Cambiar de barbero al mover (opcional) */
  barberId?: string;
}): Promise<AdminApptResult> {
  const tenant = await getTenantById(input.tenantId);
  if (!tenant) return { ok: false, error: "not_found" };

  const startsAt = localInputToUtc(tenant.timezone, input.startLocal);
  if (!startsAt) return { ok: false, error: "invalid_input" };

  try {
    return await withTenant(input.tenantId, async (tx) => {
      const appt = await tx.appointment.findUnique({
        where: { id: input.appointmentId },
        include: { service: true },
      });
      if (!appt) return { ok: false as const, error: "not_found" as const };
      if (appt.status !== "pending" && appt.status !== "confirmed") {
        return { ok: false as const, error: "not_editable" as const };
      }

      const barberId = input.barberId ?? appt.barberId;
      if (barberId !== appt.barberId) {
        const offered = await tx.barberService.findUnique({
          where: {
            barberId_serviceId: { barberId, serviceId: appt.serviceId },
          },
        });
        if (!offered) return { ok: false as const, error: "not_found" as const };
      }

      const endsAt = new Date(
        startsAt.getTime() +
          (appt.service.durationMin + appt.service.bufferMin) * 60_000,
      );
      await tx.appointment.update({
        where: { id: appt.id },
        data: { startsAt, endsAt, barberId },
      });
      // Los recordatorios se re-emiten para el nuevo horario
      await tx.notification.deleteMany({
        where: {
          appointmentId: appt.id,
          type: { in: ["reminder_24h", "reminder_2h", "reschedule"] },
        },
      });
      return { ok: true as const, appointmentId: appt.id };
    });
  } catch (e) {
    if (isOverlapError(e)) return { ok: false, error: "overlap" };
    throw e;
  }
}

export async function adminCancelAppointment(input: {
  tenantId: string;
  appointmentId: string;
  reason?: string;
}): Promise<AdminApptResult> {
  return withTenant(input.tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
    });
    if (!appt) return { ok: false as const, error: "not_found" as const };
    if (appt.status !== "pending" && appt.status !== "confirmed") {
      return { ok: false as const, error: "not_editable" as const };
    }
    await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: "cancelled",
        cancelledBy: "shop",
        cancelReason: input.reason?.trim() || null,
      },
    });
    return { ok: true as const, appointmentId: appt.id };
  });
}

/** Marca el desenlace de una cita: completada o no-show (T14). */
export async function adminSetAppointmentOutcome(input: {
  tenantId: string;
  appointmentId: string;
  outcome: "completed" | "no_show";
}): Promise<AdminApptResult> {
  return withTenant(input.tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
    });
    if (!appt) return { ok: false as const, error: "not_found" as const };
    if (appt.status !== "pending" && appt.status !== "confirmed") {
      return { ok: false as const, error: "not_editable" as const };
    }
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: input.outcome },
    });
    return { ok: true as const, appointmentId: appt.id };
  });
}

// ── Datos para la grilla de agenda ──────────────────────────────────

export type AgendaAppointment = {
  id: string;
  barberId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  customerName: string;
  customerId: string;
  serviceName: string;
};

export type AgendaTimeOff = {
  id: string;
  barberId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export type AgendaData = {
  barbers: { id: string; displayName: string }[];
  appointments: AgendaAppointment[];
  timeOff: AgendaTimeOff[];
  workingHours: { barberId: string; weekday: number; startMin: number; endMin: number }[];
};

/** Carga todo lo visible en la agenda para un rango de días locales. */
export async function getAgendaData(
  tenantId: string,
  timezone: string,
  fromDateISO: string,
  days: number,
): Promise<AgendaData | null> {
  const from = DateTime.fromISO(fromDateISO, { zone: timezone });
  if (!from.isValid) return null;
  const windowStart = from.startOf("day").toUTC().toJSDate();
  const windowEnd = from.startOf("day").plus({ days }).toUTC().toJSDate();

  return withTenant(tenantId, async (tx) => {
    const barbers = await tx.barber.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    });
    const barberIds = barbers.map((b) => b.id);
    const appointments = await tx.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        status: { not: "cancelled" },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
      include: { customer: true, service: true },
      orderBy: { startsAt: "asc" },
    });
    const timeOff = await tx.timeOff.findMany({
      where: {
        barberId: { in: barberIds },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
    });
    const workingHours = await tx.workingHour.findMany({
      where: { barberId: { in: barberIds } },
    });

    return {
      barbers,
      appointments: appointments.map((a) => ({
        id: a.id,
        barberId: a.barberId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        customerName: a.customer.name,
        customerId: a.customerId,
        serviceName: a.service.name,
      })),
      timeOff: timeOff.map((t) => ({
        id: t.id,
        barberId: t.barberId,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        reason: t.reason,
      })),
      workingHours: workingHours.map((w) => ({
        barberId: w.barberId,
        weekday: w.weekday,
        startMin: w.startMin,
        endMin: w.endMin,
      })),
    };
  });
}
