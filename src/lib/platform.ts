import { prisma, withTenant } from "./db";

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
  const tenants = await prisma.tenant.count();
  const suspended = await prisma.tenant.count({ where: { suspended: true } });
  const users = await prisma.user.count();
  // Conteos globales de citas: fuera del contexto RLS se usa una consulta
  // directa con el rol admin no disponible… así que se agrega por tenant.
  const allTenants = await prisma.tenant.findMany({ select: { id: true } });
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
