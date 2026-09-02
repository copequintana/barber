import { DateTime } from "luxon";
import { withTenant } from "./db";
import { getTenantById } from "./tenancy";

/**
 * Motor de disponibilidad (T08).
 *
 * `computeDaySlots` es una función pura sobre datos ya cargados: se testea
 * exhaustivamente (DST, buffers, bordes) sin BD. `getDayAvailability` carga
 * horarios, bloqueos y citas del tenant y la aplica por barbero.
 *
 * Convenciones:
 *  - Los slots se generan sobre la HORA DE PARED del tenant (un "10:00" es
 *    10:00 local aunque cambie el offset), y se comparan contra ocupación en
 *    instantes reales (ms UTC).
 *  - `end` de un slot incluye el buffer del servicio: es lo que ocupa en la
 *    agenda (y lo que se persiste en appointments.ends_at). La hora de
 *    término visible para el cliente es start + durationMin.
 */

export type WorkingRange = { weekday: number; startMin: number; endMin: number };
export type BusyInterval = { start: number; end: number }; // epoch ms, [start, end)
export type Slot = { start: Date; end: Date };

export type ComputeDaySlotsInput = {
  timezone: string;
  /** Día local del tenant, formato YYYY-MM-DD */
  dateISO: string;
  workingHours: WorkingRange[];
  busy: BusyInterval[];
  durationMin: number;
  bufferMin: number;
  gridMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  now?: Date;
};

export function computeDaySlots(input: ComputeDaySlotsInput): Slot[] {
  const now = input.now ?? new Date();
  const day = DateTime.fromISO(input.dateISO, { zone: input.timezone });
  if (!day.isValid) return [];
  const dayStart = day.startOf("day");

  const todayLocal = DateTime.fromJSDate(now, { zone: input.timezone }).startOf("day");
  if (dayStart < todayLocal) return [];
  if (dayStart > todayLocal.plus({ days: input.maxAdvanceDays })) return [];

  // Luxon: lunes=1 … domingo=7; nuestro esquema: domingo=0 … sábado=6
  const weekday = dayStart.weekday % 7;
  const totalMin = input.durationMin + input.bufferMin;
  const grid = Math.max(5, input.gridMinutes);
  const minStartMs = now.getTime() + input.minLeadMinutes * 60_000;

  const slots: Slot[] = [];
  const ranges = input.workingHours
    .filter((w) => w.weekday === weekday)
    .sort((a, b) => a.startMin - b.startMin);

  for (const r of ranges) {
    for (let m = r.startMin; m + totalMin <= r.endMin; m += grid) {
      const startLocal = dayStart.set({
        hour: Math.floor(m / 60),
        minute: m % 60,
      });
      // Hora de pared inexistente (salto de DST): luxon la corre; descartarla
      if (startLocal.hour * 60 + startLocal.minute !== m) continue;

      const startMs = startLocal.toMillis();
      const endMs = startMs + totalMin * 60_000;
      if (startMs < minStartMs) continue;
      if (input.busy.some((b) => startMs < b.end && b.start < endMs)) continue;

      slots.push({ start: new Date(startMs), end: new Date(endMs) });
    }
  }
  return slots;
}

export type DayAvailability = {
  tenantId: string;
  serviceId: string;
  durationMin: number;
  bufferMin: number;
  /** Slots ordenados; cada uno lista los barberos libres a esa hora. */
  slots: { start: Date; end: Date; barberIds: string[] }[];
};

/**
 * Disponibilidad de un día para un servicio, por barbero concreto o por
 * todos los barberos activos que lo ofrecen (barberId omitido = "cualquiera").
 * Devuelve null si el servicio no existe/está inactivo o no hay barberos.
 */
export async function getDayAvailability(opts: {
  tenantId: string;
  serviceId: string;
  dateISO: string;
  barberId?: string;
  now?: Date;
}): Promise<DayAvailability | null> {
  const tenant = await getTenantById(opts.tenantId);
  if (!tenant) return null;

  const day = DateTime.fromISO(opts.dateISO, { zone: tenant.timezone });
  if (!day.isValid) return null;
  const windowStart = day.startOf("day").toUTC().toJSDate();
  const windowEnd = day.startOf("day").plus({ days: 1 }).toUTC().toJSDate();

  const data = await withTenant(opts.tenantId, async (tx) => {
    const service = await tx.service.findFirst({
      where: { id: opts.serviceId, active: true },
    });
    if (!service) return null;

    const barbers = await tx.barber.findMany({
      where: {
        active: true,
        ...(opts.barberId ? { id: opts.barberId } : {}),
        services: { some: { serviceId: opts.serviceId } },
      },
      select: { id: true },
    });
    if (barbers.length === 0) return null;
    const barberIds = barbers.map((b) => b.id);

    // Secuencial a propósito: la transacción usa una sola conexión de pg
    const hours = await tx.workingHour.findMany({
      where: { barberId: { in: barberIds } },
    });
    const timeOff = await tx.timeOff.findMany({
      where: {
        barberId: { in: barberIds },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
    });
    const appointments = await tx.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        status: { in: ["pending", "confirmed"] },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    });
    return { service, barberIds, hours, timeOff, appointments };
  });
  if (!data) return null;

  const { service, barberIds, hours, timeOff, appointments } = data;

  const merged = new Map<number, { start: Date; end: Date; barberIds: string[] }>();
  for (const barberId of barberIds) {
    const slots = computeDaySlots({
      timezone: tenant.timezone,
      dateISO: opts.dateISO,
      workingHours: hours.filter((h) => h.barberId === barberId),
      busy: [
        ...timeOff
          .filter((t) => t.barberId === barberId)
          .map((t) => ({ start: t.startsAt.getTime(), end: t.endsAt.getTime() })),
        ...appointments
          .filter((a) => a.barberId === barberId)
          .map((a) => ({ start: a.startsAt.getTime(), end: a.endsAt.getTime() })),
      ],
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      gridMinutes: tenant.slotGridMinutes,
      minLeadMinutes: tenant.minLeadMinutes,
      maxAdvanceDays: tenant.maxAdvanceDays,
      now: opts.now,
    });
    for (const slot of slots) {
      const key = slot.start.getTime();
      const entry = merged.get(key);
      if (entry) entry.barberIds.push(barberId);
      else merged.set(key, { ...slot, barberIds: [barberId] });
    }
  }

  return {
    tenantId: opts.tenantId,
    serviceId: service.id,
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    slots: [...merged.values()].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    ),
  };
}
