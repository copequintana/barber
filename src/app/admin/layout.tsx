import { Suspense } from "react";
import { cookies } from "next/headers";
import { FlashToast } from "@/components/admin/flash-toast";
import { signOut } from "@/lib/auth";
import { ACTIVE_TENANT_COOKIE, requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = await getTenantById(ctx.tenantId);

  async function logout() {
    "use server";
    (await cookies()).delete(ACTIVE_TENANT_COOKIE);
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShell
      tenantName={tenant?.name ?? "BarberDesk"}
      publicHref={tenant ? `/b/${tenant.slug}` : null}
      userEmail={ctx.user.email ?? ""}
      logout={logout}
    >
      {tenant?.suspended ? (
        <div className="border-b border-warning/25 bg-warning-soft px-6 py-2 text-center text-sm text-warning">
          Esta barbería está suspendida por la plataforma: la página pública no
          acepta reservas nuevas.
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <Suspense>
        <FlashToast />
      </Suspense>
    </AdminShell>
  );
}
