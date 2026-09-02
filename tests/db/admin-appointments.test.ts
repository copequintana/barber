import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminCancelAppointment,
  adminCreateAppointment,
  adminMoveAppointment,
  getAgendaData,
} from "@/lib/admin-appointments";
import { cancelBookingByToken } from "@/lib/booking";
import { prisma, withTenant } from "@/lib/db";

const run = `adm-${Date.now().toString(36)}`;
const TZ = "America/Mexico_City";
// Martes: día laboral del fixture
const DAY = "2026-10-06";

let tenantId: string;
let barberA: string;
let barberB: string;
let serviceId: string;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: { name: "Test agenda", slug: run, timezone: TZ },
  });
  tenantId = tenant.id;

  await withTenant(tenantId, async (tx) => {
    const a = await tx.barber.create({ data: { tenantId, displayName: "A" } });
    const b = await tx.barber.create({ data: { tenantId, displayName: "B" } });
    barberA = a.id;
    barberB = b.id;
    const service = await tx.service.create({
      data: { tenantId, name: "Corte", durationMin: 30, bufferMin: 5, price: 200 },
    });
    serviceId = service.id;
    // Solo A ofrece el servicio (B servirá para probar el rechazo al mover)
    await tx.barberService.create({
      data: { tenantId, barberId: barberA, serviceId },
    });
    await tx.workingHour.createMany({
      data: [
        { tenantId, barberId: barberA, weekday: 2, startMin: 600, endMin: 780 },
      ],
    });
  });
});

afterAll(async () => {
  await withTenant(tenantId, (tx) => tx.appointment.deleteMany({}));
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("citas creadas por el staff (walk-ins)", () => {
  it("crea sin restricción de antelación ni grilla y con buffer en ends_at", async () => {
    const result = await adminCreateAppointment({
      tenantId,
      barberId: barberA,
      serviceId,
      startLocal: `${DAY}T10:07`, // fuera de grilla: al staff no le aplica
      customer: { name: "Walk In", phone: `571-${run}` },
    });
    expect(result.ok).toBe(true);

    const appt = await withTenant(tenantId, (tx) =>
      tx.appointment.findFirstOrThrow({ where: { barberId: barberA } }),
    );
    // 30 + 5 de buffer
    expect(
      (appt.endsAt.getTime() - appt.startsAt.getTime()) / 60_000,
    ).toBe(35);
  });

  it("rechaza el choque con mensaje tipado (no un 500)", async () => {
    const result = await adminCreateAppointment({
      tenantId,
      barberId: barberA,
      serviceId,
      startLocal: `${DAY}T10:20`, // pisa la de 10:07–10:42
      customer: { name: "Choca", phone: `572-${run}` },
    });
    expect(result).toEqual({ ok: false, error: "overlap" });
  });

  it("rechaza barbero que no ofrece el servicio", async () => {
    const result = await adminCreateAppointment({
      tenantId,
      barberId: barberB,
      serviceId,
      startLocal: `${DAY}T11:00`,
      customer: { name: "No Ofrecido", phone: `573-${run}` },
    });
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("mover y cancelar desde la agenda", () => {
  it("mueve la cita revalidando contra el constraint", async () => {
    const second = await adminCreateAppointment({
      tenantId,
      barberId: barberA,
      serviceId,
      startLocal: `${DAY}T12:00`,
      customer: { name: "Se mueve", phone: `574-${run}` },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    // Moverla encima de la primera → overlap
    const clash = await adminMoveAppointment({
      tenantId,
      appointmentId: second.appointmentId,
      startLocal: `${DAY}T10:10`,
    });
    expect(clash).toEqual({ ok: false, error: "overlap" });

    // Moverla a un hueco válido → ok y ends_at recalculado
    const moved = await adminMoveAppointment({
      tenantId,
      appointmentId: second.appointmentId,
      startLocal: `${DAY}T12:30`,
    });
    expect(moved.ok).toBe(true);
  });

  it("cancelación del staff queda marcada como 'shop' con motivo", async () => {
    const appt = await adminCreateAppointment({
      tenantId,
      barberId: barberA,
      serviceId,
      startLocal: `${DAY}T16:00`,
      customer: { name: "Cancelada", phone: `575-${run}` },
    });
    if (!appt.ok) throw new Error("fixture");

    const result = await adminCancelAppointment({
      tenantId,
      appointmentId: appt.appointmentId,
      reason: "El barbero se enfermó",
    });
    expect(result.ok).toBe(true);

    const row = await withTenant(tenantId, (tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: appt.appointmentId } }),
    );
    expect(row.status).toBe("cancelled");
    expect(row.cancelledBy).toBe("shop");
    expect(row.cancelReason).toBe("El barbero se enfermó");

    // Estados finales no se mueven ni re-cancelan
    expect(
      await adminMoveAppointment({
        tenantId,
        appointmentId: appt.appointmentId,
        startLocal: `${DAY}T17:00`,
      }),
    ).toEqual({ ok: false, error: "not_editable" });
  });

  it("la cancelación del cliente queda marcada como 'customer'", async () => {
    const appt = await adminCreateAppointment({
      tenantId,
      barberId: barberA,
      serviceId,
      startLocal: `${DAY}T17:00`,
      customer: { name: "Cliente cancela", phone: `576-${run}` },
    });
    if (!appt.ok) throw new Error("fixture");
    const row = await withTenant(tenantId, (tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: appt.appointmentId } }),
    );
    const result = await cancelBookingByToken(
      tenantId,
      row.cancelToken,
      new Date("2026-10-01T12:00:00Z"),
    );
    expect(result.ok).toBe(true);
    const after = await withTenant(tenantId, (tx) =>
      tx.appointment.findUniqueOrThrow({ where: { id: appt.appointmentId } }),
    );
    expect(after.cancelledBy).toBe("customer");
  });
});

describe("datos de la agenda", () => {
  it("trae citas, bloqueos y horarios del rango; excluye canceladas", async () => {
    const data = await getAgendaData(tenantId, TZ, DAY, 1);
    expect(data).not.toBeNull();
    const statuses = data!.appointments.map((a) => a.status);
    expect(statuses).not.toContain("cancelled");
    expect(data!.appointments.length).toBeGreaterThanOrEqual(2);
    expect(data!.workingHours.length).toBeGreaterThan(0);
    expect(data!.barbers.map((b) => b.displayName)).toContain("A");
  });
});
