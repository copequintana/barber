"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { endDemo, getActiveDemo } from "@/lib/demo";
import { requirePlatformAdmin } from "@/lib/platform-guard";
import { grantVendor, revokeVendor, setTenantSuspended } from "@/lib/platform";

export async function toggleSuspension(
  tenantId: string,
  suspend: boolean,
  from: string,
) {
  const actor = await requirePlatformAdmin();
  await setTenantSuspended(actor, tenantId, suspend);
  revalidatePath("/platform");
  revalidatePath(`/platform/${tenantId}`);
  redirect(from);
}

export async function addVendor(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) redirect(`/platform?error=${encodeURIComponent("Email inválido")}`);

  const { needsInvite } = await grantVendor(actor, parsed.data);
  if (needsInvite) {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data, redirectTo: "/reset-password" },
    });
  }
  revalidatePath("/platform");
  redirect(`/platform?ok=${needsInvite ? "vendor-invite" : "vendor"}`);
}

export async function removeVendor(userId: string) {
  const actor = await requirePlatformAdmin();
  const demo = await getActiveDemo(userId);
  if (demo) await endDemo(demo.id);
  await revokeVendor(actor, userId);
  revalidatePath("/platform");
  redirect("/platform");
}
