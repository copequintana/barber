"use client";

import { useActionState, useMemo, useState } from "react";
import { FallbackImage } from "@/components/fallback-image";
import type { BookingCatalog } from "@/lib/catalog";
import { bookAction, type BookState } from "./actions";

type Props = {
  slug: string;
  timezone: string;
  currency: string;
  maxAdvanceDays: number;
  /** Hoy en el calendario local del tenant, YYYY-MM-DD */
  todayISO: string;
  catalog: BookingCatalog;
};

type SlotDto = { start: string; barberIds: string[] };

const cardClass =
  "w-full rounded-lg border border-black/10 px-4 py-3 text-left hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";
const chipClass =
  "rounded-md border px-3 py-2 text-sm tabular-nums transition-colors";
const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BookingWizard(props: Props) {
  const { slug, timezone, currency, catalog } = props;

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null); // "any" | id
  const [dateISO, setDateISO] = useState<string>(props.todayISO);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [startISO, setStartISO] = useState<string | null>(null);
  // Marca (state.at) del último conflicto ya atendido por el usuario, para
  // que el aviso viejo no reaparezca durante un nuevo envío.
  const [handledAt, setHandledAt] = useState(0);

  const [state, formAction, pending] = useActionState<BookState, FormData>(
    bookAction.bind(null, slug),
    { error: null, at: 0 },
  );

  const service = catalog.services.find((s) => s.id === serviceId) ?? null;

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [currency],
  );
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("es", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
      }),
    [timezone],
  );
  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("es", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    [],
  );

  const days = useMemo(
    () =>
      Array.from({ length: props.maxAdvanceDays + 1 }, (_, i) =>
        addDays(props.todayISO, i),
      ),
    [props.todayISO, props.maxAdvanceDays],
  );

  async function fetchSlots(svc: string, barber: string, date: string) {
    setSlotsLoading(true);
    setStartISO(null);
    try {
      const params = new URLSearchParams({
        tenant: slug,
        service: svc,
        date,
      });
      if (barber !== "any") params.set("barber", barber);
      const res = await fetch(`/api/availability?${params}`);
      const json = res.ok ? await res.json() : { slots: [] };
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  const showConflict = state.error === "slot_taken" && state.at !== handledAt;
  const step = !service ? 1 : !barberId ? 2 : !startISO ? 3 : 4;

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-2 text-xs" aria-label="Progreso">
        {["Servicio", "Barbero", "Horario", "Tus datos"].map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-2.5 py-1 ${
              step === i + 1
                ? "bg-[var(--brand)] text-white"
                : step > i + 1
                  ? "bg-black/10 dark:bg-white/15"
                  : "opacity-40"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {state.error && state.error !== "slot_taken" ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {state.error === "rate_limited"
            ? "Demasiados intentos, espera un momento."
            : "No pudimos crear la reserva. Revisa tus datos e intenta de nuevo."}
        </p>
      ) : null}
      {showConflict ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>Ese horario acaba de ocuparse.</p>
          <button
            type="button"
            className="self-start font-medium underline"
            onClick={() => {
              setHandledAt(state.at);
              if (serviceId && barberId) {
                void fetchSlots(serviceId, barberId, dateISO);
              }
            }}
          >
            Ver horarios disponibles
          </button>
        </div>
      ) : null}

      {/* Paso 1: servicio */}
      {step === 1 ? (
        <ul className="flex flex-col gap-2">
          {catalog.services.map((s) => {
            const prices = s.barbers.map((b) => b.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={cardClass}
                  onClick={() => setServiceId(s.id)}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="font-semibold tabular-nums">
                      {min === max
                        ? money.format(min)
                        : `desde ${money.format(min)}`}
                    </span>
                  </span>
                  <span className="text-sm opacity-70">{s.durationMin} min</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Paso 2: barbero */}
      {step === 2 && service ? (
        <div className="flex flex-col gap-2">
          <BackLink
            onClick={() => setServiceId(null)}
            label={service.name}
          />
          <button
            type="button"
            className={cardClass}
            onClick={() => {
              setBarberId("any");
              void fetchSlots(service.id, "any", dateISO);
            }}
          >
            <span className="font-medium">Cualquier barbero</span>
            <span className="block text-sm opacity-70">
              Te asignamos uno disponible
            </span>
          </button>
          {service.barbers.map((b) => (
            <button
              key={b.id}
              type="button"
              className={cardClass}
              onClick={() => {
                setBarberId(b.id);
                void fetchSlots(service.id, b.id, dateISO);
              }}
            >
              <span className="flex items-center gap-3">
                {b.photoUrl ? (
                  <FallbackImage
                    src={b.photoUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-semibold opacity-60 dark:bg-white/10">
                    {b.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between">
                    <span className="font-medium">{b.name}</span>
                    <span className="tabular-nums">{money.format(b.price)}</span>
                  </span>
                  {b.bio ? (
                    <span className="block truncate text-sm opacity-70">
                      {b.bio}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* Paso 3 y 4: fecha, hora y datos */}
      {step >= 3 && service && barberId ? (
        <div className="flex flex-col gap-3">
          <BackLink
            onClick={() => {
              setBarberId(null);
              setStartISO(null);
              setSlots(null);
            }}
            label={`${service.name} · ${
              barberId === "any"
                ? "cualquier barbero"
                : service.barbers.find((b) => b.id === barberId)?.name
            }`}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDateISO(d);
                  void fetchSlots(service.id, barberId, d);
                }}
                className={`${chipClass} shrink-0 ${
                  d === dateISO
                    ? "border-transparent bg-[var(--brand)] text-white"
                    : "border-black/15 dark:border-white/20"
                }`}
              >
                {dayFmt.format(new Date(`${d}T12:00:00Z`))}
              </button>
            ))}
          </div>

          {slotsLoading ? (
            <p className="text-sm opacity-70">Buscando horarios…</p>
          ) : slots && slots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => setStartISO(s.start)}
                  className={`${chipClass} ${
                    startISO === s.start
                      ? "border-transparent bg-[var(--brand)] text-white"
                      : "border-black/15 dark:border-white/20"
                  }`}
                >
                  {timeFmt.format(new Date(s.start))}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-70">
              No hay horarios ese día. Prueba con otra fecha.
            </p>
          )}
        </div>
      ) : null}

      {step === 4 && service && barberId && startISO ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="barberId" value={barberId} />
          <input type="hidden" name="startISO" value={startISO} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="name">
              Tu nombre
            </label>
            <input id="name" name="name" required minLength={2} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="phone">
              Teléfono (WhatsApp)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              minLength={7}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email (opcional, para tu confirmación)
            </label>
            <input id="email" name="email" type="email" className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-md bg-[var(--brand)] px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Reservando…" : "Confirmar reserva"}
          </button>
          <p className="text-center text-xs opacity-60">
            {timeFmt.format(new Date(startISO))} ·{" "}
            {dayFmt.format(new Date(`${dateISO}T12:00:00Z`))} · sin necesidad
            de crear cuenta
          </p>
        </form>
      ) : null}
    </div>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-sm underline opacity-70"
    >
      ← {label ?? "Volver"}
    </button>
  );
}
