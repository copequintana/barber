import Link from "next/link";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { createBarber } from "./actions";

export const metadata = { title: "Barberos · BarberDesk" };

export default async function BarbersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { error } = await searchParams;

  const barbers = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.findMany({
      orderBy: [{ active: "desc" }, { displayName: "asc" }],
      include: { _count: { select: { services: true } }, user: true },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Barberos</h1>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <form action={createBarber} className="flex max-w-md gap-2">
        <input
          name="displayName"
          required
          placeholder="Nombre del barbero"
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground"
        >
          Agregar
        </button>
      </form>

      {barbers.length === 0 ? (
        <p className="text-sm opacity-70">
          Aún no hay barberos. Agrega el primero arriba.
        </p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {barbers.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/barbers/${b.id}`}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                <div>
                  <p className={`font-medium ${b.active ? "" : "line-through opacity-50"}`}>
                    {b.displayName}
                  </p>
                  <p className="text-sm opacity-70">
                    {b._count.services} servicio{b._count.services === 1 ? "" : "s"}
                    {b.user ? ` · cuenta: ${b.user.email}` : " · sin cuenta"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    b.active
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-black/10 opacity-70 dark:bg-white/15"
                  }`}
                >
                  {b.active ? "Activo" : "Inactivo"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
