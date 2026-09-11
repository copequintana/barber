import Link from "next/link";
import { cookies } from "next/headers";
import { signOut } from "@/lib/auth";
import { ACTIVE_TENANT_COOKIE, requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";

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
    <div className="min-h-screen">
      <header className="border-b border-black/10 dark:border-white/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold">
              {tenant?.name ?? "BarberDesk"}
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="hover:underline">
                Inicio
              </Link>
              <Link href="/admin/agenda" className="hover:underline">
                Agenda
              </Link>
              <Link href="/admin/barbers" className="hover:underline">
                Barberos
              </Link>
              <Link href="/admin/services" className="hover:underline">
                Servicios
              </Link>
              <Link href="/admin/reports" className="hover:underline">
                Reportes
              </Link>
              <Link href="/admin/settings" className="hover:underline">
                Configuración
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {tenant ? (
              <Link
                href={`/b/${tenant.slug}`}
                className="hover:underline"
                target="_blank"
              >
                Ver página pública ↗
              </Link>
            ) : null}
            <Link href="/select-tenant" className="opacity-70 hover:underline">
              Cambiar
            </Link>
            <form action={logout}>
              <button type="submit" className="opacity-70 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      {tenant?.suspended ? (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-2 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Esta barbería está suspendida por la plataforma: la página pública no
          acepta reservas nuevas.
        </div>
      ) : null}
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
