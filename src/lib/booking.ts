import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { getDayAvailability } from "./availability";
import { isOverlapError, withTenant } from "./db";
import { getTenantById } from "./tenancy";

/**
 * Creación y cancelación de reservas (T10).
 *
 * La hora elegida NUNCA se acepta tal cual: se revalida contra el motor de
 * disponibilidad (horarios, bloqueos, antelaciones) y, aun así, la última
 * palabra la tiene el constraint EXCLUDE de la BD — si dos requests ganan la
 * validación a la vez, una recibirá `slot_taken`.
 */

export type BookingError =
  | "invalid_input"
  | "not_found" // tenant/servicio/barbero inexistente o inactivo
  | "slot_taken" // el horario dejó de estar disponible
  | "outside_window" // fuera de política (cancelación)
  | "suspended"; // tenant suspendido por la plataforma (T20)

export type BookingResult =
  | {
      ok: true;
      appointment: {
        id: string;
        cancelToken: string;
        barberId: string;
        startsAt: Date;
        endsAt: Date;
        priceAtBooking: Prisma.Decimal;
      };
    }
  | { ok: false; error: BookingError };

export async function createBooking(input: {
  tenantId: string;
  serviceId: string;
  /** Barbero elegido, u omitido para "cualquiera" */
  barberId?: string;
  /** Instante UTC del slot elegido (ISO), tal como lo entregó /api/availability */
  startISO: string;
  customer: { name: string; phone: string; email?: string };
  notes?: string;
  now?: Date;
}): Promise<BookingResult> {
  const tenant = await getTenantById(input.tenantId);
  if (!tenant) return { ok: false, error: "not_found" };
  if (tenant.suspended) return { ok: false, error: "suspended" };

  const start = DateTime.fromISO(input.startISO, { zone: "utc" });
  const name = input.customer.name.trim();
  const phone = input.customer.phone.trim();
  if (!start.isValid || name.length < 2 || phone.length < 7) {
    return { ok: false, error: "invalid_input" };
  }

  // Revalidar el slot contra el motor (día local del tenant)
  const dateISO = start.setZone(tenant.timezone).toISODate()!;
  const availability = await getDayAvailability({
    tenantId: input.tenantId,
    serviceId: input.serviceId,
    dateISO,
    barberId: input.barberId,
    now: input.now,
  });
  if (!availability) return { ok: false, error: "not_found" };

  const slot = availability.slots.find(
    (s) => s.start.getTime() === start.toMillis(),
  );
  if (!slot || slot.barberIds.length === 0) {
    return { ok: false, error: "slot_taken" };
  }

  // Candidatos: el barbero pedido, o — en modo "cualquiera" — los libres en
  // orden aleatorio. Si el primero pierde la carrera contra otra reserva
  // simultánea, se intenta con el siguiente antes de rendirse.
  let candidates: string[];
  if (input.barberId) {
    if (!slot.barberIds.includes(input.barberId)) {
      return { ok: false, error: "slot_taken" };
    }
    candidates = [input.barberId];
  } else {
    candidates = [...slot.barberIds].sort(() => Math.random() - 0.5);
  }

  for (const barberId of candidates) {
    const result = await tryCreateAppointment({
      ...input,
      barberId,
      name,
      phone,
      slotStart: slot.start,
      slotEnd: slot.end,
    });
    if (result) return result;
  }
  return { ok: false, error: "slot_taken" };
}

/** Un intento de inserción; null si el constraint anti-solape la rechazó. */
async function tryCreateAppointment(input: {
  tenantId: string;
  serviceId: string;
  barberId: string;
  name: string;
  phone: string;
  customer: { name: string; phone: string; email?: string };
  notes?: string;
  slotStart: Date;
  slotEnd: Date;
}): Promise<Extract<BookingResult, { ok: true }> | null> {
  const { barberId, name, phone } = input;
  try {
    const appointment = await withTenant(input.tenantId, async (tx) => {
      const override = await tx.barberService.findUnique({
        where: { barberId_serviceId: { barberId, serviceId: input.serviceId } },
        include: { service: true },
      });
      if (!override) throw new Error("barber_service_missing");

      const customer = await tx.customer.upsert({
        where: { tenantId_phone: { tenantId: input.tenantId, phone } },
        update: {
          name,
          ...(input.customer.email ? { email: input.customer.email } : {}),
        },
        create: {
          tenantId: input.tenantId,
          name,
          phone,
          email: input.customer.email,
        },
      });

      return tx.appointment.create({
        data: {
          tenantId: input.tenantId,
          barberId,
          customerId: customer.id,
          serviceId: input.serviceId,
          startsAt: input.slotStart,
          endsAt: input.slotEnd, // incluye buffer
          status: "confirmed",
          priceAtBooking: override.priceOverride ?? override.service.price,
          notes: input.notes?.trim() || null,
        },
      });
    });
    return {
      ok: true,
      appointment: {
        id: appointment.id,
        cancelToken: appointment.cancelToken,
        barberId: appointment.barberId,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        priceAtBooking: appointment.priceAtBooking,
      },
    };
  } catch (e) {
    if (isOverlapError(e)) return null; // que el llamador pruebe otro barbero
    if (e instanceof Error && e.message === "barber_service_missing") {
      return null;
    }
    throw e;
  }
}

export type CancelableAppointment = {
  id: string;
  startsAt: Date;
  status: string;
  serviceId: string;
  serviceName: string;
  /** Duración visible del servicio (sin buffer), para .ics y UI */
  durationMin: number;
  barberId: string;
  barberName: string;
  customerName: string;
  /** ¿La política del tenant aún permite cancelar/reprogramar? */
  cancelable: boolean;
};

/**
 * Busca la cita por su cancel token (la URL pública incluye el slug del
 * tenant, necesario para el contexto RLS).
 */
export async function getAppointmentByToken(
  tenantId: string,
  token: string,
  now = new Date(),
): Promise<CancelableAppointment | null> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  const appt = await withTenant(tenantId, (tx) =>
    tx.appointment.findUnique({
      where: { cancelToken: token },
      include: { service: true, barber: true, customer: true },
    }),
  );
  if (!appt) return null;

  const cancelable =
    (appt.status === "confirmed" || appt.status === "pending") &&
    appt.startsAt.getTime() - now.getTime() >=
      tenant.cancelMinMinutes * 60_000;

  return {
    id: appt.id,
    startsAt: appt.startsAt,
    status: appt.status,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    durationMin: appt.service.durationMin,
    barberId: appt.barberId,
    barberName: appt.barber.displayName,
    customerName: appt.customer.name,
    cancelable,
  };
}

/**
 * Reprogramación self-service (T14). Mantiene el mismo barbero y servicio;
 * el nuevo horario se valida con las reglas públicas (grilla, antelación) y
 * el constraint. La cita se ACTUALIZA (nunca cancel+create): si el nuevo
 * horario pierde la carrera, la original queda intacta.
 * Al mover, se borran los recordatorios ya enviados para que el cron los
 * re-emita con el nuevo horario.
 */
export async function rescheduleBookingByToken(
  tenantId: string,
  token: string,
  startISO: string,
  now = new Date(),
): Promise<
  { ok: true; appointmentId: string } | { ok: false; error: BookingError }
> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return { ok: false, error: "not_found" };

  const start = DateTime.fromISO(startISO, { zone: "utc" });
  if (!start.isValid) return { ok: false, error: "invalid_input" };

  const appt = await withTenant(tenantId, (tx) =>
    tx.appointment.findUnique({
      where: { cancelToken: token },
      include: { service: true },
    }),
  );
  if (!appt) return { ok: false, error: "not_found" };
  if (appt.status !== "confirmed" && appt.status !== "pending") {
    return { ok: false, error: "outside_window" };
  }
  if (
    appt.startsAt.getTime() - now.getTime() <
    tenant.cancelMinMinutes * 60_000
  ) {
    return { ok: false, error: "outside_window" };
  }

  const dateISO = start.setZone(tenant.timezone).toISODate()!;
  const availability = await getDayAvailability({
    tenantId,
    serviceId: appt.serviceId,
    dateISO,
    barberId: appt.barberId,
    now,
  });
  const slot = availability?.slots.find(
    (s) => s.start.getTime() === start.toMillis(),
  );
  if (!slot) return { ok: false, error: "slot_taken" };

  try {
    await withTenant(tenantId, async (tx) => {
      await tx.appointment.update({
        where: { id: appt.id },
        data: { startsAt: slot.start, endsAt: slot.end },
      });
      await tx.notification.deleteMany({
        where: {
          appointmentId: appt.id,
          type: { in: ["reminder_24h", "reminder_2h", "reschedule"] },
        },
      });
    });
  } catch (e) {
    if (isOverlapError(e)) return { ok: false, error: "slot_taken" };
    throw e;
  }
  return { ok: true, appointmentId: appt.id };
}

export async function cancelBookingByToken(
  tenantId: string,
  token: string,
  now = new Date(),
): Promise<
  { ok: true; appointmentId: string } | { ok: false; error: BookingError }
> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return { ok: false, error: "not_found" };

  return withTenant(tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { cancelToken: token },
    });
    if (!appt) return { ok: false, error: "not_found" as const };
    if (appt.status !== "confirmed" && appt.status !== "pending") {
      return { ok: false, error: "outside_window" as const };
    }
    if (
      appt.startsAt.getTime() - now.getTime() <
      tenant.cancelMinMinutes * 60_000
    ) {
      return { ok: false, error: "outside_window" as const };
    }
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: "cancelled", cancelledBy: "customer" },
    });
    return { ok: true as const, appointmentId: appt.id };
  });
}
