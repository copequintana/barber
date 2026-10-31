import Link from "next/link";
import { DateTime } from "luxon";
import { Ban, CalendarX2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAgendaData } from "@/lib/admin-appointments";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { WEEKDAYS_ES, longDateEs, minutesToHhmm } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BarberJumpSelect, DateJumpInput } from "./nav-controls";

export const metadata = { title: "Agenda · BarberDesk" };

const PX_PER_MIN = 1.2;

const STATUS_STYLE: Record<string, string> = {
  confirmed: "border-l-success bg-success-soft",
  pending: "border-l-warning bg-warning-soft",
  completed: "border-l-muted-foreground/50 bg-muted text-muted-foreground",
  no_show: "border-l-danger bg-danger-soft",
};

const LEGEND = [
  { label: "Confirmada", swatch: "border-l-4 border-l-success bg-success-soft" },
  { label: "Pendiente", swatch: "border-l-4 border-l-warning bg-warning-soft" },
  { label: "Completada", swatch: "border-l-4 border-l-muted-foreground/50 bg-muted" },
  { label: "No asistió", swatch: "border-l-4 border-l-danger bg-danger-soft" },
  { label: "Bloqueo", swatch: "border border-dashed border-muted-foreground/50 bg-muted" },
];

type Search = { date?: string; view?: string; barber?: string };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const sp = await searchParams;

  const nowLocal = DateTime.now().setZone(tenant.timezone);
  const today = nowLocal.startOf("day");
  let date = sp.date
    ? DateTime.fromISO(sp.date, { zone: tenant.timezone }).startOf("day")
    : today;
  if (!date.isValid) date = today;

  const view = sp.view === "week" ? "week" : "day";
  const weekStart = date.minus({ days: (date.weekday - 1) % 7 }); // lunes
  const rangeStart = view === "day" ? date : weekStart;
  const numDays = view === "day" ? 1 : 7;

  const data = await getAgendaData(
    ctx.tenantId,
    tenant.timezone,
    rangeStart.toISODate()!,
    numDays,
  );
  if (!data) return null;

  const weekBarber =
    data.barbers.find((b) => b.id === sp.barber) ?? data.barbers[0];

  // Columnas: por barbero (día) o por día de la semana (semana, un barbero)
  const columns =
    view === "day"
      ? data.barbers.map((b) => ({
          key: b.id,
          title: b.displayName,
          initial: b.displayName.charAt(0).toUpperCase(),
          barberId: b.id,
          day: date,
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const day = weekStart.plus({ days: i });
          return {
            key: day.toISODate()!,
            title: `${WEEKDAYS_ES[day.weekday % 7].slice(0, 3)} ${day.day}`,
            initial: null,
            barberId: weekBarber?.id ?? "",
            day,
          };
        });

  // Rango vertical: horarios laborales de lo visible + citas fuera de horario
  let minStart = 9 * 60;
  let maxEnd = 20 * 60;
  const weekdaysShown = new Set(columns.map((c) => c.day.weekday % 7));
  const barbersShown = new Set(columns.map((c) => c.barberId));
  for (const w of data.workingHours) {
    if (weekdaysShown.has(w.weekday) && barbersShown.has(w.barberId)) {
      minStart = Math.min(minStart, w.startMin);
      maxEnd = Math.max(maxEnd, w.endMin);
    }
  }
  const localMin = (d: Date) => {
    const z = DateTime.fromJSDate(d, { zone: "utc" }).setZone(tenant.timezone);
    return z.hour * 60 + z.minute;
  };
  for (const a of data.appointments) {
    minStart = Math.min(minStart, localMin(a.startsAt));
    maxEnd = Math.max(maxEnd, localMin(a.startsAt) + 15);
  }
  minStart = Math.floor(minStart / 60) * 60;
  maxEnd = Math.min(24 * 60, Math.ceil(maxEnd / 60) * 60);
  const colHeight = (maxEnd - minStart) * PX_PER_MIN;

  const hourMarks: number[] = [];
  for (let m = minStart; m <= maxEnd; m += 60) hourMarks.push(m);

  const nowMin = nowLocal.hour * 60 + nowLocal.minute;
  const nowTop =
    nowMin >= minStart && nowMin <= maxEnd ? (nowMin - minStart) * PX_PER_MIN : null;
  const todayShown = columns.some((c) => c.day.hasSame(today, "day"));
  const nowMs = nowLocal.toMillis();

  const visible = data.appointments.filter((a) => barbersShown.has(a.barberId));
  const counts = {
    total: visible.length,
    pending: visible.filter((a) => a.status === "pending").length,
    completed: visible.filter((a) => a.status === "completed").length,
    noShow: visible.filter((a) => a.status === "no_show").length,
  };

  const dayISO = date.toISODate()!;
  const nav = (d: DateTime) =>
    `/admin/agenda?view=${view}&date=${d.toISODate()}${
      view === "week" && weekBarber ? `&barber=${weekBarber.id}` : ""
    }`;
  const step = view === "day" ? { days: 1 } : { days: 7 };
  const stepLabel = view === "day" ? "día" : "semana";

  const viewLink = (target: "day" | "week", label: string) => (
    <Link
      href={`/admin/agenda?view=${target}&date=${dayISO}${
        target === "week" && weekBarber ? `&barber=${weekBarber.id}` : ""
      }`}
      aria-current={view === target ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        view === target
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Agenda"
        description={
          view === "day"
            ? longDateEs(date)
            : `Semana del ${weekStart.setLocale("es").toFormat("d 'de' LLLL")}${
                weekBarber ? ` · ${weekBarber.displayName}` : ""
              }`
        }
        actions={
          <Button asChild>
            <Link href={`/admin/agenda/nueva?date=${dayISO}`}>
              <Plus /> Nueva cita
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" aria-label={`Ir al ${stepLabel} anterior`}>
            <Link href={nav(date.minus(step))}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={nav(today)}>Hoy</Link>
          </Button>
          <Button asChild variant="outline" size="icon" aria-label={`Ir al ${stepLabel} siguiente`}>
            <Link href={nav(date.plus(step))}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <DateJumpInput
          defaultValue={dayISO}
          view={view}
          barberId={view === "week" ? weekBarber?.id : undefined}
        />
        <div className="inline-flex rounded-lg border bg-card p-0.5" role="group" aria-label="Vista">
          {viewLink("day", "Día")}
          {viewLink("week", "Semana")}
        </div>
        {view === "week" ? (
          <BarberJumpSelect
            barbers={data.barbers}
            defaultValue={weekBarber?.id}
            dateISO={dayISO}
          />
        ) : null}
        {columns.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:ml-auto">
            <span className="rounded-full border bg-card px-2.5 py-1">
              <strong className="tabular-nums">{counts.total}</strong>{" "}
              {counts.total === 1 ? "cita" : "citas"}
            </span>
            {counts.pending > 0 ? (
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-warning">
                <strong className="tabular-nums">{counts.pending}</strong> por confirmar
              </span>
            ) : null}
            <span className="rounded-full border bg-card px-2.5 py-1">
              <strong className="tabular-nums">{counts.completed}</strong>{" "}
              {counts.completed === 1 ? "completada" : "completadas"}
            </span>
            {counts.noShow > 0 ? (
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">
                <strong className="tabular-nums">{counts.noShow}</strong> no asistió
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {columns.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX2 />
            </EmptyMedia>
            <EmptyTitle>No hay barberos activos</EmptyTitle>
            <EmptyDescription>
              La agenda muestra una columna por barbero. Agrega uno para empezar
              a recibir citas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/admin/barbers">Agregar barbero</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="overflow-x-auto">
            <div className="flex min-w-fit">
              {/* Eje de horas */}
              <div className="sticky left-0 z-30 w-14 shrink-0 border-r bg-card">
                <div className="h-12 border-b" />
                <div className="relative" style={{ height: colHeight }}>
                  {hourMarks.map((m) => (
                    <span
                      key={m}
                      className="absolute right-1.5 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                      style={{ top: (m - minStart) * PX_PER_MIN }}
                    >
                      {minutesToHhmm(m)}
                    </span>
                  ))}
                  {todayShown && nowTop !== null ? (
                    <span
                      className="absolute right-1 z-10 -translate-y-1/2 rounded bg-now px-1 py-px text-[0.6875rem] font-semibold text-background tabular-nums"
                      style={{ top: nowTop }}
                    >
                      {nowLocal.toFormat("HH:mm")}
                    </span>
                  ) : null}
                </div>
              </div>

              {columns.map((col) => {
                const weekday = col.day.weekday % 7;
                const franjas = data.workingHours.filter(
                  (w) => w.barberId === col.barberId && w.weekday === weekday,
                );
                const dayStart = col.day.startOf("day");
                const dayEnd = dayStart.plus({ days: 1 });
                const inCol = (s: Date, e: Date, barberId: string) =>
                  barberId === col.barberId &&
                  s.getTime() < dayEnd.toMillis() &&
                  e.getTime() > dayStart.toMillis();
                const appts = data.appointments.filter((a) =>
                  inCol(a.startsAt, a.endsAt, a.barberId),
                );
                const offs = data.timeOff.filter((t) =>
                  inCol(t.startsAt, t.endsAt, t.barberId),
                );
                const top = (d: Date) =>
                  Math.max(0, (localMin(d) - minStart) * PX_PER_MIN);
                const blockH = (s: Date, e: Date) =>
                  Math.max(
                    22,
                    ((e.getTime() - s.getTime()) / 60_000) * PX_PER_MIN,
                  );
                const isToday = col.day.hasSame(today, "day");

                return (
                  <div key={col.key} className="min-w-40 flex-1 border-r last:border-r-0">
                    <div
                      className={cn(
                        "flex h-12 items-center justify-between gap-2 border-b px-2.5",
                        isToday && view === "week" && "bg-primary/5",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {col.initial ? (
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {col.initial}
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "truncate text-sm font-medium capitalize",
                            isToday && view === "week" && "text-primary",
                          )}
                        >
                          {col.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {appts.length}
                        </span>
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Nueva cita · ${col.title}`}>
                          <Link
                            href={`/admin/agenda/nueva?date=${col.day.toISODate()}&barber=${col.barberId}`}
                          >
                            <Plus />
                          </Link>
                        </Button>
                      </span>
                    </div>
                    <div className="relative bg-muted/60" style={{ height: colHeight }}>
                      {/* Franjas laborales (fondo claro) */}
                      {franjas.map((f, i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 bg-card"
                          style={{
                            top: (f.startMin - minStart) * PX_PER_MIN,
                            height: (f.endMin - f.startMin) * PX_PER_MIN,
                          }}
                        />
                      ))}
                      {/* Líneas de hora */}
                      {hourMarks.map((m) => (
                        <div
                          key={m}
                          className="absolute inset-x-0 border-t border-border/70"
                          style={{ top: (m - minStart) * PX_PER_MIN }}
                        />
                      ))}
                      {/* Bloqueos */}
                      {offs.map((t) => (
                        <div
                          key={t.id}
                          className="absolute inset-x-1 z-10 flex items-start gap-1.5 overflow-hidden rounded-md border border-dashed border-muted-foreground/50 bg-muted px-2 py-1 text-xs text-muted-foreground"
                          style={{
                            top: top(t.startsAt),
                            height: blockH(t.startsAt, t.endsAt),
                          }}
                          title={t.reason ?? "Bloqueado"}
                        >
                          <Ban className="mt-px size-3 shrink-0" />
                          <span className="truncate">{t.reason ?? "Bloqueado"}</span>
                        </div>
                      ))}
                      {/* Citas */}
                      {appts.map((a) => {
                        const past = a.endsAt.getTime() < nowMs;
                        const unmarked =
                          past && (a.status === "confirmed" || a.status === "pending");
                        return (
                          <Link
                            key={a.id}
                            href={`/admin/agenda/cita/${a.id}`}
                            className={cn(
                              "absolute inset-x-1 z-20 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs leading-tight transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
                              STATUS_STYLE[a.status] ?? STATUS_STYLE.confirmed,
                              past && "opacity-60 hover:opacity-100",
                            )}
                            style={{
                              top: top(a.startsAt),
                              height: blockH(a.startsAt, a.endsAt),
                            }}
                            title={`${a.customerName} · ${a.serviceName}${unmarked ? " · por marcar" : ""}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold tabular-nums">
                                {DateTime.fromJSDate(a.startsAt, { zone: "utc" })
                                  .setZone(tenant.timezone)
                                  .toFormat("HH:mm")}
                              </span>
                              <span
                                className={cn(
                                  "truncate font-medium",
                                  a.status === "no_show" && "line-through",
                                )}
                              >
                                {a.customerName}
                              </span>
                            </span>
                            <span className="block truncate text-muted-foreground">
                              {unmarked ? (
                                <span className="font-medium text-warning">Por marcar · </span>
                              ) : null}
                              {a.serviceName}
                            </span>
                          </Link>
                        );
                      })}
                      {isToday && nowTop !== null ? (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-now"
                          style={{ top: nowTop }}
                        >
                          <span className="absolute -top-[3px] -left-1 size-2 rounded-full bg-now" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {columns.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {LEGEND.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("inline-block h-3 w-4 rounded-sm", l.swatch)} />
              {l.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 bg-now" />
            Ahora
          </li>
          <li>Las canceladas no se muestran.</li>
        </ul>
      ) : null}
    </div>
  );
}
