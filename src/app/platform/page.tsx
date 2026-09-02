import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform-guard";
import {
  getPlatformMetrics,
  listTenantsWithActivity,
} from "@/lib/platform";
import { toggleSuspension } from "./actions";

export const metadata = { title: "Plataforma · BarberDesk" };

export default async function PlatformPage() {
  const actor = await requirePlatformAdmin();
  const metrics = await getPlatformMetrics();
  const tenants = await listTenantsWithActivity();

  const cards = [
    { label: "Barberías", value: metrics.tenants },
    { label: "Activas (30 días)", value: metrics.activeTenants30d },
    { label: "Suspendidas", value: metrics.suspended },
    { label: "Usuarios", value: metrics.users },
    { label: "Reservas totales", value: metrics.totalAppointments },
    { label: "Reservas (30 días)", value: metrics.appointments30d },
  ];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consola de plataforma</h1>
          <p className="text-sm opacity-70">Sesión: {actor.email}</p>
        </div>
        <Link href="/" className="text-sm underline opacity-70">
          Salir de la consola
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-black/10 p-3 dark:border-white/15"
          >
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Barberías</h2>
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/15">
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Barberos</th>
                <th className="px-4 py-2 font-medium">Citas 30d</th>
                <th className="px-4 py-2 font-medium">Alta</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                >
                  <td className="px-4 py-2">
                    <Link href={`/platform/${t.id}`} className="font-medium underline">
                      {t.name}
                    </Link>{" "}
                    <span className="opacity-60">/b/{t.slug}</span>
                  </td>
                  <td className="px-4 py-2">{t.plan}</td>
                  <td className="px-4 py-2 tabular-nums">{t.barbers}</td>
                  <td className="px-4 py-2 tabular-nums">{t.citas30d}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {t.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2">
                    {t.suspended ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">
                        Suspendida
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Activa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <form
                      action={toggleSuspension.bind(
                        null,
                        t.id,
                        !t.suspended,
                        "/platform",
                      )}
                    >
                      <button type="submit" className="underline opacity-70">
                        {t.suspended ? "Reactivar" : "Suspender"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
