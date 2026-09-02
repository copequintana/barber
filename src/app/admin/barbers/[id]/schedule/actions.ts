"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { hhmmToMinutes, localInputToUtc, rangesOverlap } from "@/lib/time";

function schedulePath(barberId: string) {
  return `/admin/barbers/${barberId}/schedule`;
}

function fail(barberId: string, message: string): never {
  redirect(`${schedulePath(barberId)}?error=${encodeURIComponent(message)}`);
}

function done(barberId: string, extra = ""): never {
  revalidatePath(schedulePath(barberId));
  redirect(`${schedulePath(barberId)}?ok=1${extra}`);
}

const weekdaySchema = z.coerce.number().int().min(0).max(6);

export async function addWorkingHour(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const weekday = weekdaySchema.safeParse(formData.get("weekday"));
  if (!weekday.success) fail(barberId, "Día inválido");
  let startMin: number, endMin: number;
  try {
    startMin = hhmmToMinutes(String(formData.get("start") ?? ""));
    endMin = hhmmToMinutes(String(formData.get("end") ?? ""));
  } catch {
    fail(barberId, "Hora inválida");
  }
  if (endMin <= startMin) fail(barberId, "La hora de fin debe ser mayor que la de inicio");

  await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id: barberId } });
    if (!barber) fail(barberId, "Barbero no encontrado");

    const existing = await tx.workingHour.findMany({
      where: { barberId, weekday: weekday.data },
    });
    if (existing.some((w) => rangesOverlap(startMin, endMin, w.startMin, w.endMin))) {
      fail(barberId, "La franja se solapa con otra del mismo día");
    }
    await tx.workingHour.create({
      data: {
        tenantId: ctx.tenantId,
        barberId,
        weekday: weekday.data,
        startMin,
        endMin,
      },
    });
  });
  done(barberId);
}

export async function deleteWorkingHour(barberId: string, id: string) {
  const ctx = await requireTenantRole("owner", "admin");
  await withTenant(ctx.tenantId, (tx) =>
    tx.workingHour.deleteMany({ where: { id, barberId } }),
  );
  done(barberId);
}

/** Reemplaza las franjas de los días destino con las del día origen. */
export async function copyDay(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const from = weekdaySchema.safeParse(formData.get("from"));
  if (!from.success) fail(barberId, "Día origen inválido");
  const targets = formData
    .getAll("to")
    .map((v) => weekdaySchema.safeParse(v))
    .filter((r) => r.success)
    .map((r) => r.data)
    .filter((d) => d !== from.data);
  if (targets.length === 0) fail(barberId, "Elige al menos un día destino");

  await withTenant(ctx.tenantId, async (tx) => {
    const source = await tx.workingHour.findMany({
      where: { barberId, weekday: from.data },
    });
    await tx.workingHour.deleteMany({
      where: { barberId, weekday: { in: targets } },
    });
    if (source.length > 0) {
      await tx.workingHour.createMany({
        data: targets.flatMap((weekday) =>
          source.map((s) => ({
            tenantId: ctx.tenantId,
            barberId,
            weekday,
            startMin: s.startMin,
            endMin: s.endMin,
          })),
        ),
      });
    }
  });
  done(barberId);
}

export async function addTimeOff(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = await getTenantById(ctx.tenantId);
  if (!tenant) fail(barberId, "Tenant no encontrado");

  const startsAt = localInputToUtc(
    tenant.timezone,
    String(formData.get("startsAt") ?? ""),
  );
  const endsAt = localInputToUtc(
    tenant.timezone,
    String(formData.get("endsAt") ?? ""),
  );
  if (!startsAt || !endsAt) fail(barberId, "Fecha u hora inválida");
  if (endsAt <= startsAt) fail(barberId, "El fin debe ser posterior al inicio");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const affected = await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id: barberId } });
    if (!barber) fail(barberId, "Barbero no encontrado");

    await tx.timeOff.create({
      data: { tenantId: ctx.tenantId, barberId, startsAt, endsAt, reason },
    });
    // Advertir (sin cancelar) sobre citas activas pisadas por el bloqueo
    return tx.appointment.count({
      where: {
        barberId,
        status: { in: ["pending", "confirmed"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
  });
  done(barberId, affected > 0 ? `&warn=${affected}` : "");
}

export async function deleteTimeOff(barberId: string, id: string) {
  const ctx = await requireTenantRole("owner", "admin");
  await withTenant(ctx.tenantId, (tx) =>
    tx.timeOff.deleteMany({ where: { id, barberId } }),
  );
  done(barberId);
}
