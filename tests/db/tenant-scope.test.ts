import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TenantMismatchError, prisma, withTenant, withTenantOn } from "@/lib/db";

const run = Date.now().toString(36);
const privileged = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
  }),
});

type Fixture = { tenantId: string; barberId: string; customerId: string };
let a: Fixture;
let b: Fixture;

async function fixture(slug: string): Promise<Fixture> {
  const tenant = await prisma.tenant.create({
    data: { name: `Scope ${slug}`, slug: `scope-${slug}-${run}`, timezone: "America/Mexico_City" },
  });
  return withTenant(tenant.id, async (tx) => {
    const barber = await tx.barber.create({ data: { tenantId: tenant.id, displayName: `Barbero ${slug}` } });
    const customer = await tx.customer.create({
      data: { tenantId: tenant.id, name: `Cliente ${slug}`, phone: `555-${slug}-${run}` },
    });
    return { tenantId: tenant.id, barberId: barber.id, customerId: customer.id };
  });
}

beforeAll(async () => {
  a = await fixture("a");
  b = await fixture("b");
});

afterAll(async () => {
  for (const f of [a, b]) {
    if (!f) continue;
    await withTenant(f.tenantId, async (tx) => {
      await tx.customer.deleteMany({});
      await tx.barber.deleteMany({});
    });
    await prisma.tenant.delete({ where: { id: f.tenantId } });
  }
  await privileged.$disconnect();
});

describe("aislamiento por barbería sin depender de RLS", () => {
  it("la conexión privilegiada de verdad se salta RLS", async () => {
    const [rol] = await privileged.$queryRaw<{ bypass: boolean }[]>`
      SELECT (rolsuper OR rolbypassrls) AS bypass FROM pg_roles WHERE rolname = current_user`;
    expect(rol.bypass).toBe(true);
  });

  it("las lecturas solo devuelven filas de la barbería activa", async () => {
    await withTenantOn(privileged, a.tenantId, async (tx) => {
      const barbers = await tx.barber.findMany();
      expect(barbers.map((x) => x.id)).toEqual([a.barberId]);
      expect(await tx.customer.count()).toBe(1);
      expect(await tx.barber.findUnique({ where: { id: b.barberId } })).toBeNull();
      expect(await tx.barber.findFirst({ where: { id: b.barberId } })).toBeNull();
    });
  });

  it("no se pueden modificar ni borrar filas de otra barbería", async () => {
    await expect(
      withTenantOn(privileged, a.tenantId, (tx) =>
        tx.barber.update({ where: { id: b.barberId }, data: { displayName: "Intruso" } }),
      ),
    ).rejects.toThrow();
    const borrados = await withTenantOn(privileged, a.tenantId, (tx) =>
      tx.customer.deleteMany({ where: { id: b.customerId } }),
    );
    expect(borrados.count).toBe(0);
    const intacto = await withTenant(b.tenantId, (tx) => tx.barber.findUnique({ where: { id: b.barberId } }));
    expect(intacto?.displayName).toBe("Barbero b");
  });

  it("las altas quedan en la barbería activa y rechazan otra", async () => {
    await expect(
      withTenantOn(privileged, a.tenantId, (tx) =>
        tx.barber.create({ data: { tenantId: b.tenantId, displayName: "Cruzado" } }),
      ),
    ).rejects.toBeInstanceOf(TenantMismatchError);
    await expect(
      withTenantOn(privileged, a.tenantId, (tx) =>
        tx.barber.update({ where: { id: a.barberId }, data: { tenantId: b.tenantId } }),
      ),
    ).rejects.toBeInstanceOf(TenantMismatchError);
  });
});
