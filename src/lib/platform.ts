import { Prisma } from "@prisma/client";
import { prisma, withTenant } from "./db";
import { DEMO_EMAIL_DOMAIN, getActiveDemo } from "./demo";
import { slugProblem } from "./slugs";

/**
 * Consola de plataforma (T20): operaciones de datos. El guard de acceso
 * (requirePlatformAdmin) vive en platform-guard.ts para no arrastrar
 * next-auth a los tests de esta lógica.
 */

export type PlatformUser = { id: string; email: string };

export function logPlatformAction(input: {
  userId: string;
  tenantId?: string;
  action: string;
  detail?: string;
}) {
  return prisma.platformAuditLog.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      action: input.action,
      detail: input.detail,
    },
  });
}

export async function getPlatformMetrics(now = new Date()) {
  const since30d = new Date(now.getTime() - 30 * 24 * 3_600_000);
  const tenants = await prisma.tenant.count({ where: { isDemo: false } });
  const suspended = await prisma.tenant.count({ where: { suspended: true, isDemo: false } });
  const users = await prisma.user.count({
    where: { NOT: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } } },
  });
  // Conteos globales de citas: fuera del contexto RLS se usa una consulta
  // directa con el rol admin no disponible… así que se agrega por tenant.
  const allTenants = await prisma.tenant.findMany({
    where: { isDemo: false },
    select: { id: true },
  });
  let totalAppointments = 0;
  let appointments30d = 0;
  let activeTenants30d = 0;
  for (const t of allTenants) {
    const { total, recent } = await withTenant(t.id, async (tx) => {
      const total = await tx.appointment.count();
      const recent = await tx.appointment.count({
        where: { createdAt: { gte: since30d } },
      });
      return { total, recent };
    });
    totalAppointments += total;
    appointments30d += recent;
    if (recent > 0) activeTenants30d += 1;
  }
  return {
    tenants,
    suspended,
    users,
    totalAppointments,
    appointments30d,
    activeTenants30d,
  };
}

export async function listTenantsWithActivity(now = new Date()) {
  const since30d = new Date(now.getTime() - 30 * 24 * 3_600_000);
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });
  const rows = [];
  for (const t of tenants) {
    const stats = await withTenant(t.id, async (tx) => {
      const barbers = await tx.barber.count({ where: { active: true } });
      const recent = await tx.appointment.count({
        where: { createdAt: { gte: since30d } },
      });
      return { barbers, recent };
    });
    rows.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      suspended: t.suspended,
      isDemo: t.isDemo,
      demoExpiresAt: t.demoExpiresAt,
      createdAt: t.createdAt,
      members: t._count.memberships,
      barbers: stats.barbers,
      citas30d: stats.recent,
    });
  }
  return rows;
}

export async function setTenantSuspended(
  actor: PlatformUser,
  tenantId: string,
  suspended: boolean,
  detail?: string,
) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { suspended } });
  await logPlatformAction({
    userId: actor.id,
    tenantId,
    action: suspended ? "suspend" : "reactivate",
    detail,
  });
}

export async function listVendors(now = new Date()) {
  const vendors = await prisma.user.findMany({
    where: { isVendor: true },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      accounts: { where: { providerId: "credential" }, select: { id: true } },
    },
  });
  return Promise.all(
    vendors.map(async (v) => ({
      id: v.id,
      email: v.email,
      name: v.name,
      hasPassword: v.accounts.length > 0,
      demo: await getActiveDemo(v.id, now),
    })),
  );
}

export async function grantVendor(actor: PlatformUser, email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { isVendor: true },
    create: { email, name: email.split("@")[0], isVendor: true },
    select: {
      id: true,
      accounts: { where: { providerId: "credential" }, select: { id: true } },
    },
  });
  await logPlatformAction({ userId: actor.id, action: "grant_vendor", detail: email });
  return { userId: user.id, needsInvite: user.accounts.length === 0 };
}

export async function revokeVendor(actor: PlatformUser, userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isVendor: false },
    select: { email: true },
  });
  await logPlatformAction({ userId: actor.id, action: "revoke_vendor", detail: user.email });
}

/** Vista de soporte (solo lectura) de un tenant; registra la impersonación. */
export async function getTenantSupportView(actor: PlatformUser, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { memberships: { include: { user: true } } },
  });
  if (!tenant) return null;

  const data = await withTenant(tenantId, async (tx) => {
    const barbers = await tx.barber.findMany({
      orderBy: { displayName: "asc" },
      include: { _count: { select: { appointments: true } } },
    });
    const services = await tx.service.count({ where: { active: true } });
    const customers = await tx.customer.count();
    const recentAppointments = await tx.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { customer: true, service: true, barber: true },
    });
    return { barbers, services, customers, recentAppointments };
  });

  await logPlatformAction({
    userId: actor.id,
    tenantId,
    action: "view_tenant",
  });

  const audit = await prisma.platformAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { tenant, ...data, audit };
}

export class PlatformError extends Error {}

export type NewBarbershop = {
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  ownerName: string;
  ownerEmail: string;
};

export async function createBarbershop(actor: PlatformUser, input: NewBarbershop) {
  const problem = slugProblem(input.slug);
  if (problem) throw new PlatformError(problem);
  const email = input.ownerEmail.trim().toLowerCase();
  try {
    const created = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.upsert({ where: { email }, update: {}, create: { email, name: input.ownerName } });
      const tenant = await tx.tenant.create({
        data: {
          name: input.name,
          slug: input.slug,
          timezone: input.timezone,
          currency: input.currency,
          memberships: { create: { userId: owner.id, role: "owner" } },
        },
      });
      const credential = await tx.account.findFirst({ where: { userId: owner.id, providerId: "credential" }, select: { id: true } });
      return { tenant, owner, needsPassword: !credential };
    });
    await logPlatformAction({ userId: actor.id, tenantId: created.tenant.id, action: "create_tenant", detail: `${input.name} · ${email}` });
    return created;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new PlatformError("Ese link ya lo usa otra barbería");
    throw e;
  }
}

export async function canManageBarbershop(actor: PlatformUser, tenantId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const created = await prisma.platformAuditLog.findFirst({
    where: { action: "create_tenant", tenantId, userId: actor.id },
    select: { id: true },
  });
  return created !== null;
}

export async function ownerNeedingPassword(tenantId: string) {
  const owner = await prisma.membership.findFirst({
    where: { tenantId, role: "owner", user: { accounts: { none: { providerId: "credential" } } } },
    select: { user: { select: { id: true, email: true } } },
  });
  return owner?.user ?? null;
}

export async function listCreatedBy(actorId: string) {
  const created = await prisma.platformAuditLog.findMany({
    where: { action: "create_tenant", userId: actorId, tenantId: { not: null } },
    select: { tenantId: true },
  });
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: created.map((c) => c.tenantId!) } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      suspended: true,
      createdAt: true,
      memberships: {
        where: { role: "owner" },
        select: { user: { select: { email: true, accounts: { where: { providerId: "credential" }, select: { id: true } } } } },
      },
    },
  });
  return tenants.map((t) => {
    const owner = t.memberships[0]?.user ?? null;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      suspended: t.suspended,
      createdAt: t.createdAt,
      owner: owner ? { email: owner.email, pending: owner.accounts.length === 0 } : null,
    };
  });
}
