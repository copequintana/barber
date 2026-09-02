import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-guard";
import { getTenantSupportView } from "@/lib/platform";
import { formatZoned } from "@/lib/time";
import { toggleSuspension } from "../actions";

export const metadata = { title: "Soporte de barbería · BarberDesk" };

export default async function TenantSupportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePlatformAdmin();
  const { id } = await params;
  const view = await getTenantSupportView(actor, id);
  if (!view) notFound();
  const { tenant } = view;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Vista de soporte en <strong>solo lectura</strong>. Este acceso queda
        registrado en la auditoría.
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/platform" className="text-sm underline opacity-70">
            ← Consola
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm opacity-70">
            /b/{tenant.slug} · {tenant.timezone} · {tenant.currency} · plan{" "}
            {tenant.plan}
            {tenant.suspended ? " · SUSPENDIDA" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/b/${tenant.slug}`}
            target="_blank"
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
          >
            Ver página pública ↗
          </Link>
          <form
            action={toggleSuspension.bind(
              null,
              tenant.id,
              !tenant.suspended,
              `/platform/${tenant.id}`,
            )}
          >
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
            >
              {tenant.suspended ? "Reactivar" : "Suspender"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-2xl font-bold tabular-nums">{view.barbers.length}</p>
          <p className="text-xs opacity-70">Barberos</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-2xl font-bold tabular-nums">{view.services}</p>
          <p className="text-xs opacity-70">Servicios activos</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
          <p className="text-2xl font-bold tabular-nums">{view.customers}</p>
          <p className="text-xs opacity-70">Clientes</p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Equipo</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {view.tenant.memberships.map((m) => (
            <li key={m.userId} className="flex justify-between rounded-md border border-black/10 px-3 py-1.5 dark:border-white/15">
              <span>{m.user.email}</span>
              <span className="uppercase tracking-wide opacity-60">{m.role}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-1 flex flex-wrap gap-2 text-sm">
          {view.barbers.map((b) => (
            <li
              key={b.id}
              className={`rounded-full border border-black/10 px-3 py-1 dark:border-white/15 ${b.active ? "" : "line-through opacity-50"}`}
            >
              {b.displayName} · {b._count.appointments} citas
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Últimas reservas</h2>
        {view.recentAppointments.length === 0 ? (
          <p className="text-sm opacity-70">Sin reservas.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {view.recentAppointments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 rounded-md border border-black/10 px-3 py-1.5 dark:border-white/15"
              >
                <span className="tabular-nums">
                  {formatZoned(tenant.timezone, a.startsAt)}
                </span>
                <span className="opacity-80">
                  {a.customer.name} · {a.service.name} · {a.barber.displayName}
                </span>
                <span className="opacity-60">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Auditoría</h2>
        <ul className="flex flex-col gap-1 text-xs opacity-80">
          {view.audit.map((log) => (
            <li key={log.id} className="tabular-nums">
              {log.createdAt.toISOString().replace("T", " ").slice(0, 16)} ·{" "}
              {log.action}
              {log.detail ? ` · ${log.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
