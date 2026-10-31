import Link from "next/link";
import { DateTime } from "luxon";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { DateTimeInput } from "@/components/date-time-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireTenantRole } from "@/lib/guards";
import { getReport } from "@/lib/reports";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reportes · BarberDesk" };

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function Trend({ value, lowerIsBetter = false }: { value: number | null; lowerIsBetter?: boolean }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">Sin datos del periodo anterior</span>;
  }
  const up = value >= 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", good ? "text-success" : "text-danger")}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {Math.round(value * 100)}% vs periodo anterior
    </span>
  );
}

const inputClass =
  "h-9 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

  const money = (amount: number) => formatMoney(amount, tenant.currency);
  const sameYear = from.year === to.year;
  const rangeLabel = `Del ${from.setLocale("es").toFormat(sameYear ? "d 'de' LLLL" : "d 'de' LLLL yyyy")} al ${to.setLocale("es").toFormat("d 'de' LLLL yyyy")}`;

  const quickRanges = [
    { label: "Este mes", from: today.startOf("month"), to: today },
    {
      label: "Mes pasado",
      from: today.minus({ months: 1 }).startOf("month"),
      to: today.minus({ months: 1 }).endOf("month"),
    },
    { label: "Últimos 30 días", from: today.minus({ days: 29 }), to: today },
  ];

  const cards = [
    {
      label: "Citas",
      value: String(report.totals.citas),
      hint: "Sin contar canceladas",
      trend: prev ? <Trend value={change(report.totals.citas, prev.totals.citas)} /> : null,
    },
    {
      label: "Completadas",
      value: String(report.totals.completadas),
      hint: `${report.totals.noShows} no asistió`,
      trend: prev ? <Trend value={change(report.totals.completadas, prev.totals.completadas)} /> : null,
    },
    {
      label: "Ingresos",
      value: money(report.totals.ingresos),
      hint: "Solo citas completadas",
      trend: prev ? <Trend value={change(report.totals.ingresos, prev.totals.ingresos)} /> : null,
    },
    {
      label: "Tasa de no-show",
      value: pct(report.totals.noShowRate),
      hint:
        prev?.totals.noShowRate != null
          ? `Antes: ${pct(prev.totals.noShowRate)}`
          : "Faltas entre citas terminadas",
      trend:
        prev?.totals.noShowRate != null && report.totals.noShowRate != null ? (
          <Trend
            value={
              prev.totals.noShowRate === 0
                ? null
                : change(report.totals.noShowRate, prev.totals.noShowRate)
            }
            lowerIsBetter
          />
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description={rangeLabel}
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/reports/csv?from=${fromISO}&to=${toISO}`}>
              <Download /> Exportar CSV
            </a>
          </Button>
        }
      />

      <Card size="sm">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Periodo</span>
            <div className="flex flex-wrap gap-2">
              {quickRanges.map((r, i) => {
                const active =
                  quickRanges.findIndex(
                    (q) => q.from.toISODate() === fromISO && q.to.toISODate() === toISO,
                  ) === i;
                return (
                  <Button key={r.label} asChild size="sm" variant={active ? "default" : "outline"}>
                    <Link
                      href={`/admin/reports?from=${r.from.toISODate()}&to=${r.to.toISODate()}`}
                      aria-current={active ? "true" : undefined}
                    >
                      {r.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
          <form method="get" action="/admin/reports" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">Desde</Label>
              <DateTimeInput id="from" type="date" name="from" defaultValue={fromISO} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">Hasta</Label>
              <DateTimeInput id="to" type="date" name="to" defaultValue={toISO} className={inputClass} />
            </div>
            <Button type="submit" variant="secondary">
              Aplicar
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
              {c.trend}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Canceladas en el periodo: {report.totals.canceladas} ({report.totals.canceladasPorCliente} por
        el cliente, {report.totals.canceladas - report.totals.canceladasPorCliente} por la barbería).
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ocupación por barbero</CardTitle>
            <CardDescription>Horas reservadas contra horas de su horario en el periodo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbero</TableHead>
                  <TableHead className="text-right">Citas</TableHead>
                  <TableHead className="text-right">Reservadas</TableHead>
                  <TableHead className="text-right">Disponibles</TableHead>
                  <TableHead className="text-right">Ocupación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.porBarbero.map((b) => (
                  <TableRow key={b.barberId}>
                    <TableCell className="font-medium">{b.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.citas}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(b.reservadoMin / 60).toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(b.disponibleMin / 60).toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {pct(b.ocupacion)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios más pedidos</CardTitle>
            <CardDescription>Ingresos de las citas completadas de cada servicio.</CardDescription>
          </CardHeader>
          <CardContent>
            {report.topServicios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin citas en el periodo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="text-right">Citas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topServicios.map((s) => (
                    <TableRow key={s.serviceId}>
                      <TableCell className="font-medium">{s.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.citas}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(s.ingresos)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
