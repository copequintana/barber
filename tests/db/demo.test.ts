import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { prisma, withTenant } from "@/lib/db";
import {
  DEMO_EMAIL_DOMAIN,
  createDemo,
  demoBarberCredentials,
  endDemo,
  getActiveDemo,
  purgeExpiredDemos,
} from "@/lib/demo";
import { getPlatformMetrics } from "@/lib/platform";
import { getTenantBySlug } from "@/lib/tenancy";

const run = Date.now().toString(36);
let vendorId: string;

beforeAll(async () => {
  const vendor = await prisma.user.create({
    data: { email: `vendedor-${run}@t.l`, isVendor: true },
  });
  vendorId = vendor.id;
});

afterAll(async () => {
  const leftovers = await prisma.tenant.findMany({
    where: { isDemo: true, demoOwnerId: vendorId },
    select: { id: true },
  });
  for (const t of leftovers) await endDemo(t.id);
  await prisma.platformAuditLog.deleteMany({ where: { userId: vendorId } });
  await prisma.user.delete({ where: { id: vendorId } });
  await prisma.$disconnect();
});

describe("barbería demo temporal", () => {
  it("crea una barbería completa que expira a las 3 horas", async () => {
    const before = await getPlatformMetrics();
    const now = new Date();
    const demo = await createDemo(vendorId, now);

    expect(demo.slug).toMatch(/^demo-[a-f0-9]{6}$/);
    expect(demo.demoExpiresAt!.getTime() - now.getTime()).toBe(3 * 3_600_000);
    expect(await getActiveDemo(vendorId)).toMatchObject({ id: demo.id });

    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: vendorId, tenantId: demo.id } },
    });
    expect(membership?.role).toBe("owner");

    const data = await withTenant(demo.id, async (tx) => ({
      barbers: await tx.barber.count(),
      services: await tx.service.count(),
      customers: await tx.customer.count(),
      workingHours: await tx.workingHour.count(),
      timeOff: await tx.timeOff.count(),
      appointments: await tx.appointment.findMany({ select: { startsAt: true, endsAt: true, status: true } }),
    }));
    expect(data).toMatchObject({ barbers: 3, services: 5, customers: 15, timeOff: 1 });
    expect(data.workingHours).toBe((7 + 7 + 6) * 2);
    expect(data.appointments.length).toBeGreaterThan(100);
    const finishedButOpen = data.appointments.filter(
      (a) => a.endsAt <= now && (a.status === "confirmed" || a.status === "pending"),
    );
    expect(finishedButOpen).toHaveLength(0);
    expect(data.appointments.some((a) => a.startsAt > now && a.status === "confirmed")).toBe(true);
    expect(data.appointments.some((a) => a.status === "completed")).toBe(true);

    const after = await getPlatformMetrics();
    expect(after.tenants).toBe(before.tenants);
    expect(after.users).toBe(before.users);
  });

  it("deja listo el acceso del barbero con contraseña", async () => {
    const demo = (await getActiveDemo(vendorId))!;
    const { email, password } = demoBarberCredentials(demo);
    expect(email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { accounts: true, memberships: true },
    });
    expect(user.memberships).toEqual([
      expect.objectContaining({ tenantId: demo.id, role: "barber" }),
    ]);
    const account = user.accounts.find((a) => a.providerId === "credential");
    expect(await verifyPassword({ hash: account!.password!, password })).toBe(true);

    const linked = await withTenant(demo.id, (tx) => tx.barber.findFirst({ where: { userId: user.id } }));
    expect(linked?.displayName).toBe("Chuy Valenzuela");
  });

  it("no crea una segunda demo mientras la primera sigue activa", async () => {
    const demo = (await getActiveDemo(vendorId))!;
    const again = await createDemo(vendorId);
    expect(again.id).toBe(demo.id);
    expect(await prisma.tenant.count({ where: { demoOwnerId: vendorId } })).toBe(1);
  });

  it("terminarla borra la barbería, sus datos y el acceso del barbero", async () => {
    const demo = (await getActiveDemo(vendorId))!;
    const { email } = demoBarberCredentials(demo);

    expect(await endDemo(demo.id)).toBe(true);
    expect(await prisma.tenant.findUnique({ where: { id: demo.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await withTenant(demo.id, (tx) => tx.appointment.count())).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: vendorId } })).not.toBeNull();
  });

  it("al vencer deja de ser pública y la purga la borra", async () => {
    const demo = await createDemo(vendorId);
    expect(await getTenantBySlug(demo.slug)).not.toBeNull();

    await prisma.tenant.update({
      where: { id: demo.id },
      data: { demoExpiresAt: new Date(Date.now() - 60_000) },
    });
    expect(await getTenantBySlug(demo.slug)).toBeNull();
    expect(await getActiveDemo(vendorId)).toBeNull();

    expect(await purgeExpiredDemos()).toBeGreaterThanOrEqual(1);
    expect(await prisma.tenant.findUnique({ where: { id: demo.id } })).toBeNull();
  });

  it("endDemo nunca borra una barbería real", async () => {
    const real = await prisma.tenant.create({
      data: { name: "Real", slug: `real-${run}`, timezone: "America/Mexico_City" },
    });
    expect(await endDemo(real.id)).toBe(false);
    expect(await prisma.tenant.findUnique({ where: { id: real.id } })).not.toBeNull();
    await prisma.tenant.delete({ where: { id: real.id } });
  });
});
