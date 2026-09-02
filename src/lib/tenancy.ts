import { prisma } from "./db";

/**
 * Acceso a las tablas globales de identidad/pertenencia (sin RLS):
 * tenants, users, memberships. Los datos de negocio de un tenant se leen
 * siempre vía withTenant() en db.ts.
 */

export function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}

export function getMembership(userId: string, tenantId: string) {
  return prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
}

export function getMembershipsWithTenant(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { tenantId: "asc" },
  });
}

export { RESERVED_SLUGS, SLUG_RE } from "./slugs";
