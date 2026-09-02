import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminCreateAppointment } from "@/lib/admin-appointments";
import { prisma, withTenant } from "@/lib/db";
import { autoCompletePast, runTenantReminders } from "@/lib/reminders";

const run = `rem-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
// "Ahora" de referencia: martes 10:00 local (16:00Z)
const NOW = new Date("2026-10-06T16:00:00Z");

let tenantId: string;
let barberId: string;
let serviceId: string;

function tenantRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: tenantId,
    timezone: TZ,
    reminder24hEnabled: true,
    reminder2hEnabled: true,
    whatsappEnabled: false,
    autoCompleteHours: 24,
    ...overrides,
  } as Parameters<typeof runTenantReminders>[0];
}

async function makeAppt(startLocal: string, phone: string, email?: string) {
  const result = await adminCreateAppointment({
    tenantId,
    barberId,
    serviceId,
    startLocal,
    customer: { name: "Cliente R", phone },
  });
  if (!result.ok) throw new Error(`fixture: ${result.error}`);
  if (email) {
    await withTenant(tenantId, (tx) =>
      tx.customer.updateMany({ where: { phone }, data: { email } }),
    );
  }
  return result.appointmentId;
}

async function notifTypes(appointmentId: string) {
  const rows = await withTenant(tenantId, (tx) =>
    tx.notification.findMany({ where: { appointmentId } }),
  );
  return rows.map((r) => `${r.type}:${r.channel}:${r.status}`).sort();
}

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: "Test reminders", slug: run, timezone: TZ },
  });
  tenantId = tenant.id;
  await withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.create({
      data: { tenantId, displayName: "R" },
    });
    barberId = barber.id;
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, price: 200 },
    });
    serviceId = service.id;
    await tx.barberService.create({
      data: { tenantId, barberId, serviceId },
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("recordatorios", () => {
  it("envía T-2h a la cita dentro de esa ventana y es idempotente", async () => {
    // Cita hoy 11:30 local (en 1.5h). Creada "antes" (createdAt real es ahora,
    // pero NOW de referencia es futuro-pasado…): ajustamos createdAt a mano.
    const appt = await makeAppt("2026-10-06T11:30", `591-${run}`, `r1-${run}@t.l`);
    await withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt },
        data: { createdAt: new Date("2026-10-01T00:00:00Z") },
      }),
    );

    const first = await runTenantReminders(tenantRow(), NOW);
    expect(first.sent).toBeGreaterThanOrEqual(1);

    const types = await notifTypes(appt);
    expect(types).toContain("reminder_2h:email:sent");
    // 11:30 también está dentro de la ventana de 24h → ambos se emiten
    expect(types).toContain("reminder_24h:email:sent");

    const again = await runTenantReminders(tenantRow(), NOW);
    expect(again.sent).toBe(0); // idempotente
  });

  it("cita creada dentro de la ventana no recibe ese recordatorio", async () => {
    // Cita 12:00 local creada a las 10:30 local (1.5 h antes): los momentos
    // de ambos recordatorios ya habían pasado al crearla → nada que enviar
    const appt = await makeAppt("2026-10-06T12:00", `592-${run}`, `r2-${run}@t.l`);
    await withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt },
        data: { createdAt: new Date("2026-10-06T16:30:00Z") },
      }),
    );
    await runTenantReminders(tenantRow(), new Date("2026-10-06T16:45:00Z"));
    expect(await notifTypes(appt)).toEqual([]);
  });

  it("cita lejana (fuera de ventana) no recibe nada aún", async () => {
    const appt = await makeAppt("2026-10-08T12:00", `593-${run}`, `r3-${run}@t.l`);
    await withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt },
        data: { createdAt: new Date("2026-10-01T00:00:00Z") },
      }),
    );
    await runTenantReminders(tenantRow(), NOW);
    expect(await notifTypes(appt)).toEqual([]);
  });

  it("con WhatsApp activado usa ese canal (transporte de desarrollo)", async () => {
    const appt = await makeAppt("2026-10-06T13:00", `5215512345678`);
    await withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt },
        data: { createdAt: new Date("2026-10-01T00:00:00Z") },
      }),
    );
    await runTenantReminders(tenantRow({ whatsappEnabled: true }), NOW);
    // La cita está a 3 h: solo aplica el recordatorio de 24 h (aún no el de 2 h)
    expect(await notifTypes(appt)).toEqual(["reminder_24h:whatsapp:sent"]);
  });

  it("recordatorios deshabilitados por el tenant no se envían", async () => {
    const appt = await makeAppt("2026-10-06T14:00", `594-${run}`, `r5-${run}@t.l`);
    await withTenant(tenantId, (tx) =>
      tx.appointment.update({
        where: { id: appt },
        data: { createdAt: new Date("2026-10-01T00:00:00Z") },
      }),
    );
    await runTenantReminders(
      tenantRow({ reminder24hEnabled: false, reminder2hEnabled: false }),
      NOW,
    );
    expect(await notifTypes(appt)).toEqual([]);
  });
});

describe("cierre automático", () => {
  it("completa citas confirmadas terminadas hace más de N horas", async () => {
    const old = await makeAppt("2026-10-04T10:00", `595-${run}`); // hace 2 días
    const recent = await makeAppt("2026-10-06T08:00", `596-${run}`); // hoy temprano

    const count = await autoCompletePast(
      { id: tenantId, autoCompleteHours: 24 },
      NOW,
    );
    expect(count).toBe(1);

    const rows = await withTenant(tenantId, (tx) =>
      tx.appointment.findMany({ where: { id: { in: [old, recent] } } }),
    );
    const byId = new Map(rows.map((r) => [r.id, r.status]));
    expect(byId.get(old)).toBe("completed");
    expect(byId.get(recent)).toBe("confirmed"); // aún dentro de la gracia
  });
});
