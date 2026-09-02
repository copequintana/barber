import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  cancelBookingByToken,
  createBooking,
  getAppointmentByToken,
} from "@/lib/booking";
import { prisma, withTenant } from "@/lib/db";

const run = `book-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
const TUESDAY = "2026-10-06"; // martes con horario 10:00–12:00
const NOW = new Date("2026-10-01T12:00:00Z");

const local = (hhmm: string) =>
  DateTime.fromISO(`${TUESDAY}T${hhmm}`, { zone: TZ }).toUTC();

let tenantId: string;
let barberA: string;
let barberB: string;
let serviceId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test reservas",
      slug: run,
      timezone: TZ,
      slotGridMinutes: 30,
      minLeadMinutes: 60,
      maxAdvanceDays: 30,
      cancelMinMinutes: 120,
    },
  });
  tenantId = tenant.id;

  await withTenant(tenantId, async (tx) => {
    const a = await tx.barber.create({ data: { tenantId, displayName: "A" } });
    const b = await tx.barber.create({ data: { tenantId, displayName: "B" } });
    barberA = a.id;
    barberB = b.id;
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, bufferMin: 0, price: 200 },
    });
    serviceId = service.id;
    await tx.barberService.createMany({
      data: [
        { tenantId, barberId: barberA, serviceId, priceOverride: 250 },
        { tenantId, barberId: barberB, serviceId },
      ],
    });
    await tx.workingHour.createMany({
      data: [barberA, barberB].map((barberId) => ({
        tenantId,
        barberId,
        weekday: 2,
        startMin: 600,
        endMin: 780, // 10:00–13:00
      })),
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

const customer = { name: "Juan Pérez", phone: `555-${run}` };

describe("createBooking", () => {
  it("crea la reserva con barbero concreto y congela el precio (override)", async () => {
    const result = await createBooking({
      tenantId,
      serviceId,
      barberId: barberA,
      startISO: local("10:00").toISO()!,
      customer,
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment.barberId).toBe(barberA);
    expect(Number(result.appointment.priceAtBooking)).toBe(250);
    expect(result.appointment.cancelToken).toBeTruthy();
  });

  it("reutiliza el cliente por teléfono en vez de duplicarlo", async () => {
    await createBooking({
      tenantId,
      serviceId,
      barberId: barberA,
      startISO: local("11:00").toISO()!,
      customer: { ...customer, name: "Juan P. actualizado" },
      now: NOW,
    });
    const customers = await withTenant(tenantId, (tx) =>
      tx.customer.findMany({ where: { phone: customer.phone } }),
    );
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Juan P. actualizado");
  });

  it("mismo slot con el mismo barbero → slot_taken", async () => {
    const result = await createBooking({
      tenantId,
      serviceId,
      barberId: barberA,
      startISO: local("10:00").toISO()!,
      customer: { name: "Otro", phone: `556-${run}` },
      now: NOW,
    });
    expect(result).toEqual({ ok: false, error: "slot_taken" });
  });

  it("modo 'cualquiera' asigna un barbero libre aunque otro esté ocupado", async () => {
    const result = await createBooking({
      tenantId,
      serviceId,
      startISO: local("10:00").toISO()!, // A ya está ocupado a esta hora
      customer: { name: "Tercero", phone: `557-${run}` },
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.appointment.barberId).toBe(barberB);
    expect(Number(result.appointment.priceAtBooking)).toBe(200); // sin override
  });

  it("dos reservas 'cualquiera' simultáneas al mismo slot ganan con barberos distintos", async () => {
    const startISO = local("12:00").toISO()!;
    const [r1, r2] = await Promise.all([
      createBooking({
        tenantId,
        serviceId,
        startISO,
        customer: { name: "Any1", phone: `565-${run}` },
        now: NOW,
      }),
      createBooking({
        tenantId,
        serviceId,
        startISO,
        customer: { name: "Any2", phone: `566-${run}` },
        now: NOW,
      }),
    ]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.appointment.barberId).not.toBe(r2.appointment.barberId);
  });

  it("rechaza horas fuera del horario o fuera de grilla (entrada manipulada)", async () => {
    for (const hhmm of ["09:00", "12:00", "10:07"]) {
      const result = await createBooking({
        tenantId,
        serviceId,
        barberId: barberB,
        startISO: local(hhmm).toISO()!,
        customer,
        now: NOW,
      });
      expect(result.ok).toBe(false);
    }
  });

  it("carrera por el último hueco: solo una de dos reservas concurrentes gana", async () => {
    const startISO = local("11:30").toISO()!;
    const [r1, r2] = await Promise.all([
      createBooking({
        tenantId,
        serviceId,
        barberId: barberB,
        startISO,
        customer: { name: "R1", phone: `558-${run}` },
        now: NOW,
      }),
      createBooking({
        tenantId,
        serviceId,
        barberId: barberB,
        startISO,
        customer: { name: "R2", phone: `559-${run}` },
        now: NOW,
      }),
    ]);
    const oks = [r1, r2].filter((r) => r.ok);
    expect(oks).toHaveLength(1);
  });
});

describe("cancelación por token", () => {
  async function freshBooking(hhmm: string, phone: string) {
    const result = await createBooking({
      tenantId,
      serviceId,
      barberId: barberB,
      startISO: local(hhmm).toISO()!,
      customer: { name: "Cancelable", phone },
      now: NOW,
    });
    if (!result.ok) throw new Error("fixture booking failed");
    return result.appointment;
  }

  it("muestra la cita por token y cancela dentro de la ventana", async () => {
    const appt = await freshBooking("10:30", `560-${run}`);
    const view = await getAppointmentByToken(tenantId, appt.cancelToken, NOW);
    expect(view?.serviceName).toBe("Corte");
    expect(view?.cancelable).toBe(true);

    const result = await cancelBookingByToken(tenantId, appt.cancelToken, NOW);
    expect(result.ok).toBe(true);

    const after = await getAppointmentByToken(tenantId, appt.cancelToken, NOW);
    expect(after?.status).toBe("cancelled");
  });

  it("cancelar libera el slot para otra reserva", async () => {
    const retry = await createBooking({
      tenantId,
      serviceId,
      barberId: barberB,
      startISO: local("10:30").toISO()!,
      customer: { name: "Recupera slot", phone: `561-${run}` },
      now: NOW,
    });
    expect(retry.ok).toBe(true);
  });

  it("fuera de la ventana (menos de 2 h antes) → outside_window", async () => {
    const appt = await freshBooking("11:00", `562-${run}`);
    const lateNow = local("10:00").toJSDate(); // 1 h antes de la cita
    const result = await cancelBookingByToken(tenantId, appt.cancelToken, lateNow);
    expect(result).toEqual({ ok: false, error: "outside_window" });
  });

  it("token inexistente → not_found", async () => {
    const result = await cancelBookingByToken(
      tenantId,
      "00000000-0000-0000-0000-000000000000",
      NOW,
    );
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
