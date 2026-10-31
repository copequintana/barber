import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { linkBarberAccount, unlinkBarberAccount } from "@/lib/barber-access";
import { prisma, withTenant } from "@/lib/db";

const run = `acc-${Date.now().toString(36)}`;
const mail = (name: string) => `${name}-${run}@test.local`;

let tenantA: string;
let tenantB: string;
let fichaA1: string;
let fichaA2: string;
let fichaB1: string;

async function createTenant(slug: string) {
  const tenant = await prisma.tenant.create({
    data: { name: `Acceso ${slug}`, slug: `${run}-${slug}`, timezone: "America/Hermosillo" },
  });
  return tenant.id;
}

async function createFicha(tenantId: string, displayName: string) {
  const barber = await withTenant(tenantId, (tx) =>
    tx.barber.create({ data: { tenantId, displayName } }),
  );
  return barber.id;
}

async function role(email: string, tenantId: string) {
  const membership = await prisma.membership.findFirst({ where: { tenantId, user: { email } } });
  return membership?.role ?? null;
}

async function linkedUser(tenantId: string, barberId: string) {
  const barber = await withTenant(tenantId, (tx) =>
    tx.barber.findUnique({ where: { id: barberId } }),
  );
  return barber?.userId ?? null;
}

beforeAll(async () => {
  tenantA = await createTenant("a");
  tenantB = await createTenant("b");
  fichaA1 = await createFicha(tenantA, "Chuy");
  fichaA2 = await createFicha(tenantA, "Dani");
  fichaB1 = await createFicha(tenantB, "Beto");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@test.local` } } });
  await prisma.$disconnect();
});

describe("acceso de los barberos a su panel", () => {
  it("ligar un correo crea la cuenta, el acceso de barbero y el vínculo con la ficha", async () => {
    const user = await linkBarberAccount(tenantA, fichaA1, mail("chuy"));
    expect(user?.email).toBe(mail("chuy"));
    expect(await role(mail("chuy"), tenantA)).toBe("barber");
    expect(await linkedUser(tenantA, fichaA1)).toBe(user!.id);
  });

  it("desvincular le quita el acceso pero conserva su cuenta y la ficha", async () => {
    expect(await unlinkBarberAccount(tenantA, fichaA1)).toBe(true);
    expect(await role(mail("chuy"), tenantA)).toBeNull();
    expect(await linkedUser(tenantA, fichaA1)).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: mail("chuy") } })).not.toBeNull();
  });

  it("ligar la ficha a otro correo le quita el acceso al anterior", async () => {
    await linkBarberAccount(tenantA, fichaA1, mail("viejo"));
    const nuevo = await linkBarberAccount(tenantA, fichaA1, mail("nuevo"));
    expect(await role(mail("viejo"), tenantA)).toBeNull();
    expect(await role(mail("nuevo"), tenantA)).toBe("barber");
    expect(await linkedUser(tenantA, fichaA1)).toBe(nuevo!.id);
    await unlinkBarberAccount(tenantA, fichaA1);
  });

  it("conserva el acceso mientras el usuario tenga otra ficha ligada", async () => {
    await linkBarberAccount(tenantA, fichaA1, mail("doble"));
    await linkBarberAccount(tenantA, fichaA2, mail("doble"));

    await unlinkBarberAccount(tenantA, fichaA1);
    expect(await role(mail("doble"), tenantA)).toBe("barber");

    await unlinkBarberAccount(tenantA, fichaA2);
    expect(await role(mail("doble"), tenantA)).toBeNull();
  });

  it("nunca le quita el acceso a un dueño que también atiende", async () => {
    const owner = await prisma.user.create({ data: { email: mail("dueno") } });
    await prisma.membership.create({ data: { userId: owner.id, tenantId: tenantA, role: "owner" } });

    await linkBarberAccount(tenantA, fichaA1, mail("dueno"));
    expect(await role(mail("dueno"), tenantA)).toBe("owner");

    await unlinkBarberAccount(tenantA, fichaA1);
    expect(await role(mail("dueno"), tenantA)).toBe("owner");
  });

  it("una ficha de otra barbería no crea cuentas ni accesos ni se puede desvincular", async () => {
    await linkBarberAccount(tenantB, fichaB1, mail("beto"));

    expect(await linkBarberAccount(tenantA, fichaB1, mail("intruso"))).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: mail("intruso") } })).toBeNull();

    expect(await unlinkBarberAccount(tenantA, fichaB1)).toBe(false);
    expect(await role(mail("beto"), tenantB)).toBe("barber");
    expect(await linkedUser(tenantB, fichaB1)).not.toBeNull();
  });
});
