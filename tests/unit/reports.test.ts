import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { computeReport, type ReportInput } from "@/lib/reports";

const TZ = "America/Mexico_City";

const at = (dayISO: string, hhmm: string) =>
  DateTime.fromISO(`${dayISO}T${hhmm}`, { zone: TZ }).toJSDate();

function appt(
  overrides: Partial<ReportInput["appointments"][number]> &
    Pick<ReportInput["appointments"][number], "status" | "startsAt" | "endsAt">,
): ReportInput["appointments"][number] {
  return {
    barberId: "b1",
    serviceId: "s1",
    serviceName: "Corte",
    price: 100,
    cancelledBy: null,
    ...overrides,
  };
}

// Rango: lunes 5 y martes 6 de octubre de 2026.
// Barbero b1 trabaja lunes y martes 10:00–14:00 (240 min/día → 480 min).
function baseInput(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    timezone: TZ,
    fromISO: "2026-10-05",
    toISO: "2026-10-06",
    barbers: [{ id: "b1", displayName: "Uno" }],
    workingHours: [
      { barberId: "b1", weekday: 1, startMin: 600, endMin: 840 },
      { barberId: "b1", weekday: 2, startMin: 600, endMin: 840 },
    ],
    timeOff: [],
    appointments: [
      appt({ status: "completed", startsAt: at("2026-10-05", "10:00"), endsAt: at("2026-10-05", "10:30"), price: 100 }),
      appt({ status: "completed", startsAt: at("2026-10-05", "11:00"), endsAt: at("2026-10-05", "11:30"), price: 200, serviceId: "s2", serviceName: "Barba" }),
      appt({ status: "no_show", startsAt: at("2026-10-06", "10:00"), endsAt: at("2026-10-06", "10:30") }),
      appt({ status: "confirmed", startsAt: at("2026-10-06", "12:00"), endsAt: at("2026-10-06", "12:30") }),
      appt({ status: "cancelled", startsAt: at("2026-10-06", "13:00"), endsAt: at("2026-10-06", "13:30"), cancelledBy: "customer" }),
    ],
    ...overrides,
  };
}

describe("computeReport", () => {
  it("totales: citas activas, ingresos solo de completadas y tasa de no-show", () => {
    const r = computeReport(baseInput());
    expect(r.totals.citas).toBe(4); // sin la cancelada
    expect(r.totals.completadas).toBe(2);
    expect(r.totals.noShows).toBe(1);
    expect(r.totals.canceladas).toBe(1);
    expect(r.totals.canceladasPorCliente).toBe(1);
    expect(r.totals.ingresos).toBe(300);
    expect(r.totals.noShowRate).toBeCloseTo(1 / 3);
  });

  it("ocupación: reservado / disponible según horarios del rango", () => {
    const r = computeReport(baseInput());
    const b = r.porBarbero[0];
    expect(b.disponibleMin).toBe(480); // 2 días × 240
    expect(b.reservadoMin).toBe(120); // 4 citas activas × 30
    expect(b.ocupacion).toBeCloseTo(120 / 480);
  });

  it("los bloqueos restan disponibilidad solo donde pisan la franja", () => {
    const r = computeReport(
      baseInput({
        timeOff: [
          // 13:00–15:00 del lunes: solo 60 min caen dentro de la franja (termina 14:00)
          { barberId: "b1", startsAt: at("2026-10-05", "13:00"), endsAt: at("2026-10-05", "15:00") },
        ],
      }),
    );
    expect(r.porBarbero[0].disponibleMin).toBe(420);
  });

  it("top servicios: cuenta activas e ingresos solo de completadas", () => {
    const r = computeReport(baseInput());
    expect(r.topServicios[0]).toMatchObject({ serviceId: "s1", citas: 3, ingresos: 100 });
    expect(r.topServicios[1]).toMatchObject({ serviceId: "s2", citas: 1, ingresos: 200 });
  });

  it("sin citas terminadas la tasa de no-show es null (no 0 engañoso)", () => {
    const r = computeReport(
      baseInput({
        appointments: [
          appt({ status: "confirmed", startsAt: at("2026-10-06", "12:00"), endsAt: at("2026-10-06", "12:30") }),
        ],
      }),
    );
    expect(r.totals.noShowRate).toBeNull();
  });

  it("barbero sin horario definido → ocupación null", () => {
    const r = computeReport(baseInput({ workingHours: [] }));
    expect(r.porBarbero[0].ocupacion).toBeNull();
  });
});
