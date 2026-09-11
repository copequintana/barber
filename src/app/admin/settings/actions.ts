"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const optionalUrl = (label: string) =>
  z.union([z.literal(""), z.string().trim().url(`${label} inválida`).max(500)]);

// El input type="color" del form siempre manda un hex de 6 dígitos; el
// regex es una defensa extra por si el form se envía sin JS/manipulado.
const profileSchema = z.object({
  logoUrl: optionalUrl("La URL del logo"),
  coverImageUrl: optionalUrl("La URL de portada"),
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
    logoUrl: formData.get("logoUrl") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
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
      logoUrl: data.logoUrl || null,
      coverImageUrl: data.coverImageUrl || null,
      brandColor: data.brandColor,
      phone: data.phone || null,
      address: data.address || null,
    },
    select: { slug: true },
  });

  revalidatePath(path);
  revalidatePath(`/b/${tenant.slug}`);
  revalidatePath(`/b/${tenant.slug}/reservar`);
  redirect(`${path}?ok=1`);
}
