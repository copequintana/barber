import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { createBooking } from "@/lib/booking";
import { prisma, withTenant } from "@/lib/db";
import { setTenantSuspended } from "@/lib/platform";

const run = `plt-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
const NOW = new Date("2026-10-01T12:00:00Z");

let tenantId: string;
let serviceId: string;
let adminUser: { id: string; email: string };

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `padmin-${run}@t.l`, isPlatformAdmin: true },
  });
  adminUser = { id: user.id, email: user.email };

  const tenant = await prisma.tenant.create({
    data: { name: "Test plataforma", slug: run, timezone: TZ },
  });
  tenantId = tenant.id;
  await withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.create({
      data: { tenantId, displayName: "P" },
    });
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, price: 200 },
    });
    serviceId = service.id;
    await tx.barberService.create({
      data: { tenantId, barberId: barber.id, serviceId: service.id },
    });
    await tx.workingHour.create({
      data: { tenantId, barberId: barber.id, weekday: 2, startMin: 600, endMin: 780 },
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.platformAuditLog.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: adminUser.id } });
  await prisma.$disconnect();
});

const startISO = () =>
  DateTime.fromISO("2026-10-06T10:00", { zone: TZ }).toUTC().toISO()!;

describe("suspensión de tenant", () => {
  it("suspender bloquea reservas públicas nuevas y queda auditado", async () => {
    await setTenantSuspended(adminUser, tenantId, true, "impago de prueba");

    const result = await createBooking({
      tenantId,
      serviceId,
      startISO: startISO(),
      customer: { name: "Bloqueado", phone: `701-${run}` },
      now: NOW,
    });
    expect(result).toEqual({ ok: false, error: "suspended" });

    const logs = await prisma.platformAuditLog.findMany({
      where: { tenantId },
    });
    expect(logs.map((l) => l.action)).toContain("suspend");
    expect(logs.find((l) => l.action === "suspend")?.detail).toBe(
      "impago de prueba",
    );
  });

  it("reactivar restablece las reservas", async () => {
    await setTenantSuspended(adminUser, tenantId, false);

    const result = await createBooking({
      tenantId,
      serviceId,
      startISO: startISO(),
      customer: { name: "Ya puede", phone: `702-${run}` },
      now: NOW,
    });
    expect(result.ok).toBe(true);

    const logs = await prisma.platformAuditLog.findMany({
      where: { tenantId },
    });
    expect(logs.map((l) => l.action)).toContain("reactivate");
  });
});
