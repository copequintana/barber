import Link from "next/link";
import { DateTime } from "luxon";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getDayAppointments } from "@/lib/reports";
import { getTenantById } from "@/lib/tenancy";
import { longDateEs, utcToZoned } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio · BarberDesk" };

function untilLabel(minutes: number) {
  if (minutes <= 0) return "ahora";
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `en ${h} h` : `en ${h} h ${m} min`;
}

export default async function AdminHomePage() {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;

  const now = DateTime.now().setZone(tenant.timezone);
  const todayISO = now.toISODate()!;
  const appointments = await getDayAppointments(ctx.tenantId, tenant.timezone, todayISO);
  const money = (amount: number) => formatMoney(amount, tenant.currency);
  const time = (d: Date) => utcToZoned(tenant.timezone, d).toFormat("HH:mm");

  const open = appointments.filter((a) => a.status === "confirmed" || a.status === "pending");
  const completed = appointments.filter((a) => a.status === "completed");
  const noShows = appointments.filter((a) => a.status === "no_show");
  const expected = appointments
    .filter((a) => a.status !== "no_show")
    .reduce((sum, a) => sum + a.price, 0);
  const charged = completed.reduce((sum, a) => sum + a.price, 0);
  const next = open.find((a) => a.endsAt.getTime() > now.toMillis()) ?? null;
  const pendingToMark = open.filter((a) => a.endsAt.getTime() <= now.toMillis()).length;

  const stats = [
    { label: "Citas hoy", value: String(appointments.length), hint: `${open.length} por atender` },
    {
      label: "Completadas",
      value: String(completed.length),
      hint: noShows.length > 0 ? `${noShows.length} no asistió` : "Sin faltas",
    },
    { label: "Ingresos esperados", value: money(expected), hint: `${money(charged)} cobrado` },
    {
      label: "Por marcar",
      value: String(pendingToMark),
      hint: pendingToMark > 0 ? "Ya pasaron y siguen sin resultado" : "Todo al día",
    },
  ];

  const quick = [
    { href: `/admin/agenda/nueva?date=${todayISO}`, label: "Nueva cita", icon: CalendarPlus, external: false },
    { href: "/admin/agenda", label: "Ver agenda", icon: CalendarDays, external: false },
    { href: `/b/${tenant.slug}`, label: "Página pública", icon: ExternalLink, external: true },
    { href: `/b/${tenant.slug}/qr`, label: "Código QR", icon: QrCode, external: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={longDateEs(now)}
        description={`Así va el día en ${tenant.name}.`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/agenda">
                <CalendarDays /> Agenda
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/agenda/nueva?date=${todayISO}`}>
                <CalendarPlus /> Nueva cita
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Citas de hoy</CardTitle>
            <CardDescription>
              {appointments.length === 0
                ? "Sin citas registradas para hoy."
                : `${appointments.length} ${appointments.length === 1 ? "cita" : "citas"}, sin contar las canceladas.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarDays />
                  </EmptyMedia>
                  <EmptyTitle>Día libre por ahora</EmptyTitle>
                  <EmptyDescription>
                    Las reservas de tus clientes aparecen aquí en cuanto se hacen.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {appointments.map((a) => {
                  const past = a.endsAt.getTime() <= now.toMillis();
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/admin/agenda/cita/${a.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted",
                          past && "text-muted-foreground",
                        )}
                      >
                        <span className="w-12 shrink-0 font-semibold tabular-nums">
                          {time(a.startsAt)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-medium", !past && "text-foreground")}>
                            {a.customerName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.serviceName} · {a.barberName}
                          </span>
                        </span>
                        <StatusBadge status={a.status} />
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className={cn(next && "border-primary/40")}>
            <CardHeader>
              <CardDescription>Próxima cita</CardDescription>
              {next ? (
                <CardTitle className="text-3xl font-semibold tabular-nums">
                  {time(next.startsAt)}
                </CardTitle>
              ) : (
                <CardTitle>No quedan citas por hoy</CardTitle>
              )}
            </CardHeader>
            {next ? (
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="font-medium">{next.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {next.serviceName} con {next.barberName}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {next.startsAt.getTime() <= now.toMillis()
                      ? "En curso"
                      : untilLabel(Math.round((next.startsAt.getTime() - now.toMillis()) / 60_000))}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/agenda/cita/${next.id}`}>Ver cita</Link>
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Revisa la agenda de mañana o agrega una cita.
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {quick.map(({ href, label, icon: Icon, external }) => (
                <Button
                  key={href}
                  asChild
                  variant="outline"
                  className="h-auto flex-col gap-1.5 py-3 text-center whitespace-normal"
                >
                  {external ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Icon className="size-5" />
                      {label}
                    </a>
                  ) : (
                    <Link href={href}>
                      <Icon className="size-5" />
                      {label}
                    </Link>
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
