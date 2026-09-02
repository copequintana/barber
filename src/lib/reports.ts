import { DateTime } from "luxon";
import { withTenant } from "./db";

/**
 * Reportes del tenant (T17). `computeReport` es una función pura sobre los
 * datos crudos del rango; `getReport` los carga. Todo se calcula sobre
 * fechas locales del tenant (un rango "1–31 oct" son días de pared).
 */

export type ReportInput = {
  timezone: string;
  fromISO: string; // día local inclusive
  toISO: string; // día local inclusive
  appointments: {
    barberId: string;
    serviceId: string;
    serviceName: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    price: number;
    cancelledBy: string | null;
  }[];
  barbers: { id: string; displayName: string }[];
  workingHours: { barberId: string; weekday: number; startMin: number; endMin: number }[];
  timeOff: { barberId: string; startsAt: Date; endsAt: Date }[];
};

export type Report = {
  totals: {
    citas: number; // no canceladas
    completadas: number;
    noShows: number;
    canceladas: number;
    canceladasPorCliente: number;
    ingresos: number; // solo completadas
    /** no_show / (no_show + completadas); null sin citas terminadas */
    noShowRate: number | null;
  };
  porBarbero: {
    barberId: string;
    nombre: string;
    citas: number;
    reservadoMin: number;
    disponibleMin: number;
    /** null si no tiene horario definido en el rango */
    ocupacion: number | null;
  }[];
  topServicios: { serviceId: string; nombre: string; citas: number; ingresos: number }[];
};

export function computeReport(input: ReportInput): Report {
  const active = input.appointments.filter((a) => a.status !== "cancelled");
  const completadas = active.filter((a) => a.status === "completed");
  const noShows = active.filter((a) => a.status === "no_show");
  const canceladas = input.appointments.filter((a) => a.status === "cancelled");

  const terminadas = completadas.length + noShows.length;
  const ingresos = completadas.reduce((s, a) => s + a.price, 0);

  // Minutos disponibles por barbero: franjas de cada día del rango, menos
  // el solape de sus bloqueos con esas franjas.
  const from = DateTime.fromISO(input.fromISO, { zone: input.timezone }).startOf("day");
  const to = DateTime.fromISO(input.toISO, { zone: input.timezone }).startOf("day");

  const porBarbero = input.barbers.map((b) => {
    const franjas = input.workingHours.filter((w) => w.barberId === b.id);
    let disponibleMin = 0;

    for (let d = from; d <= to; d = d.plus({ days: 1 })) {
      const weekday = d.weekday % 7;
      for (const f of franjas.filter((f) => f.weekday === weekday)) {
        const fStart = d.plus({ minutes: f.startMin }).toMillis();
        const fEnd = d.plus({ minutes: f.endMin }).toMillis();
        let min = f.endMin - f.startMin;
        // restar bloqueos que pisan la franja
        for (const t of input.timeOff.filter((t) => t.barberId === b.id)) {
          const oStart = Math.max(fStart, t.startsAt.getTime());
          const oEnd = Math.min(fEnd, t.endsAt.getTime());
          if (oEnd > oStart) min -= (oEnd - oStart) / 60_000;
        }
        disponibleMin += Math.max(0, min);
      }
    }

    const own = active.filter((a) => a.barberId === b.id);
    const reservadoMin = own.reduce(
      (s, a) => s + (a.endsAt.getTime() - a.startsAt.getTime()) / 60_000,
      0,
    );
    return {
      barberId: b.id,
      nombre: b.displayName,
      citas: own.length,
      reservadoMin: Math.round(reservadoMin),
      disponibleMin: Math.round(disponibleMin),
      ocupacion:
        disponibleMin > 0
          ? Math.min(1, reservadoMin / disponibleMin)
          : null,
    };
  });

  const porServicio = new Map<string, { nombre: string; citas: number; ingresos: number }>();
  for (const a of active) {
    const entry = porServicio.get(a.serviceId) ?? {
      nombre: a.serviceName,
      citas: 0,
      ingresos: 0,
    };
    entry.citas += 1;
    if (a.status === "completed") entry.ingresos += a.price;
    porServicio.set(a.serviceId, entry);
  }

  return {
    totals: {
      citas: active.length,
      completadas: completadas.length,
      noShows: noShows.length,
      canceladas: canceladas.length,
      canceladasPorCliente: canceladas.filter((a) => a.cancelledBy === "customer").length,
      ingresos,
      noShowRate: terminadas > 0 ? noShows.length / terminadas : null,
    },
    porBarbero: porBarbero.sort((a, b) => b.citas - a.citas),
    topServicios: [...porServicio.entries()]
      .map(([serviceId, s]) => ({ serviceId, ...s }))
      .sort((a, b) => b.citas - a.citas),
  };
}

export async function getReport(
  tenantId: string,
  timezone: string,
  fromISO: string,
  toISO: string,
): Promise<Report | null> {
  const from = DateTime.fromISO(fromISO, { zone: timezone }).startOf("day");
  const to = DateTime.fromISO(toISO, { zone: timezone }).endOf("day");
  if (!from.isValid || !to.isValid || to < from) return null;
  const start = from.toUTC().toJSDate();
  const end = to.toUTC().toJSDate();

  const raw = await withTenant(tenantId, async (tx) => {
    const appointments = await tx.appointment.findMany({
      where: { startsAt: { gte: start, lte: end } },
      include: { service: true },
    });
    const barbers = await tx.barber.findMany({
      where: { active: true },
      select: { id: true, displayName: true },
    });
    const workingHours = await tx.workingHour.findMany({
      where: { barberId: { in: barbers.map((b) => b.id) } },
    });
    const timeOff = await tx.timeOff.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start } },
    });
    return { appointments, barbers, workingHours, timeOff };
  });

  return computeReport({
    timezone,
    fromISO,
    toISO,
    appointments: raw.appointments.map((a) => ({
      barberId: a.barberId,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      status: a.status,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      price: Number(a.priceAtBooking),
      cancelledBy: a.cancelledBy,
    })),
    barbers: raw.barbers,
    workingHours: raw.workingHours,
    timeOff: raw.timeOff,
  });
}

/** Filas para el export CSV del rango. */
export async function getReportRows(
  tenantId: string,
  timezone: string,
  fromISO: string,
  toISO: string,
) {
  const from = DateTime.fromISO(fromISO, { zone: timezone }).startOf("day");
  const to = DateTime.fromISO(toISO, { zone: timezone }).endOf("day");
  if (!from.isValid || !to.isValid || to < from) return null;

  return withTenant(tenantId, (tx) =>
    tx.appointment.findMany({
      where: {
        startsAt: { gte: from.toUTC().toJSDate(), lte: to.toUTC().toJSDate() },
      },
      include: { service: true, barber: true, customer: true },
      orderBy: { startsAt: "asc" },
    }),
  );
}
