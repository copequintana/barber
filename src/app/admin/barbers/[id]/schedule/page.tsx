import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned, minutesToHhmm, WEEKDAYS_ES } from "@/lib/time";
import {
  addTimeOff,
  addWorkingHour,
  copyDay,
  deleteTimeOff,
  deleteWorkingHour,
} from "./actions";

export const metadata = { title: "Horarios · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20";

// Orden de despliegue: lunes primero
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; warn?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { id } = await params;
  const { error, ok, warn } = await searchParams;

  const tenant = await getTenantById(ctx.tenantId);
  const data = await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id } });
    if (!barber) return null;
    const [hours, timeOff] = await Promise.all([
      tx.workingHour.findMany({
        where: { barberId: id },
        orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      }),
      tx.timeOff.findMany({
        where: { barberId: id, endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      }),
    ]);
    return { barber, hours, timeOff };
  });
  if (!data || !tenant) notFound();
  const { barber, hours, timeOff } = data;

  const byDay = new Map<number, typeof hours>();
  for (const h of hours) {
    const list = byDay.get(h.weekday) ?? [];
    list.push(h);
    byDay.set(h.weekday, list);
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href={`/admin/barbers/${barber.id}`}
          className="text-sm underline opacity-70"
        >
          ← {barber.displayName}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Horarios de {barber.displayName}
        </h1>
        <p className="text-sm opacity-70">
          Hora local de la barbería ({tenant.timezone}).
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Cambios guardados.
          {warn ? (
            <>
              {" "}
              <strong>
                Atención: el bloqueo pisa {warn} cita{warn === "1" ? "" : "s"}{" "}
                activa{warn === "1" ? "" : "s"}
              </strong>{" "}
              — revísalas en la agenda y reprograma o cancela manualmente.
            </>
          ) : null}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Semana tipo</h2>
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
          {WEEK_ORDER.map((day) => {
            const ranges = byDay.get(day) ?? [];
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-2.5 last:border-b-0 dark:border-white/15"
              >
                <span className="w-24 font-medium">{WEEKDAYS_ES[day]}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ranges.length === 0 ? (
                    <span className="text-sm opacity-50">Descansa</span>
                  ) : (
                    ranges.map((r) => (
                      <form
                        key={r.id}
                        action={deleteWorkingHour.bind(null, barber.id, r.id)}
                        className="flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15"
                      >
                        <span className="tabular-nums">
                          {minutesToHhmm(r.startMin)}–{minutesToHhmm(r.endMin)}
                        </span>
                        <button
                          type="submit"
                          aria-label="Quitar franja"
                          className="ml-1 opacity-50 hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ))
                  )}
                </div>
                <form
                  action={addWorkingHour.bind(null, barber.id)}
                  className="ml-auto flex items-center gap-1.5"
                >
                  <input type="hidden" name="weekday" value={day} />
                  <input name="start" type="time" required className={inputClass} />
                  <span className="opacity-50">–</span>
                  <input name="end" type="time" required className={inputClass} />
                  <button
                    type="submit"
                    className="rounded-md border border-black/15 px-2.5 py-1.5 text-sm font-medium dark:border-white/20"
                  >
                    + Franja
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        <form
          action={copyDay.bind(null, barber.id)}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-black/15 px-4 py-3 text-sm dark:border-white/20"
        >
          <span>Copiar</span>
          <select name="from" className={inputClass} defaultValue={1}>
            {WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {WEEKDAYS_ES[d]}
              </option>
            ))}
          </select>
          <span>a:</span>
          {WEEK_ORDER.map((d) => (
            <label key={d} className="flex items-center gap-1">
              <input type="checkbox" name="to" value={d} />
              {WEEKDAYS_ES[d].slice(0, 3)}
            </label>
          ))}
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 font-medium dark:border-white/20"
          >
            Copiar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Bloqueos (vacaciones, permisos…)</h2>
        <form
          action={addTimeOff.bind(null, barber.id)}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="startsAt">
              Desde
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="endsAt">
              Hasta
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="reason">
              Motivo (opcional)
            </label>
            <input id="reason" name="reason" maxLength={120} className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Bloquear
          </button>
        </form>

        {timeOff.length === 0 ? (
          <p className="text-sm opacity-70">Sin bloqueos próximos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timeOff.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-2.5 text-sm dark:border-white/15"
              >
                <span>
                  <span className="tabular-nums">
                    {formatZoned(tenant.timezone, t.startsAt)} →{" "}
                    {formatZoned(tenant.timezone, t.endsAt)}
                  </span>
                  {t.reason ? <span className="opacity-70"> · {t.reason}</span> : null}
                </span>
                <form action={deleteTimeOff.bind(null, barber.id, t.id)}>
                  <button type="submit" className="underline opacity-60 hover:opacity-100">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
