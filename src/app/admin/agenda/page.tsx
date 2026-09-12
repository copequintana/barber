import Link from "next/link";
import { DateTime } from "luxon";
import { Ban } from "lucide-react";
import { getAgendaData } from "@/lib/admin-appointments";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { WEEKDAYS_ES, minutesToHhmm } from "@/lib/time";
import { BarberJumpSelect, DateJumpInput } from "./nav-controls";

export const metadata = { title: "Agenda · BarberDesk" };

const PX_PER_MIN = 1.2;

const STATUS_STYLE: Record<string, string> = {
  confirmed:
    "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
  pending:
    "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
  completed:
    "bg-black/10 border-black/20 opacity-70 dark:bg-white/10 dark:border-white/20",
  no_show:
    "bg-red-100 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
};

type Search = { date?: string; view?: string; barber?: string };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const sp = await searchParams;

  const today = DateTime.now().setZone(tenant.timezone).startOf("day");
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
          barberId: b.id,
          day: date,
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const day = weekStart.plus({ days: i });
          return {
            key: day.toISODate()!,
            title: `${WEEKDAYS_ES[day.weekday % 7].slice(0, 3)} ${day.day}`,
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

  const dayISO = date.toISODate()!;
  const nav = (d: DateTime) =>
    `/admin/agenda?view=${view}&date=${d.toISODate()}${
      view === "week" && weekBarber ? `&barber=${weekBarber.id}` : ""
    }`;
  const step = view === "day" ? { days: 1 } : { days: 7 };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Link
          href={`/admin/agenda/nueva?date=${dayISO}`}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          + Nueva cita
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <Link href={nav(date.minus(step))} className="rounded-md border border-black/15 px-2.5 py-1.5 dark:border-white/20">
            ←
          </Link>
          <Link href={nav(today)} className="rounded-md border border-black/15 px-2.5 py-1.5 dark:border-white/20">
            Hoy
          </Link>
          <Link href={nav(date.plus(step))} className="rounded-md border border-black/15 px-2.5 py-1.5 dark:border-white/20">
            →
          </Link>
        </div>
        <DateJumpInput
          defaultValue={dayISO}
          view={view}
          barberId={view === "week" ? weekBarber?.id : undefined}
        />
        <span className="font-medium capitalize">
          {view === "day"
            ? date.setLocale("es").toFormat("cccc d 'de' LLLL")
            : `Semana del ${weekStart.setLocale("es").toFormat("d LLL")}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/admin/agenda?view=day&date=${dayISO}`}
            className={view === "day" ? "font-semibold underline" : "opacity-70 hover:underline"}
          >
            Día
          </Link>
          <Link
            href={`/admin/agenda?view=week&date=${dayISO}${weekBarber ? `&barber=${weekBarber.id}` : ""}`}
            className={view === "week" ? "font-semibold underline" : "opacity-70 hover:underline"}
          >
            Semana
          </Link>
          {view === "week" ? (
            <BarberJumpSelect
              barbers={data.barbers}
              defaultValue={weekBarber?.id}
              dateISO={dayISO}
            />
          ) : null}
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm opacity-70">
          No hay barberos activos.{" "}
          <Link href="/admin/barbers" className="underline">
            Agrega uno
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <div className="flex min-w-fit">
            {/* Eje de horas */}
            <div className="w-14 shrink-0 border-r border-black/10 dark:border-white/15">
              <div className="h-10 border-b border-black/10 dark:border-white/15" />
              <div className="relative" style={{ height: colHeight }}>
                {hourMarks.map((m) => (
                  <span
                    key={m}
                    className="absolute right-1 -translate-y-1/2 text-xs tabular-nums opacity-60"
                    style={{ top: (m - minStart) * PX_PER_MIN }}
                  >
                    {minutesToHhmm(m)}
                  </span>
                ))}
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
                  18,
                  ((e.getTime() - s.getTime()) / 60_000) * PX_PER_MIN,
                );

              return (
                <div
                  key={col.key}
                  className="min-w-40 flex-1 border-r border-black/10 last:border-r-0 dark:border-white/15"
                >
                  <div className="flex h-10 items-center justify-between border-b border-black/10 px-2 text-sm font-medium dark:border-white/15">
                    <span className="truncate">{col.title}</span>
                    <Link
                      href={`/admin/agenda/nueva?date=${col.day.toISODate()}&barber=${col.barberId}`}
                      className="opacity-50 hover:opacity-100"
                      aria-label="Nueva cita aquí"
                    >
                      +
                    </Link>
                  </div>
                  <div
                    className="relative bg-black/[0.04] dark:bg-white/[0.04]"
                    style={{ height: colHeight }}
                  >
                    {/* Franjas laborales (fondo claro) */}
                    {franjas.map((f, i) => (
                      <div
                        key={i}
                        className="absolute inset-x-0 bg-background"
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
                        className="absolute inset-x-0 border-t border-black/5 dark:border-white/10"
                        style={{ top: (m - minStart) * PX_PER_MIN }}
                      />
                    ))}
                    {/* Bloqueos */}
                    {offs.map((t) => (
                      <div
                        key={t.id}
                        className="absolute inset-x-0.5 z-10 flex items-center gap-1 overflow-hidden rounded border border-black/20 bg-black/15 px-1.5 py-0.5 text-xs dark:border-white/25 dark:bg-white/15"
                        style={{
                          top: top(t.startsAt),
                          height: blockH(t.startsAt, t.endsAt),
                        }}
                        title={t.reason ?? "Bloqueado"}
                      >
                        <Ban className="h-3 w-3 shrink-0" />
                        {t.reason ?? "Bloqueado"}
                      </div>
                    ))}
                    {/* Citas */}
                    {appts.map((a) => (
                      <Link
                        key={a.id}
                        href={`/admin/agenda/cita/${a.id}`}
                        className={`absolute inset-x-0.5 z-20 overflow-hidden rounded border px-1.5 py-0.5 text-xs leading-tight hover:opacity-90 ${
                          STATUS_STYLE[a.status] ?? STATUS_STYLE.confirmed
                        }`}
                        style={{
                          top: top(a.startsAt),
                          height: blockH(a.startsAt, a.endsAt),
                        }}
                        title={`${a.customerName} · ${a.serviceName}`}
                      >
                        <span className="font-semibold">
                          {DateTime.fromJSDate(a.startsAt, { zone: "utc" })
                            .setZone(tenant.timezone)
                            .toFormat("HH:mm")}
                        </span>{" "}
                        {a.customerName}
                        <span className="block truncate opacity-80">
                          {a.serviceName}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs opacity-60">
        Confirmada <span className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-300 align-middle dark:bg-emerald-800" />
        · Completada <span className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-black/20 align-middle dark:bg-white/20" />
        · No asistió <span className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-300 align-middle dark:bg-red-800" />
        · <Ban className="mx-1 inline h-3 w-3 align-middle" /> bloqueo. Las canceladas no se muestran.
      </p>
    </div>
  );
}
