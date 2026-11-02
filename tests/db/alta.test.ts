import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setPasswordEmail } from "@/lib/email/templates";
import { canManageBarbershop, createBarbershop, listCreatedBy, ownerNeedingPassword, PlatformError, type NewBarbershop } from "@/lib/platform";
import { slugify, slugProblem } from "@/lib/slugs";

const run = Date.now().toString(36);
const tenants: string[] = [];
const emails: string[] = [];
let vendor: { id: string; email: string };
let other: { id: string; email: string };

function input(tag: string, overrides: Partial<NewBarbershop> = {}): NewBarbershop {
  const ownerEmail = `dueno-${tag}-${run}@t.l`;
  emails.push(ownerEmail);
  return {
    name: `Barbería ${tag} ${run}`,
    slug: `alta-${tag}-${run}`,
    timezone: "America/Hermosillo",
    currency: "MXN",
    ownerName: `Dueño ${tag}`,
    ownerEmail,
    ...overrides,
  };
}

async function create(data: NewBarbershop, actor = vendor) {
  const result = await createBarbershop(actor, data);
  tenants.push(result.tenant.id);
  return result;
}

beforeAll(async () => {
  for (const tag of ["vendedor", "otro"]) emails.push(`${tag}-alta-${run}@t.l`);
  const v = await prisma.user.create({ data: { email: `vendedor-alta-${run}@t.l`, isVendor: true } });
  const o = await prisma.user.create({ data: { email: `otro-alta-${run}@t.l`, isVendor: true } });
  vendor = { id: v.id, email: v.email };
  other = { id: o.id, email: o.email };
});

afterAll(async () => {
  await prisma.platformAuditLog.deleteMany({ where: { userId: { in: [vendor?.id, other?.id].filter(Boolean) as string[] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe("alta de barberías desde la plataforma", () => {
  it("crea la barbería con su dueño, deja la invitación pendiente y registra quién la dio de alta", async () => {
    const data = input("nueva");
    const { tenant, owner, needsPassword } = await create(data);
    expect(tenant.slug).toBe(data.slug);
    expect(tenant.timezone).toBe("America/Hermosillo");
    expect(needsPassword).toBe(true);
    const membership = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: owner.id, tenantId: tenant.id } } });
    expect(membership?.role).toBe("owner");
    expect((await ownerNeedingPassword(tenant.id))?.email).toBe(data.ownerEmail);
    const log = await prisma.platformAuditLog.findFirst({ where: { tenantId: tenant.id, action: "create_tenant" } });
    expect(log?.userId).toBe(vendor.id);
  });

  it("cada vendedor ve y administra solo las que dio de alta", async () => {
    const { tenant } = await create(input("propia"));
    expect((await listCreatedBy(vendor.id)).some((t) => t.id === tenant.id)).toBe(true);
    expect((await listCreatedBy(other.id)).some((t) => t.id === tenant.id)).toBe(false);
    expect(await canManageBarbershop(vendor, tenant.id, false)).toBe(true);
    expect(await canManageBarbershop(other, tenant.id, false)).toBe(false);
    expect(await canManageBarbershop(other, tenant.id, true)).toBe(true);
  });

  it("no deja usar un link ocupado, reservado o mal escrito", async () => {
    const taken = input("ocupado");
    await create(taken);
    await expect(createBarbershop(vendor, input("dup", { slug: taken.slug }))).rejects.toThrow(PlatformError);
    await expect(createBarbershop(vendor, input("res", { slug: "platform" }))).rejects.toThrow(/reservado/);
    await expect(createBarbershop(vendor, input("mal", { slug: "La Cueva" }))).rejects.toThrow(PlatformError);
  });

  it("el link se sugiere desde el nombre y explica qué está mal", () => {
    expect(slugify("Barbería El Patrón")).toBe("barberia-el-patron");
    expect(slugProblem("la-cueva")).toBeNull();
    expect(slugProblem("ab")).toMatch(/al menos 3/);
    expect(slugProblem("demo")).toMatch(/reservado/);
  });

  it("el correo de invitación del dueño nombra su barbería", () => {
    const { html } = setPasswordEmail({ url: "https://x.test/r", isNewAccount: true, tenantName: "La Cueva", role: "owner" });
    expect(html).toContain("Dimos de alta <strong>La Cueva</strong>");
  });
});
