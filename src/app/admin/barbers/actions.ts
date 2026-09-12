"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { z } from "zod";
import { prisma, withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const nameSchema = z.string().trim().min(2, "Nombre muy corto").max(60);

export async function createBarber(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const parsed = nameSchema.safeParse(formData.get("displayName"));
  if (!parsed.success) fail("/admin/barbers", parsed.error.issues[0].message);

  const barber = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.create({
      data: { tenantId: ctx.tenantId, displayName: parsed.data },
    }),
  );
  revalidatePath("/admin/barbers");
  redirect(`/admin/barbers/${barber.id}`);
}

const updateSchema = z.object({
  displayName: nameSchema,
  bio: z.string().trim().max(500).optional(),
  active: z.boolean(),
});

export async function updateBarber(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = `/admin/barbers/${barberId}`;

  const parsed = updateSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) fail(path, parsed.error.issues[0].message);

  const updated = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.updateMany({
      where: { id: barberId },
      data: {
        displayName: parsed.data.displayName,
        bio: parsed.data.bio || null,
        active: parsed.data.active,
      },
    }),
  );
  if (updated.count === 0) fail("/admin/barbers", "Barbero no encontrado");

  revalidatePath("/admin/barbers");
  revalidatePath(path);
  redirect(`${path}?ok=1`);
}

/**
 * Foto del barbero: se sube a Vercel Blob desde el cliente (ver
 * ImageUploadField) y esta acción solo persiste la URL resultante — llamada
 * directa desde un componente cliente vía .bind(), no desde un <form>. Si la
 * foto anterior era nuestra (no un link externo), se borra del storage.
 */
export async function setBarberImage(barberId: string, url: string | null) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = `/admin/barbers/${barberId}`;

  const previous = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.findUnique({ where: { id: barberId }, select: { photoUrl: true } }),
  );

  const updated = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.updateMany({ where: { id: barberId }, data: { photoUrl: url } }),
  );
  if (updated.count === 0) fail("/admin/barbers", "Barbero no encontrado");

  const previousUrl = previous?.photoUrl;
  if (previousUrl && previousUrl !== url && previousUrl.includes(".public.blob.vercel-storage.com")) {
    await del(previousUrl).catch(() => {}); // best-effort: no bloquea el guardado
  }

  revalidatePath(path);
}

/**
 * Asignación de servicios del barbero. El form manda, por servicio marcado,
 * `service` (id) y opcionalmente `override_<id>` con precio propio.
 */
export async function setBarberServices(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = `/admin/barbers/${barberId}`;

  const selected = formData.getAll("service").map(String);
  const overrides = new Map<string, number>();
  for (const id of selected) {
    const raw = String(formData.get(`override_${id}`) ?? "").trim();
    if (raw !== "") {
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        fail(path, "Precio propio inválido");
      }
      overrides.set(id, price);
    }
  }

  await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id: barberId } });
    if (!barber) fail("/admin/barbers", "Barbero no encontrado");

    // Validar que los servicios pertenezcan al tenant (RLS ya lo garantiza,
    // esto solo evita escribir ids basura).
    const valid = await tx.service.findMany({
      where: { id: { in: selected } },
      select: { id: true },
    });
    const validIds = new Set(valid.map((s) => s.id));

    await tx.barberService.deleteMany({ where: { barberId } });
    if (validIds.size > 0) {
      await tx.barberService.createMany({
        data: [...validIds].map((serviceId) => ({
          tenantId: ctx.tenantId,
          barberId,
          serviceId,
          priceOverride: overrides.get(serviceId),
        })),
      });
    }
  });

  revalidatePath(path);
  redirect(`${path}?ok=1`);
}

/**
 * Vincula (o crea) la cuenta de usuario del barbero para que pueda entrar a
 * su panel. El email de invitación real llega con T12 (Resend); mientras,
 * el barbero se registra en /signup con este mismo email.
 */
export async function linkBarberUser(barberId: string, formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = `/admin/barbers/${barberId}`;

  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .safeParse(formData.get("email"));
  if (!parsed.success) fail(path, parsed.error.issues[0].message);
  const email = parsed.data;

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email.split("@")[0] },
  });

  // No degradar a un owner/admin existente
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: ctx.tenantId } },
    update: {},
    create: { userId: user.id, tenantId: ctx.tenantId, role: "barber" },
  });

  const updated = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.updateMany({ where: { id: barberId }, data: { userId: user.id } }),
  );
  if (updated.count === 0) fail("/admin/barbers", "Barbero no encontrado");

  revalidatePath(path);
  redirect(`${path}?ok=1`);
}

export async function unlinkBarberUser(barberId: string) {
  const ctx = await requireTenantRole("owner", "admin");
  await withTenant(ctx.tenantId, (tx) =>
    tx.barber.updateMany({ where: { id: barberId }, data: { userId: null } }),
  );
  revalidatePath(`/admin/barbers/${barberId}`);
  redirect(`/admin/barbers/${barberId}?ok=1`);
}
