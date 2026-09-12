"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function revalidateTenantPublicPaths(slug: string) {
  revalidatePath("/admin/settings");
  revalidatePath(`/b/${slug}`);
  revalidatePath(`/b/${slug}/reservar`);
  revalidatePath("/directorio");
}

// El input type="color" del form siempre manda un hex de 6 dígitos; el
// regex es una defensa extra por si el form se envía sin JS/manipulado.
const profileSchema = z.object({
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  phone: z.union([z.literal(""), z.string().trim().max(30)]),
  address: z.union([z.literal(""), z.string().trim().max(200)]),
});

export async function updateProfile(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = "/admin/settings";

  const parsed = profileSchema.safeParse({
    brandColor: formData.get("brandColor"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) fail(path, parsed.error.issues[0].message);
  const data = parsed.data;

  // Tenant es tabla global (sin RLS): se actualiza directo, acotado al
  // tenantId que ya validó requireTenantRole.
  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      brandColor: data.brandColor,
      phone: data.phone || null,
      address: data.address || null,
    },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
  redirect(`${path}?ok=1`);
}

/**
 * Logo/portada: se suben a Vercel Blob desde el cliente (ver
 * ImageUploadField) y esta acción solo persiste la URL resultante — llamada
 * directa desde un componente cliente, no desde un <form>. Si la imagen
 * anterior era nuestra (no un link externo), se borra del storage.
 */
export async function setTenantImage(
  field: "logoUrl" | "coverImageUrl",
  url: string | null,
) {
  const ctx = await requireTenantRole("owner", "admin");

  const previous = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { logoUrl: true, coverImageUrl: true },
  });
  const previousUrl = field === "logoUrl" ? previous?.logoUrl : previous?.coverImageUrl;

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { [field]: url },
    select: { slug: true },
  });

  if (previousUrl && previousUrl !== url && previousUrl.includes(".public.blob.vercel-storage.com")) {
    await del(previousUrl).catch(() => {}); // best-effort: no bloquea el guardado
  }

  revalidateTenantPublicPaths(tenant.slug);
}

const coordsSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

/** Ubicación (pin del mapa en Configuración) — aparece en /directorio en
 * cuanto se guarda. */
export async function setTenantLocation(lat: number, lng: number) {
  const ctx = await requireTenantRole("owner", "admin");
  const parsed = coordsSchema.safeParse({ lat, lng });
  if (!parsed.success) throw new Error("Coordenadas inválidas");

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { lat: parsed.data.lat, lng: parsed.data.lng },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
}
