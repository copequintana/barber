import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import {
  ACTIVE_TENANT_COOKIE,
  homeForRole,
  requireUser,
} from "@/lib/guards";
import { getMembership, getMembershipsWithTenant } from "@/lib/tenancy";

export const metadata = { title: "Elegir barbería · BarberDesk" };

const ROLE_LABEL = { owner: "Dueño", admin: "Admin", barber: "Barbero" } as const;

export default async function SelectTenantPage() {
  const user = await requireUser();
  const memberships = await getMembershipsWithTenant(user.id);
  if (memberships.length === 0) redirect("/onboarding");

  async function select(formData: FormData) {
    "use server";
    const user = await requireUser();
    const tenantId = String(formData.get("tenantId") ?? "");
    const membership = await getMembership(user.id, tenantId);
    if (!membership) redirect("/select-tenant");
    const store = await cookies();
    store.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(homeForRole(membership.role));
  }

  async function logout() {
    "use server";
    (await cookies()).delete(ACTIVE_TENANT_COOKIE);
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">Tus barberías</h1>
        <p className="text-sm opacity-70">
          Sesión: {user.email}. Elige con cuál trabajar.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {memberships.map((m) => (
          <li key={m.tenantId}>
            <form action={select}>
              <input type="hidden" name="tenantId" value={m.tenantId} />
              <button
                type="submit"
                className="flex w-full items-center justify-between rounded-lg border border-black/15 px-4 py-3 text-left hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                <span className="font-medium">{m.tenant.name}</span>
                <span className="text-xs uppercase tracking-wide opacity-60">
                  {ROLE_LABEL[m.role]}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm">
        <Link className="underline" href="/onboarding">
          Crear otra barbería
        </Link>
        <form action={logout}>
          <button type="submit" className="underline opacity-70">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
