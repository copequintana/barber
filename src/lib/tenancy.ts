import { prisma } from "./db";

/**
 * Acceso a las tablas globales de identidad/pertenencia (sin RLS):
 * tenants, users, memberships. Los datos de negocio de un tenant se leen
 * siempre vía withTenant() en db.ts.
 */

/** Acento cuando el tenant no configuró brandColor (mismo que los emails, T12). */
export const DEFAULT_BRAND_COLOR = "#2747d4";

export function getTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({
    where: {
      slug,
      OR: [{ isDemo: false }, { demoExpiresAt: { gt: new Date() } }],
    },
  });
}

export function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}

export function getMembership(userId: string, tenantId: string) {
  return prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    include: { tenant: { select: { isDemo: true, demoExpiresAt: true } } },
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
