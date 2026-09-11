"use client";

import { useActionState, useMemo, useState } from "react";
import { rescheduleAction, type RescheduleState } from "./actions";

type Props = {
  slug: string;
  token: string;
  serviceId: string;
  barberId: string;
  timezone: string;
  todayISO: string;
  maxAdvanceDays: number;
};

type SlotDto = { start: string };

const chipClass =
  "rounded-md border px-3 py-2 text-sm tabular-nums transition-colors";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ReschedulePicker(props: Props) {
  const [dateISO, setDateISO] = useState(props.todayISO);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [handledAt, setHandledAt] = useState(0);

  const [state, formAction, pending] = useActionState<RescheduleState, FormData>(
    rescheduleAction.bind(null, props.slug, props.token),
    { error: null, at: 0 },
  );

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("es", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: props.timezone,
      }),
    [props.timezone],
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

  async function fetchSlots(date: string) {
    setLoading(true);
    setStartISO(null);
    try {
      const params = new URLSearchParams({
        tenant: props.slug,
        service: props.serviceId,
        barber: props.barberId,
        date,
      });
      const res = await fetch(`/api/availability?${params}`);
      const json = res.ok ? await res.json() : { slots: [] };
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  const showError = state.error && state.at !== handledAt;

  return (
    <div className="flex flex-col gap-4">
      {showError ? (
        <div className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>
            {state.error === "slot_taken"
              ? "Ese horario ya no está disponible."
              : state.error === "outside_window"
                ? "Tu cita está demasiado próxima para reprogramarla en línea. Contacta a la barbería."
                : state.error === "rate_limited"
                  ? "Demasiados intentos, espera un momento."
                  : "No se pudo reprogramar. Intenta de nuevo."}
          </p>
          {state.error === "slot_taken" ? (
            <button
              type="button"
              className="self-start font-medium underline"
              onClick={() => {
                setHandledAt(state.at);
                void fetchSlots(dateISO);
              }}
            >
              Actualizar horarios
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDateISO(d);
              void fetchSlots(d);
            }}
            className={`${chipClass} shrink-0 ${
              d === dateISO && slots !== null
                ? "border-transparent bg-[var(--brand)] text-white"
                : "border-black/15 dark:border-white/20"
            }`}
          >
            {dayFmt.format(new Date(`${d}T12:00:00Z`))}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm opacity-70">Buscando horarios…</p>
      ) : slots === null ? (
        <p className="text-sm opacity-70">Elige un día para ver horarios.</p>
      ) : slots.length === 0 ? (
        <p className="text-sm opacity-70">
          No hay horarios ese día. Prueba con otra fecha.
        </p>
      ) : (
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
      )}

      {startISO ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="startISO" value={startISO} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[var(--brand)] px-4 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {pending
              ? "Reprogramando…"
              : `Confirmar nuevo horario (${timeFmt.format(new Date(startISO))})`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
