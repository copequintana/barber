import { DateTime } from "luxon";
import { withTenant } from "./db";
import { localInputToUtc } from "./time";

/**
 * Panel del barbero (T15). Toda operación verifica que el barbero vinculado
 * al usuario de la sesión sea el dueño del recurso: un barbero solo lee y
 * escribe sobre SUS citas y bloqueos.
 */

export type BarberPanelError =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "not_editable";

export type BarberPanelResult =
  | { ok: true }
  | { ok: false; error: BarberPanelError };

/** El perfil de barbero (activo) vinculado a este usuario en el tenant. */
export function getOwnBarber(tenantId: string, userId: string) {
  return withTenant(tenantId, (tx) =>
    tx.barber.findFirst({ where: { userId, active: true } }),
  );
}

export async function getBarberDay(
  tenantId: string,
  timezone: string,
  barberId: string,
  dateISO: string,
) {
  const day = DateTime.fromISO(dateISO, { zone: timezone });
  if (!day.isValid) return null;
  const start = day.startOf("day").toUTC().toJSDate();
  const end = day.startOf("day").plus({ days: 1 }).toUTC().toJSDate();

  return withTenant(tenantId, async (tx) => {
    const appointments = await tx.appointment.findMany({
      where: {
        barberId,
        status: { not: "cancelled" },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      include: { customer: true, service: true },
      orderBy: { startsAt: "asc" },
    });
    const timeOff = await tx.timeOff.findMany({
      where: { barberId, startsAt: { lt: end }, endsAt: { gt: start } },
      orderBy: { startsAt: "asc" },
    });
    return { appointments, timeOff };
  });
}

export async function barberSetOutcome(input: {
  tenantId: string;
  userId: string;
  appointmentId: string;
  outcome: "completed" | "no_show";
}): Promise<BarberPanelResult> {
  return withTenant(input.tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { barber: true },
    });
    if (!appt) return { ok: false as const, error: "not_found" as const };
    if (appt.barber.userId !== input.userId) {
      return { ok: false as const, error: "forbidden" as const };
    }
    if (appt.status !== "pending" && appt.status !== "confirmed") {
      return { ok: false as const, error: "not_editable" as const };
    }
    await tx.appointment.update({
      where: { id: appt.id },
      data: { status: input.outcome },
    });
    return { ok: true as const };
  });
}

export async function barberBlockSlot(input: {
  tenantId: string;
  userId: string;
  timezone: string;
  startLocal: string;
  minutes: number;
  reason?: string;
}): Promise<BarberPanelResult> {
  const startsAt = localInputToUtc(input.timezone, input.startLocal);
  if (!startsAt || input.minutes < 5 || input.minutes > 24 * 60) {
    return { ok: false, error: "invalid_input" };
  }
  const endsAt = new Date(startsAt.getTime() + input.minutes * 60_000);

  return withTenant(input.tenantId, async (tx) => {
    const barber = await tx.barber.findFirst({
      where: { userId: input.userId, active: true },
    });
    if (!barber) return { ok: false as const, error: "not_found" as const };
    await tx.timeOff.create({
      data: {
        tenantId: input.tenantId,
        barberId: barber.id,
        startsAt,
        endsAt,
        reason: input.reason?.trim() || "Bloqueado por el barbero",
      },
    });
    return { ok: true as const };
  });
}

export async function barberDeleteTimeOff(input: {
  tenantId: string;
  userId: string;
  timeOffId: string;
}): Promise<BarberPanelResult> {
  return withTenant(input.tenantId, async (tx) => {
    const row = await tx.timeOff.findUnique({
      where: { id: input.timeOffId },
      include: { barber: true },
    });
    if (!row) return { ok: false as const, error: "not_found" as const };
    if (row.barber.userId !== input.userId) {
      return { ok: false as const, error: "forbidden" as const };
    }
    await tx.timeOff.delete({ where: { id: row.id } });
    return { ok: true as const };
  });
}
