import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminCreateAppointment } from "@/lib/admin-appointments";
import {
  barberBlockSlot,
  barberDeleteTimeOff,
  barberSetOutcome,
  getBarberDay,
  getOwnBarber,
} from "@/lib/barber-panel";
import { prisma, withTenant } from "@/lib/db";

const run = `bpn-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
const DAY = "2026-10-06";

let tenantId: string;
let userA: string; // barbero A
let userB: string; // barbero B
let barberA: string;
let apptA: string;
let apptB: string;

beforeAll(async () => {
  const ua = await prisma.user.create({ data: { email: `a-${run}@t.l` } });
  const ub = await prisma.user.create({ data: { email: `b-${run}@t.l` } });
  userA = ua.id;
  userB = ub.id;

  const tenant = await prisma.tenant.create({
    data: { name: "Test panel", slug: run, timezone: TZ },
  });
  tenantId = tenant.id;
  await prisma.membership.createMany({
    data: [
      { userId: userA, tenantId, role: "barber" },
      { userId: userB, tenantId, role: "barber" },
    ],
  });

  const ids = await withTenant(tenantId, async (tx) => {
    const a = await tx.barber.create({
      data: { tenantId, displayName: "A", userId: userA },
    });
    const b = await tx.barber.create({
      data: { tenantId, displayName: "B", userId: userB },
    });
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, price: 200 },
    });
    await tx.barberService.createMany({
      data: [
        { tenantId, barberId: a.id, serviceId: service.id },
        { tenantId, barberId: b.id, serviceId: service.id },
      ],
    });
    return { a: a.id, b: b.id, service: service.id };
  });
  barberA = ids.a;

  const r1 = await adminCreateAppointment({
    tenantId,
    barberId: ids.a,
    serviceId: ids.service,
    startLocal: `${DAY}T10:00`,
    customer: { name: "Cliente A", phone: `611-${run}` },
  });
  const r2 = await adminCreateAppointment({
    tenantId,
    barberId: ids.b,
    serviceId: ids.service,
    startLocal: `${DAY}T10:00`,
    customer: { name: "Cliente B", phone: `612-${run}` },
  });
  if (!r1.ok || !r2.ok) throw new Error("fixture");
  apptA = r1.appointmentId;
  apptB = r2.appointmentId;
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { email: { contains: run } } });
  await prisma.$disconnect();
});

describe("panel del barbero", () => {
  it("resuelve el barbero vinculado al usuario y su día", async () => {
    const own = await getOwnBarber(tenantId, userA);
    expect(own?.id).toBe(barberA);

    const day = await getBarberDay(tenantId, TZ, barberA, DAY);
    expect(day?.appointments.map((a) => a.id)).toEqual([apptA]);
  });

  it("marca desenlace de SU cita, pero no la de otro barbero", async () => {
    const forbidden = await barberSetOutcome({
      tenantId,
      userId: userA,
      appointmentId: apptB,
      outcome: "completed",
    });
    expect(forbidden).toEqual({ ok: false, error: "forbidden" });

    const own = await barberSetOutcome({
      tenantId,
      userId: userA,
      appointmentId: apptA,
      outcome: "completed",
    });
    expect(own).toEqual({ ok: true });

    // Estado final: no se re-marca
    expect(
      await barberSetOutcome({
        tenantId,
        userId: userA,
        appointmentId: apptA,
        outcome: "no_show",
      }),
    ).toEqual({ ok: false, error: "not_editable" });
  });

  it("bloquea un hueco propio y solo él puede quitarlo", async () => {
    const created = await barberBlockSlot({
      tenantId,
      userId: userA,
      timezone: TZ,
      startLocal: `${DAY}T15:00`,
      minutes: 60,
    });
    expect(created).toEqual({ ok: true });

    const day = await getBarberDay(tenantId, TZ, barberA, DAY);
    const block = day!.timeOff[0];
    expect(block).toBeDefined();

    expect(
      await barberDeleteTimeOff({
        tenantId,
        userId: userB,
        timeOffId: block.id,
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      await barberDeleteTimeOff({
        tenantId,
        userId: userA,
        timeOffId: block.id,
      }),
    ).toEqual({ ok: true });
  });

  it("valida entradas del bloqueo", async () => {
    expect(
      await barberBlockSlot({
        tenantId,
        userId: userA,
        timezone: TZ,
        startLocal: "no-fecha",
        minutes: 30,
      }),
    ).toEqual({ ok: false, error: "invalid_input" });
  });
});
