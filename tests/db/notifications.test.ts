import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminCreateAppointment } from "@/lib/admin-appointments";
import { prisma, withTenant } from "@/lib/db";
import {
  notifyStaffNewBooking,
  sendAppointmentEmail,
} from "@/lib/notifications";

/**
 * Sin RESEND_API_KEY, el transporte "consola" reporta éxito: aquí se prueba
 * la orquestación (idempotencia, destinatarios, registro en `notifications`),
 * no el proveedor.
 */

const run = `ntf-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";

let tenantId: string;
let apptWithEmail: string;
let apptNoEmail: string;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { email: `owner-${run}@test.local` },
  });
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test notifs",
      slug: run,
      timezone: TZ,
      memberships: { create: { userId: owner.id, role: "owner" } },
    },
  });
  tenantId = tenant.id;

  const { barberId, serviceId } = await withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.create({
      data: { tenantId, displayName: "B" },
    });
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, price: 200 },
    });
    await tx.barberService.create({
      data: { tenantId, barberId: barber.id, serviceId: service.id },
    });
    return { barberId: barber.id, serviceId: service.id };
  });

  const a1 = await adminCreateAppointment({
    tenantId,
    barberId,
    serviceId,
    startLocal: "2026-10-06T10:00",
    customer: { name: "Con Email", phone: `581-${run}` },
  });
  const a2 = await adminCreateAppointment({
    tenantId,
    barberId,
    serviceId,
    startLocal: "2026-10-06T11:00",
    customer: { name: "Sin Email", phone: `582-${run}` },
  });
  if (!a1.ok || !a2.ok) throw new Error("fixture");
  apptWithEmail = a1.appointmentId;
  apptNoEmail = a2.appointmentId;

  await withTenant(tenantId, (tx) =>
    tx.customer.updateMany({
      where: { phone: `581-${run}` },
      data: { email: `cliente-${run}@test.local` },
    }),
  );
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { email: { contains: run } } });
  await prisma.$disconnect();
});

describe("emails de cita", () => {
  it("envía la confirmación una sola vez (idempotente)", async () => {
    const first = await sendAppointmentEmail({
      tenantId,
      appointmentId: apptWithEmail,
      type: "confirmation",
    });
    expect(first).toEqual({ sent: true });

    const second = await sendAppointmentEmail({
      tenantId,
      appointmentId: apptWithEmail,
      type: "confirmation",
    });
    expect(second).toEqual({ sent: false, reason: "duplicate" });

    const rows = await withTenant(tenantId, (tx) =>
      tx.notification.findMany({
        where: { appointmentId: apptWithEmail, type: "confirmation" },
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("sent");
    expect(rows[0].sentAt).not.toBeNull();
  });

  it("cliente sin email → no_recipient y sin registro", async () => {
    const result = await sendAppointmentEmail({
      tenantId,
      appointmentId: apptNoEmail,
      type: "confirmation",
    });
    expect(result).toEqual({ sent: false, reason: "no_recipient" });
    const rows = await withTenant(tenantId, (tx) =>
      tx.notification.findMany({ where: { appointmentId: apptNoEmail } }),
    );
    expect(rows).toHaveLength(0);
  });

  it("la cancelación es un tipo aparte con su propia idempotencia", async () => {
    const result = await sendAppointmentEmail({
      tenantId,
      appointmentId: apptWithEmail,
      type: "cancellation",
    });
    expect(result).toEqual({ sent: true });
    const rows = await withTenant(tenantId, (tx) =>
      tx.notification.findMany({ where: { appointmentId: apptWithEmail } }),
    );
    expect(rows.map((r) => r.type).sort()).toEqual([
      "cancellation",
      "confirmation",
    ]);
  });

  it("aviso al staff: llega a los owners/admins y también es idempotente", async () => {
    const first = await notifyStaffNewBooking({
      tenantId,
      appointmentId: apptNoEmail,
    });
    expect(first).toEqual({ sent: true });
    const second = await notifyStaffNewBooking({
      tenantId,
      appointmentId: apptNoEmail,
    });
    expect(second).toEqual({ sent: false, reason: "duplicate" });
  });

  it("cita inexistente → not_found", async () => {
    const result = await sendAppointmentEmail({
      tenantId,
      appointmentId: "00000000-0000-0000-0000-000000000000",
      type: "confirmation",
    });
    expect(result).toEqual({ sent: false, reason: "not_found" });
  });
});
