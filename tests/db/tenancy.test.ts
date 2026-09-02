import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant, isOverlapError } from "@/lib/db";

/**
 * Tests de integración contra el Postgres de desarrollo (Docker).
 * Verifican los dos invariantes de la Fase 0:
 *  1. Aislamiento entre tenants vía RLS.
 *  2. Imposibilidad de doble reserva vía constraint EXCLUDE.
 */

const run = Date.now().toString(36);

type Ctx = {
  tenantId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
};

let a: Ctx;
let b: Ctx;

async function createTenantFixture(slug: string): Promise<Ctx> {
  const tenant = await prisma.tenant.create({
    data: {
      name: `Test ${slug}`,
      slug: `${slug}-${run}`,
      timezone: "America/Mexico_City",
    },
  });
  return withTenant(tenant.id, async (tx) => {
    const barber = await tx.barber.create({
      data: { tenantId: tenant.id, displayName: `Barbero ${slug}` },
    });
    const service = await tx.service.create({
      data: {
        tenantId: tenant.id,
        name: "Corte",
        durationMin: 30,
        price: 200,
      },
    });
    const customer = await tx.customer.create({
      data: {
        tenantId: tenant.id,
        name: `Cliente ${slug}`,
        phone: `555-${slug}-${run}`,
      },
    });
    return {
      tenantId: tenant.id,
      barberId: barber.id,
      serviceId: service.id,
      customerId: customer.id,
    };
  });
}

beforeAll(async () => {
  a = await createTenantFixture("tenant-a");
  b = await createTenantFixture("tenant-b");
});

afterAll(async () => {
  // El delete de tenants cascadea a las tablas de negocio (las acciones
  // referenciales de Postgres no pasan por RLS).
  await prisma.tenant.deleteMany({
    where: { id: { in: [a.tenantId, b.tenantId] } },
  });
  await prisma.$disconnect();
});

describe("aislamiento RLS entre tenants", () => {
  it("con el tenant A activo solo se leen datos de A", async () => {
    const barbers = await withTenant(a.tenantId, (tx) =>
      tx.barber.findMany(),
    );
    expect(barbers.length).toBeGreaterThan(0);
    expect(barbers.every((x) => x.tenantId === a.tenantId)).toBe(true);
    expect(barbers.some((x) => x.id === b.barberId)).toBe(false);
  });

  it("el tenant A no puede modificar filas del tenant B", async () => {
    const result = await withTenant(a.tenantId, (tx) =>
      tx.barber.updateMany({
        where: { id: b.barberId },
        data: { displayName: "hackeado" },
      }),
    );
    expect(result.count).toBe(0);

    const untouched = await withTenant(b.tenantId, (tx) =>
      tx.barber.findUniqueOrThrow({ where: { id: b.barberId } }),
    );
    expect(untouched.displayName).toBe("Barbero tenant-b");
  });

  it("el tenant A no puede borrar filas del tenant B", async () => {
    const result = await withTenant(a.tenantId, (tx) =>
      tx.barber.deleteMany({ where: { id: b.barberId } }),
    );
    expect(result.count).toBe(0);
  });

  it("sin contexto de tenant no se lee ninguna fila (deny por defecto)", async () => {
    const barbers = await prisma.barber.findMany({
      where: { tenantId: { in: [a.tenantId, b.tenantId] } },
    });
    expect(barbers).toHaveLength(0);
  });

  it("el tenant A no puede insertar filas a nombre del tenant B", async () => {
    await expect(
      withTenant(a.tenantId, (tx) =>
        tx.barber.create({
          data: { tenantId: b.tenantId, displayName: "intruso" },
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("constraint anti-solape en appointments", () => {
  function makeAppointment(ctx: Ctx, startsAt: Date, endsAt: Date) {
    return withTenant(ctx.tenantId, (tx) =>
      tx.appointment.create({
        data: {
          tenantId: ctx.tenantId,
          barberId: ctx.barberId,
          customerId: ctx.customerId,
          serviceId: ctx.serviceId,
          startsAt,
          endsAt,
          priceAtBooking: 200,
        },
      }),
    );
  }

  const base = new Date("2026-09-01T16:00:00Z");
  const at = (offsetMin: number) =>
    new Date(base.getTime() + offsetMin * 60000);

  it("rechaza una cita que se solapa con otra del mismo barbero", async () => {
    await makeAppointment(a, at(0), at(30));
    await expect(makeAppointment(a, at(15), at(45))).rejects.toSatisfy(
      isOverlapError,
    );
  });

  it("permite citas contiguas (el fin de una es el inicio de la otra)", async () => {
    // tstzrange usa rangos semiabiertos [inicio, fin): 16:30 no choca con 16:00–16:30
    const next = await makeAppointment(a, at(30), at(60));
    expect(next.id).toBeTruthy();
  });

  it("una cita cancelada libera el horario", async () => {
    const appt = await makeAppointment(a, at(120), at(150));
    await withTenant(a.tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt.id },
        data: { status: "cancelled" },
      }),
    );
    const again = await makeAppointment(a, at(120), at(150));
    expect(again.id).toBeTruthy();
  });

  it("bajo concurrencia, exactamente una de dos reservas al mismo slot gana", async () => {
    const results = await Promise.allSettled([
      makeAppointment(a, at(240), at(270)),
      makeAppointment(a, at(240), at(270)),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(
      isOverlapError((failed[0] as PromiseRejectedResult).reason),
    ).toBe(true);
  });

  it("el mismo horario en otro barbero (otro tenant) no choca", async () => {
    const appt = await makeAppointment(b, at(0), at(30));
    expect(appt.id).toBeTruthy();
  });
});
