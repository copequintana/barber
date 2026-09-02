import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPublicCatalog } from "@/lib/catalog";
import { prisma, withTenant } from "@/lib/db";

const run = `cat-${Date.now().toString(36)}`;

let tenantId: string;
let activeBarberId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: "Test catálogo", slug: run, timezone: "America/Mexico_City" },
  });
  tenantId = tenant.id;

  await withTenant(tenantId, async (tx) => {
    const activeBarber = await tx.barber.create({
      data: { tenantId, displayName: "Activo" },
    });
    activeBarberId = activeBarber.id;
    const inactiveBarber = await tx.barber.create({
      data: { tenantId, displayName: "Inactivo", active: false },
    });

    const mk = (name: string, extra?: { active?: boolean }) =>
      tx.service.create({
        data: {
          tenantId,
          name,
          durationMin: 30,
          price: 100,
          ...extra,
        },
      });

    const conBarbero = await mk("Con barbero activo");
    const sinBarbero = await mk("Sin barbero");
    const soloInactivo = await mk("Solo barbero inactivo");
    const desactivado = await mk("Servicio desactivado", { active: false });

    await tx.barberService.createMany({
      data: [
        { tenantId, barberId: activeBarber.id, serviceId: conBarbero.id },
        { tenantId, barberId: inactiveBarber.id, serviceId: soloInactivo.id },
        { tenantId, barberId: activeBarber.id, serviceId: desactivado.id },
      ],
    });
    void sinBarbero;
  });
});

afterAll(async () => {
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("catálogo público", () => {
  it("solo publica servicios activos con al menos un barbero activo", async () => {
    const { services } = await getPublicCatalog(tenantId);
    expect(services.map((s) => s.name)).toEqual(["Con barbero activo"]);
  });

  it("solo publica barberos activos", async () => {
    const { barbers } = await getPublicCatalog(tenantId);
    expect(barbers.map((b) => b.id)).toEqual([activeBarberId]);
  });
});
