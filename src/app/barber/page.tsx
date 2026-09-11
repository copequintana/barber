import Link from "next/link";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import { Ban, Check, Phone, StickyNote } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth";
import { getBarberDay, getOwnBarber } from "@/lib/barber-panel";
import { ACTIVE_TENANT_COOKIE, requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { blockSlot, markOutcome, removeTimeOff } from "./actions";

export const metadata = { title: "Mi día · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  confirmed: {
    label: "Confirmada",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  pending: {
    label: "Pendiente",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  completed: {
    label: "Completada",
    cls: "bg-black/10 opacity-70 dark:bg-white/15",
  },
  no_show: {
    label: "No asistió",
    cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export default async function BarberHomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const ctx = await requireTenantRole("barber");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { date: dateParam, error } = await searchParams;

  const today = DateTime.now().setZone(tenant.timezone).startOf("day");
  let day = dateParam
    ? DateTime.fromISO(dateParam, { zone: tenant.timezone }).startOf("day")
    : today;
  if (!day.isValid) day = today;
  const dateISO = day.toISODate()!;

  async function logout() {
    "use server";
    (await cookies()).delete(ACTIVE_TENANT_COOKIE);
    await signOut({ redirectTo: "/login" });
  }

  const barber = await getOwnBarber(ctx.tenantId, ctx.user.id);

  const data = barber
    ? await getBarberDay(ctx.tenantId, tenant.timezone, barber.id, dateISO)
    : null;

  const timeFmt = (d: Date) =>
    DateTime.fromJSDate(d, { zone: "utc" })
      .setZone(tenant.timezone)
      .toFormat("HH:mm");
  const phoneDigits = (raw: string) => raw.replace(/\D/g, "");

  const nowLocal = DateTime.now().setZone(tenant.timezone);
  const defaultBlockStart = `${dateISO}T${nowLocal
    .plus({ minutes: 15 - (nowLocal.minute % 15) })
    .toFormat("HH:mm")}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {barber ? barber.displayName : "Mi día"}
          </h1>
          <p className="text-sm opacity-70">{tenant.name}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/select-tenant" className="opacity-70 hover:underline">
            Cambiar
          </Link>
          <form action={logout}>
            <button type="submit" className="opacity-70 hover:underline">
              Salir
            </button>
          </form>
          <ThemeToggle />
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {!barber ? (
        <p className="text-sm opacity-70">
          Tu cuenta no está vinculada a ningún barbero activo de esta
          barbería. Pide al administrador que te vincule desde tu ficha.
        </p>
      ) : (
        <>
          <nav className="flex items-center justify-between text-sm">
            <Link
              href={`/barber?date=${day.minus({ days: 1 }).toISODate()}`}
              className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/20"
            >
              ←
            </Link>
            <div className="text-center">
              <p className="font-semibold capitalize">
                {day.setLocale("es").toFormat("cccc d 'de' LLLL")}
              </p>
              {!day.equals(today) ? (
                <Link href="/barber" className="text-xs underline opacity-70">
                  Volver a hoy
                </Link>
              ) : null}
            </div>
            <Link
              href={`/barber?date=${day.plus({ days: 1 }).toISODate()}`}
              className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/20"
            >
              →
            </Link>
          </nav>

          {data && data.appointments.length === 0 && data.timeOff.length === 0 ? (
            <p className="py-4 text-center text-sm opacity-70">
              Sin citas este día.
            </p>
          ) : null}

          <ul className="flex flex-col gap-2.5">
            {data?.timeOff.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-dashed border-black/20 px-3 py-2 text-sm opacity-80 dark:border-white/25"
              >
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Ban className="h-3.5 w-3.5 shrink-0" />
                  {timeFmt(t.startsAt)}–{timeFmt(t.endsAt)}
                  {t.reason ? ` · ${t.reason}` : ""}
                </span>
                <form action={removeTimeOff.bind(null, t.id, dateISO)}>
                  <button type="submit" className="underline opacity-70">
                    Quitar
                  </button>
                </form>
              </li>
            ))}

            {data?.appointments.map((a) => {
              const chip = STATUS_CHIP[a.status] ?? STATUS_CHIP.confirmed;
              const editable =
                a.status === "confirmed" || a.status === "pending";
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold tabular-nums">
                        {timeFmt(a.startsAt)}
                      </p>
                      <p className="font-medium">{a.customer.name}</p>
                      <p className="text-sm opacity-70">
                        {a.service.name} · ${Number(a.priceAtBooking)}
                      </p>
                      {a.customer.notes ? (
                        <p className="mt-1 flex items-start gap-1 text-xs opacity-60">
                          <StickyNote className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
                          {a.customer.notes}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${chip.cls}`}
                    >
                      {chip.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <a
                      href={`tel:${a.customer.phone}`}
                      className="flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 dark:border-white/20"
                    >
                      <Phone className="h-3.5 w-3.5" /> Llamar
                    </a>
                    <a
                      href={`https://wa.me/${phoneDigits(a.customer.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/20"
                    >
                      WhatsApp
                    </a>
                    {editable ? (
                      <>
                        <form
                          action={markOutcome.bind(
                            null,
                            a.id,
                            "completed",
                            dateISO,
                          )}
                          className="ml-auto"
                        >
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white"
                          >
                            <Check className="h-3.5 w-3.5" /> Listo
                          </button>
                        </form>
                        <form
                          action={markOutcome.bind(null, a.id, "no_show", dateISO)}
                        >
                          <button
                            type="submit"
                            className="rounded-md border border-red-300 px-3 py-1.5 text-red-700 dark:border-red-900 dark:text-red-400"
                          >
                            No vino
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <details className="rounded-lg border border-black/10 p-3 dark:border-white/15">
            <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
              <Ban className="h-4 w-4" /> Bloquear un hueco
            </summary>
            <form action={blockSlot} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="date" value={dateISO} />
              <label className="text-xs font-medium" htmlFor="startLocal">
                Desde
              </label>
              <input
                id="startLocal"
                name="startLocal"
                type="datetime-local"
                required
                defaultValue={defaultBlockStart}
                className={inputClass}
              />
              <label className="text-xs font-medium" htmlFor="minutes">
                Duración
              </label>
              <select id="minutes" name="minutes" className={inputClass} defaultValue={30}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
                <option value={240}>4 horas</option>
                <option value={480}>Todo el día (8 h)</option>
              </select>
              <input
                name="reason"
                maxLength={120}
                placeholder="Motivo (opcional)"
                className={inputClass}
              />
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
              >
                Bloquear
              </button>
            </form>
          </details>
        </>
      )}
    </main>
  );
}
