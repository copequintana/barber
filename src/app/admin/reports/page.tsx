import Link from "next/link";
import { DateTime } from "luxon";
import { requireTenantRole } from "@/lib/guards";
import { getReport } from "@/lib/reports";
import { getTenantById } from "@/lib/tenancy";

export const metadata = { title: "Reportes · BarberDesk" };

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function delta(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const d = (current - previous) / previous;
  const sign = d >= 0 ? "+" : "";
  return `${sign}${Math.round(d * 100)}% vs período anterior`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const sp = await searchParams;

  const today = DateTime.now().setZone(tenant.timezone).startOf("day");
  let from = sp.from
    ? DateTime.fromISO(sp.from, { zone: tenant.timezone })
    : today.startOf("month");
  let to = sp.to ? DateTime.fromISO(sp.to, { zone: tenant.timezone }) : today;
  if (!from.isValid || !to.isValid || to < from) {
    from = today.startOf("month");
    to = today;
  }
  const fromISO = from.toISODate()!;
  const toISO = to.toISODate()!;

  // Período anterior de la misma longitud, inmediatamente antes
  const lengthDays = Math.round(to.diff(from, "days").days) + 1;
  const prevFrom = from.minus({ days: lengthDays });
  const prevTo = from.minus({ days: 1 });

  const [report, prev] = [
    await getReport(ctx.tenantId, tenant.timezone, fromISO, toISO),
    await getReport(
      ctx.tenantId,
      tenant.timezone,
      prevFrom.toISODate()!,
      prevTo.toISODate()!,
    ),
  ];
  if (!report) return null;

  const money = new Intl.NumberFormat("es", {
    style: "currency",
    currency: tenant.currency,
    maximumFractionDigits: 0,
  });

  const quick = (label: string, f: DateTime, t: DateTime) => (
    <Link
      href={`/admin/reports?from=${f.toISODate()}&to=${t.toISODate()}`}
      className="rounded-full border border-black/15 px-3 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      {label}
    </Link>
  );

  const cards = [
    {
      label: "Citas (sin canceladas)",
      value: String(report.totals.citas),
      sub: prev ? delta(report.totals.citas, prev.totals.citas) : null,
    },
    {
      label: "Completadas",
      value: String(report.totals.completadas),
      sub: prev ? delta(report.totals.completadas, prev.totals.completadas) : null,
    },
    {
      label: "Ingresos (completadas)",
      value: money.format(report.totals.ingresos),
      sub: prev ? delta(report.totals.ingresos, prev.totals.ingresos) : null,
    },
    {
      label: "Tasa de no-show",
      value: pct(report.totals.noShowRate),
      sub:
        prev?.totals.noShowRate != null && report.totals.noShowRate != null
          ? `antes: ${pct(prev.totals.noShowRate)}`
          : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <a
          href={`/admin/reports/csv?from=${fromISO}&to=${toISO}`}
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Exportar CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {quick("Este mes", today.startOf("month"), today)}
        {quick(
          "Mes pasado",
          today.minus({ months: 1 }).startOf("month"),
          today.minus({ months: 1 }).endOf("month"),
        )}
        {quick("Últimos 30 días", today.minus({ days: 29 }), today)}
        <form method="get" action="/admin/reports" className="flex items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={fromISO}
            className="rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
          />
          <span className="opacity-60">→</span>
          <input
            type="date"
            name="to"
            defaultValue={toISO}
            className="rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
          />
          <button type="submit" className="underline opacity-70">
            Aplicar
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-sm opacity-70">{c.label}</p>
            {c.sub ? <p className="mt-1 text-xs opacity-60">{c.sub}</p> : null}
          </div>
        ))}
      </div>

      <p className="text-sm opacity-70">
        Canceladas: {report.totals.canceladas} (
        {report.totals.canceladasPorCliente} por el cliente,{" "}
        {report.totals.canceladas - report.totals.canceladasPorCliente} por la
        barbería).
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Ocupación por barbero</h2>
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/15">
                <th className="px-4 py-2 font-medium">Barbero</th>
                <th className="px-4 py-2 font-medium">Citas</th>
                <th className="px-4 py-2 font-medium">Horas reservadas</th>
                <th className="px-4 py-2 font-medium">Horas disponibles</th>
                <th className="px-4 py-2 font-medium">Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {report.porBarbero.map((b) => (
                <tr key={b.barberId} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                  <td className="px-4 py-2">{b.nombre}</td>
                  <td className="px-4 py-2 tabular-nums">{b.citas}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {(b.reservadoMin / 60).toFixed(1)} h
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {(b.disponibleMin / 60).toFixed(1)} h
                  </td>
                  <td className="px-4 py-2 tabular-nums">{pct(b.ocupacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Servicios más pedidos</h2>
        {report.topServicios.length === 0 ? (
          <p className="text-sm opacity-70">Sin citas en el rango.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left dark:border-white/15">
                  <th className="px-4 py-2 font-medium">Servicio</th>
                  <th className="px-4 py-2 font-medium">Citas</th>
                  <th className="px-4 py-2 font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {report.topServicios.map((s) => (
                  <tr key={s.serviceId} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                    <td className="px-4 py-2">{s.nombre}</td>
                    <td className="px-4 py-2 tabular-nums">{s.citas}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {money.format(s.ingresos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
