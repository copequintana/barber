"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { createDemo, endDemo, getActiveDemo } from "@/lib/demo";
import { ACTIVE_TENANT_COOKIE } from "@/lib/guards";
import { logPlatformAction } from "@/lib/platform";
import { requireVendor } from "@/lib/platform-guard";

export async function startDemo() {
  const vendor = await requireVendor();
  const before = await getActiveDemo(vendor.id);
  const demo = await createDemo(vendor.id);
  if (!before) {
    await logPlatformAction({ userId: vendor.id, tenantId: demo.id, action: "demo_start" });
  }
  redirect("/demo");
}

export async function openDemoAdmin() {
  const vendor = await requireVendor();
  const demo = await getActiveDemo(vendor.id);
  if (!demo) redirect("/demo");
  (await cookies()).set(ACTIVE_TENANT_COOKIE, demo.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

export async function finishDemo() {
  const vendor = await requireVendor();
  const demo = await getActiveDemo(vendor.id);
  if (demo) {
    await endDemo(demo.id);
    await logPlatformAction({ userId: vendor.id, tenantId: demo.id, action: "demo_end" });
    const store = await cookies();
    if (store.get(ACTIVE_TENANT_COOKIE)?.value === demo.id) store.delete(ACTIVE_TENANT_COOKIE);
  }
  redirect("/demo?ended=1");
}

export async function logoutVendor() {
  (await cookies()).delete(ACTIVE_TENANT_COOKIE);
  await signOut({ redirectTo: "/login" });
}
