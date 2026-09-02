"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-guard";
import { setTenantSuspended } from "@/lib/platform";

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
