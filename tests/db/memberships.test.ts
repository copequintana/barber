import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  getMembership,
  getMembershipsWithTenant,
  getTenantBySlug,
  RESERVED_SLUGS,
  SLUG_RE,
} from "@/lib/tenancy";

const run = `mem-${Date.now().toString(36)}`;

let tenantId: string;
let ownerId: string;
let strangerId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: "Test membresías", slug: run, timezone: "America/Mexico_City" },
  });
  tenantId = tenant.id;
  const owner = await prisma.user.create({
    data: { email: `owner-${run}@test.local` },
  });
  ownerId = owner.id;
  const stranger = await prisma.user.create({
    data: { email: `stranger-${run}@test.local` },
  });
  strangerId = stranger.id;
  await prisma.membership.create({
    data: { userId: ownerId, tenantId, role: "owner" },
  });
});

afterAll(async () => {
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  await prisma.$disconnect();
});

describe("membresías y resolución de tenant", () => {
  it("resuelve el tenant por slug", async () => {
    const tenant = await getTenantBySlug(run);
    expect(tenant?.id).toBe(tenantId);
    expect(await getTenantBySlug(`${run}-nope`)).toBeNull();
  });

  it("devuelve el rol del miembro y null para quien no pertenece", async () => {
    const m = await getMembership(ownerId, tenantId);
    expect(m?.role).toBe("owner");
    expect(await getMembership(strangerId, tenantId)).toBeNull();
  });

  it("lista las barberías de un usuario con su tenant", async () => {
    const list = await getMembershipsWithTenant(ownerId);
    expect(list.map((m) => m.tenant.slug)).toContain(run);
    expect(await getMembershipsWithTenant(strangerId)).toHaveLength(0);
  });
});

describe("validación de slugs", () => {
  it("acepta slugs válidos", () => {
    for (const s of ["la-cueva", "barberia-2", "abc"]) {
      expect(SLUG_RE.test(s)).toBe(true);
    }
  });

  it("rechaza slugs inválidos", () => {
    for (const s of ["ab", "-cueva", "cueva-", "La Cueva", "ñandu", "a".repeat(41)]) {
      expect(SLUG_RE.test(s)).toBe(false);
    }
  });

  it("las rutas del sistema están reservadas", () => {
    for (const s of ["admin", "api", "login", "b", "www"]) {
      expect(RESERVED_SLUGS.has(s)).toBe(true);
    }
  });
});
