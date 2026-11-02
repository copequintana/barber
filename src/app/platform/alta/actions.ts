"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canManageBarbershop, createBarbershop, logPlatformAction, ownerNeedingPassword, PlatformError } from "@/lib/platform";
import { requireStaff } from "@/lib/platform-guard";
import { CURRENCIES, TIMEZONES } from "@/lib/timezones";

const PATH = "/platform/alta";

function done(params: Record<string, string>): never {
  redirect(`${PATH}?${new URLSearchParams(params).toString()}`);
}

async function invite(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
}

const schema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la barbería").max(60, "El nombre es muy largo"),
  slug: z.string().trim().toLowerCase(),
  timezone: z.enum(TIMEZONES, { error: "Elige una zona horaria" }),
  currency: z.enum(CURRENCIES, { error: "Elige una moneda" }),
  ownerName: z.string().trim().min(2, "Escribe el nombre del dueño").max(80, "El nombre del dueño es muy largo"),
  ownerEmail: z.string().trim().toLowerCase().email("Escribe un correo válido para el dueño"),
});

export async function createBarbershopAction(formData: FormData) {
  const actor = await requireStaff();
  const parsed = schema.safeParse(Object.fromEntries(Object.keys(schema.shape).map((k) => [k, formData.get(k) ?? ""])));
  if (!parsed.success) done({ error: parsed.error.issues[0]?.message ?? "Revisa los datos" });
  let created: Awaited<ReturnType<typeof createBarbershop>>;
  try {
    created = await createBarbershop(actor, parsed.data);
  } catch (e) {
    if (e instanceof PlatformError) done({ error: e.message });
    throw e;
  }
  if (created.needsPassword) await invite(created.owner.email);
  revalidatePath(PATH);
  revalidatePath("/platform");
  done({ ok: created.needsPassword ? "invitado" : "agregado", barberia: created.tenant.id });
}

export async function resendInviteAction(formData: FormData) {
  const actor = await requireStaff();
  const tenantId = z.string().uuid().safeParse(formData.get("tenantId"));
  if (!tenantId.success || !(await canManageBarbershop(actor, tenantId.data, actor.isAdmin))) done({ error: "Barbería no encontrada" });
  const owner = await ownerNeedingPassword(tenantId.data);
  if (!owner) done({ error: "El dueño ya creó su contraseña" });
  await invite(owner.email);
  await logPlatformAction({ userId: actor.id, tenantId: tenantId.data, action: "resend_owner_invite", detail: owner.email });
  done({ ok: "reenviado", barberia: tenantId.data });
}
