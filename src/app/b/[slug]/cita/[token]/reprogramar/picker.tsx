"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BottomBar, ctaClass } from "@/components/booking/bottom-bar";
import { DayStrip, addDays, weekdayOf } from "@/components/booking/day-strip";
import { SlotGrid } from "@/components/booking/slot-grid";
import { Notice } from "@/components/notice";
import { rescheduleAction, type RescheduleState } from "./actions";

type Props = {
  slug: string;
  token: string;
  serviceId: string;
  barberId: string;
  weekdays: number[];
  timezone: string;
  todayISO: string;
  maxAdvanceDays: number;
};

type SlotDto = { start: string };

const MAX_SEARCH = 14;

async function fetchSlots(
  slug: string,
  serviceId: string,
  barberId: string,
  date: string,
): Promise<SlotDto[]> {
  const params = new URLSearchParams({ tenant: slug, service: serviceId, barber: barberId, date });
  try {
    const res = await fetch(`/api/availability?${params}`);
    const json = res.ok ? await res.json() : { slots: [] };
    return json.slots ?? [];
  } catch {
    return [];
  }
}

export function ReschedulePicker(props: Props) {
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [loading, setLoading] = useState<"day" | "search" | null>("search");
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
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
    [],
  );
  const formatTime = (iso: string) => timeFmt.format(new Date(iso));
  const formatDay = (iso: string) => {
    const text = dayFmt.format(new Date(`${iso}T12:00:00Z`));
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const days = useMemo(
    () =>
      Array.from({ length: props.maxAdvanceDays + 1 }, (_, i) =>
        addDays(props.todayISO, i),
      ),
    [props.todayISO, props.maxAdvanceDays],
  );
  const open = useMemo(() => new Set(props.weekdays), [props.weekdays]);
  const isClosed = (iso: string) => !open.has(weekdayOf(iso));

  const { slug, serviceId, barberId, todayISO } = props;

  async function loadDay(date: string) {
    setDateISO(date);
    setStartISO(null);
    setLoading("day");
    setSlots(await fetchSlots(slug, serviceId, barberId, date));
    setLoading(null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const candidates = days.filter((d) => open.has(weekdayOf(d))).slice(0, MAX_SEARCH);
      for (const date of candidates) {
        const found = await fetchSlots(slug, serviceId, barberId, date);
        if (cancelled) return;
        if (found.length > 0) {
          setDateISO(date);
          setSlots(found);
          setLoading(null);
          return;
        }
      }
      if (cancelled) return;
      setDateISO(candidates[0] ?? todayISO);
      setSlots([]);
      setLoading(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [days, open, slug, serviceId, barberId, todayISO]);

  const showError = state.error && state.at !== handledAt;

  return (
    <div className="flex flex-col gap-4 pb-36">
      {showError ? (
        <Notice tone="warning" className="flex flex-col gap-1">
          <p>
            {state.error === "slot_taken"
              ? "Ese horario ya no está disponible."
              : state.error === "outside_window"
                ? "Tu cita está demasiado próxima para reprogramarla en línea. Contacta a la barbería."
                : state.error === "rate_limited"
                  ? "Demasiados intentos, espera un momento."
                  : "No se pudo reprogramar. Intenta de nuevo."}
          </p>
          {state.error === "slot_taken" && dateISO ? (
            <button
              type="button"
              className="self-start font-medium underline"
              onClick={() => {
                setHandledAt(state.at);
                void loadDay(dateISO);
              }}
            >
              Actualizar horarios
            </button>
          ) : null}
        </Notice>
      ) : null}

      <DayStrip
        days={days}
        selected={dateISO}
        isClosed={isClosed}
        onSelect={(d) => void loadDay(d)}
      />

      {loading === "search" ? (
        <p className="text-sm text-muted-foreground">Buscando el primer horario libre…</p>
      ) : loading === "day" ? (
        <p className="text-sm text-muted-foreground">Buscando horarios…</p>
      ) : slots && slots.length > 0 ? (
        <SlotGrid slots={slots} selected={startISO} onSelect={setStartISO} formatTime={formatTime} />
      ) : slots ? (
        <p className="text-sm text-muted-foreground">
          No hay horarios ese día. Prueba con otra fecha.
        </p>
      ) : null}

      {startISO && dateISO ? (
        <form action={formAction}>
          <input type="hidden" name="startISO" value={startISO} />
          <BottomBar>
            <p className="title-sm">
              {formatDay(dateISO)} · <span className="font-num">{formatTime(startISO)}</span>
            </p>
            <button type="submit" disabled={pending} className={ctaClass}>
              {pending
                ? "Reprogramando…"
                : `Confirmar nuevo horario (${formatTime(startISO)})`}
            </button>
          </BottomBar>
        </form>
      ) : null}
    </div>
  );
}
