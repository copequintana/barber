import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { getDayAvailability } from "@/lib/availability";
import { prisma, withTenant } from "@/lib/db";

/**
 * Integración del wrapper getDayAvailability: fixture propio con dos barberos,
 * un servicio compartido, horarios de martes, una cita y un bloqueo.
 */

const run = `avail-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
const TUESDAY = "2026-10-06";
const NOW = new Date("2026-10-01T12:00:00Z");

const local = (hhmm: string) =>
  DateTime.fromISO(`${TUESDAY}T${hhmm}`, { zone: TZ }).toUTC().toJSDate();

let tenantId: string;
let barberA: string;
let barberB: string;
let serviceId: string;
let soloServiceId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test disponibilidad",
      slug: run,
      timezone: TZ,
      slotGridMinutes: 30,
      minLeadMinutes: 60,
      maxAdvanceDays: 30,
    },
  });
  tenantId = tenant.id;

  await withTenant(tenantId, async (tx) => {
    const a = await tx.barber.create({
      data: { tenantId, displayName: "A" },
    });
    const b = await tx.barber.create({
      data: { tenantId, displayName: "B" },
    });
    barberA = a.id;
    barberB = b.id;

    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, bufferMin: 0, price: 200 },
    });
    serviceId = service.id;
    const solo = await tx.service.create({
      data: { tenantId, name: "Diseño", durationMin: 60, price: 400 },
    });
    soloServiceId = solo.id;

    await tx.barberService.createMany({
      data: [
        { tenantId, barberId: barberA, serviceId },
        { tenantId, barberId: barberB, serviceId },
        { tenantId, barberId: barberA, serviceId: soloServiceId },
      ],
    });

    // Martes 10:00–12:00 ambos
    await tx.workingHour.createMany({
      data: [barberA, barberB].map((barberId) => ({
        tenantId,
        barberId,
        weekday: 2,
        startMin: 600,
        endMin: 720,
      })),
    });

    // A tiene cita 10:00–10:30; B tiene bloqueo 11:00–12:00
    const customer = await tx.customer.create({
      data: { tenantId, name: "Cliente", phone: `555-${run}` },
    });
    await tx.appointment.create({
      data: {
        tenantId,
        barberId: barberA,
        customerId: customer.id,
        serviceId,
        startsAt: local("10:00"),
        endsAt: local("10:30"),
        priceAtBooking: 200,
      },
    });
    await tx.timeOff.create({
      data: {
        tenantId,
        barberId: barberB,
        startsAt: local("11:00"),
        endsAt: local("12:00"),
      },
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, async (tx) => {
    await tx.appointment.deleteMany({});
  });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

function times(av: { slots: { start: Date }[] }): string[] {
  return av.slots.map((s) =>
    DateTime.fromJSDate(s.start, { zone: "utc" }).setZone(TZ).toFormat("HH:mm"),
  );
}

describe("getDayAvailability", () => {
  it("modo 'cualquier barbero': une slots e indica quién está libre", async () => {
    const av = await getDayAvailability({
      tenantId,
      serviceId,
      dateISO: TUESDAY,
      now: NOW,
    });
    expect(av).not.toBeNull();
    expect(times(av!)).toEqual(["10:00", "10:30", "11:00", "11:30"]);

    const byTime = new Map(times(av!).map((t, i) => [t, av!.slots[i]]));
    // 10:00: A ocupado (cita) → solo B
    expect(byTime.get("10:00")!.barberIds).toEqual([barberB]);
    // 10:30: ambos libres
    expect(byTime.get("10:30")!.barberIds.sort()).toEqual(
      [barberA, barberB].sort(),
    );
    // 11:00 y 11:30: B bloqueado → solo A
    expect(byTime.get("11:00")!.barberIds).toEqual([barberA]);
    expect(byTime.get("11:30")!.barberIds).toEqual([barberA]);
  });

  it("modo barbero concreto respeta su propia ocupación", async () => {
    const av = await getDayAvailability({
      tenantId,
      serviceId,
      dateISO: TUESDAY,
      barberId: barberA,
      now: NOW,
    });
    expect(times(av!)).toEqual(["10:30", "11:00", "11:30"]);
  });

  it("servicio que solo ofrece un barbero limita los slots a ese barbero", async () => {
    const av = await getDayAvailability({
      tenantId,
      serviceId: soloServiceId,
      dateISO: TUESDAY,
      now: NOW,
    });
    // 60 min en franja 10–12 con cita 10:00–10:30 de A → solo 10:30 y 11:00
    expect(times(av!)).toEqual(["10:30", "11:00"]);
    expect(av!.slots.every((s) => s.barberIds.length === 1)).toBe(true);
  });

  it("servicio inexistente o inactivo → null", async () => {
    expect(
      await getDayAvailability({
        tenantId,
        serviceId: "00000000-0000-0000-0000-000000000000",
        dateISO: TUESDAY,
        now: NOW,
      }),
    ).toBeNull();
  });
});
