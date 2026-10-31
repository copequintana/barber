"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { isThemeId } from "@/lib/themes";

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
    .regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")
    .nullable(),
  theme: z.string().refine(isThemeId, "Tema inválido"),
  phone: z.union([z.literal(""), z.string().trim().max(30)]),
  address: z.union([z.literal(""), z.string().trim().max(200)]),
});

export async function updateProfile(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");
  const path = "/admin/settings";

  const parsed = profileSchema.safeParse({
    brandColor:
      formData.get("useThemeColor") === "on" ? null : formData.get("brandColor"),
    theme: formData.get("theme"),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) fail(path, parsed.error.issues[0].message);
  const data = parsed.data;

  // Checkboxes: el navegador solo manda el campo si está marcado ("on").
  const reminder24hEnabled = formData.get("reminder24hEnabled") === "on";
  const reminder2hEnabled = formData.get("reminder2hEnabled") === "on";
  const whatsappEnabled = formData.get("whatsappEnabled") === "on";

  // Tenant es tabla global (sin RLS): se actualiza directo, acotado al
  // tenantId que ya validó requireTenantRole.
  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      brandColor: data.brandColor,
      theme: data.theme,
      phone: data.phone || null,
      address: data.address || null,
      reminder24hEnabled,
      reminder2hEnabled,
      whatsappEnabled,
    },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
  redirect(`${path}?ok=1`);
}

type SettingsTab = "pagina" | "contacto" | "recordatorios";

function tabPath(tab: SettingsTab) {
  return `/admin/settings?tab=${tab}`;
}

function failTab(tab: SettingsTab, message: string): never {
  redirect(`${tabPath(tab)}&error=${encodeURIComponent(message)}`);
}

const appearanceSchema = profileSchema.pick({ brandColor: true, theme: true });

export async function updateAppearance(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const parsed = appearanceSchema.safeParse({
    brandColor:
      formData.get("useThemeColor") === "on" ? null : formData.get("brandColor"),
    theme: formData.get("theme"),
  });
  if (!parsed.success) failTab("pagina", parsed.error.issues[0].message);

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { brandColor: parsed.data.brandColor, theme: parsed.data.theme },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
  redirect(`${tabPath("pagina")}&ok=1`);
}

const contactSchema = profileSchema.pick({ phone: true, address: true }).extend({
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
});

export async function updateContact(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const lat = formData.get("lat");
  const lng = formData.get("lng");
  const parsed = contactSchema.safeParse({
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    lat: lat ? lat : undefined,
    lng: lng ? lng : undefined,
  });
  if (!parsed.success) failTab("contacto", parsed.error.issues[0].message);
  const data = parsed.data;
  const location =
    data.lat !== undefined && data.lng !== undefined ? { lat: data.lat, lng: data.lng } : {};

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      phone: data.phone || null,
      address: data.address || null,
      ...location,
    },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
  redirect(`${tabPath("contacto")}&ok=1`);
}

export async function updateReminders(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const tenant = await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      reminder24hEnabled: formData.get("reminder24hEnabled") === "on",
      reminder2hEnabled: formData.get("reminder2hEnabled") === "on",
      whatsappEnabled: formData.get("whatsappEnabled") === "on",
    },
    select: { slug: true },
  });

  revalidateTenantPublicPaths(tenant.slug);
  redirect(`${tabPath("recordatorios")}&ok=1`);
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
