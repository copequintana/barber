"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(60),
  durationMin: z.coerce
    .number()
    .int("Duración inválida")
    .min(5, "Duración mínima: 5 min")
    .max(480, "Duración máxima: 8 h"),
  bufferMin: z.coerce
    .number()
    .int("Buffer inválido")
    .min(0)
    .max(120, "Buffer máximo: 120 min"),
  price: z.coerce.number().min(0, "Precio inválido").max(1_000_000),
});

function parseService(formData: FormData, path: string) {
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    durationMin: formData.get("durationMin"),
    bufferMin: formData.get("bufferMin") ?? 0,
    price: formData.get("price"),
  });
  if (!parsed.success) fail(path, parsed.error.issues[0].message);
  return parsed.data;
}

export async function createService(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const data = parseService(formData, "/admin/services");

  const service = await withTenant(ctx.tenantId, async (tx) => {
    const last = await tx.service.aggregate({ _max: { sortOrder: true } });
    return tx.service.create({
      data: {
        ...data,
        tenantId: ctx.tenantId,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
  });
  revalidatePath("/admin/services");
  redirect(`/admin/services/${service.id}`);
}

export async function updateService(serviceId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = `/admin/services/${serviceId}`;
  const data = parseService(formData, path);
  const active = formData.get("active") === "on";

  const updated = await withTenant(ctx.tenantId, (tx) =>
    tx.service.updateMany({
      where: { id: serviceId },
      data: { ...data, active },
    }),
  );
  if (updated.count === 0) fail("/admin/services", "Servicio no encontrado");

  revalidatePath("/admin/services");
  revalidatePath(path);
  redirect(`${path}?ok=1`);
}

/** Intercambia sortOrder con el vecino anterior/siguiente. */
export async function moveService(serviceId: string, direction: "up" | "down") {
  const ctx = await requireTenantRole("owner", "admin");

  await withTenant(ctx.tenantId, async (tx) => {
    const service = await tx.service.findUnique({ where: { id: serviceId } });
    if (!service) return;
    const neighbor = await tx.service.findFirst({
      where:
        direction === "up"
          ? { sortOrder: { lt: service.sortOrder } }
          : { sortOrder: { gt: service.sortOrder } },
      orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return;
    await tx.service.update({
      where: { id: service.id },
      data: { sortOrder: neighbor.sortOrder },
    });
    await tx.service.update({
      where: { id: neighbor.id },
      data: { sortOrder: service.sortOrder },
    });
  });
  revalidatePath("/admin/services");
  redirect("/admin/services");
}

/**
 * Borrado definitivo. La FK de appointments es Restrict: si el servicio tiene
 * citas (históricas o futuras), no se puede borrar — se desactiva en su lugar.
 */
export async function deleteService(serviceId: string) {
  const ctx = await requireTenantRole("owner", "admin");
  try {
    await withTenant(ctx.tenantId, (tx) =>
      tx.service.deleteMany({ where: { id: serviceId } }),
    );
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      fail(
        `/admin/services/${serviceId}`,
        "Este servicio tiene citas registradas: desactívalo en lugar de borrarlo.",
      );
    }
    throw e;
  }
  revalidatePath("/admin/services");
  redirect("/admin/services");
}
