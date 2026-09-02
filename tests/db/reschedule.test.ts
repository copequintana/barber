import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { createBooking, rescheduleBookingByToken } from "@/lib/booking";
import { prisma, withTenant } from "@/lib/db";

const run = `rsc-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
const TUESDAY = "2026-10-06";
const NOW = new Date("2026-10-01T12:00:00Z");

const local = (hhmm: string) =>
  DateTime.fromISO(`${TUESDAY}T${hhmm}`, { zone: TZ }).toUTC();

let tenantId: string;
let barberId: string;
let serviceId: string;

async function book(hhmm: string, phone: string) {
  const result = await createBooking({
    tenantId,
    serviceId,
    barberId,
    startISO: local(hhmm).toISO()!,
    customer: { name: "Cliente RSC", phone },
    now: NOW,
  });
  if (!result.ok) throw new Error("fixture");
  return result.appointment;
}

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test reprogramar",
      slug: run,
      timezone: TZ,
      slotGridMinutes: 30,
      minLeadMinutes: 60,
      cancelMinMinutes: 120,
    },
  });
  tenantId = tenant.id;
  await withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.create({
      data: { tenantId, displayName: "R" },
    });
    barberId = barber.id;
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, price: 200 },
    });
    serviceId = service.id;
    await tx.barberService.create({ data: { tenantId, barberId, serviceId } });
    await tx.workingHour.createMany({
      data: [
        { tenantId, barberId, weekday: 2, startMin: 600, endMin: 780 },
      ],
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("reprogramación por token", () => {
  it("mueve la cita a un slot válido, borra recordatorios y conserva el token", async () => {
    const appt = await book("10:00", `601-${run}`);
    // Simular recordatorio ya enviado
    await withTenant(tenantId, (tx) =>
      tx.notification.create({
        data: {
          tenantId,
          appointmentId: appt.id,
          channel: "email",
          type: "reminder_24h",
          status: "sent",
          sentAt: new Date(),
        },
      }),
    );

    const result = await rescheduleBookingByToken(
      tenantId,
      appt.cancelToken,
      local("11:00").toISO()!,
      NOW,
    );
    expect(result.ok).toBe(true);

    const row = await withTenant(tenantId, (tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: appt.id } }),
    );
    expect(row.startsAt.toISOString()).toBe(local("11:00").toISO());
    expect(row.cancelToken).toBe(appt.cancelToken); // mismo link

    const notifs = await withTenant(tenantId, (tx) =>
      tx.notification.findMany({ where: { appointmentId: appt.id } }),
    );
    expect(notifs.filter((n) => n.type.startsWith("reminder"))).toHaveLength(0);
  });

  it("si el nuevo slot está ocupado, la cita original queda intacta", async () => {
    const blocker = await book("12:00", `602-${run}`);
    const appt = await book("10:00", `603-${run}`);

    const result = await rescheduleBookingByToken(
      tenantId,
      appt.cancelToken,
      local("12:00").toISO()!,
      NOW,
    );
    expect(result).toEqual({ ok: false, error: "slot_taken" });

    const row = await withTenant(tenantId, (tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: appt.id } }),
    );
    expect(row.startsAt.toISOString()).toBe(local("10:00").toISO());
    void blocker;
  });

  it("fuera de la ventana de política → outside_window", async () => {
    const appt = await book("12:30", `604-${run}`);
    const lateNow = local("11:00").toJSDate(); // 1.5 h antes; ventana 2 h
    const result = await rescheduleBookingByToken(
      tenantId,
      appt.cancelToken,
      local("10:30").toISO()!,
      lateNow,
    );
    expect(result).toEqual({ ok: false, error: "outside_window" });
  });

  it("horas manipuladas (fuera de grilla/horario) → slot_taken", async () => {
    const appt = await book("10:30", `605-${run}`);
    for (const hhmm of ["10:07", "09:00", "13:00"]) {
      const result = await rescheduleBookingByToken(
        tenantId,
        appt.cancelToken,
        local(hhmm).toISO()!,
        NOW,
      );
      expect(result.ok).toBe(false);
    }
  });
});
