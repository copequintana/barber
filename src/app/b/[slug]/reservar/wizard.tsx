"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Users } from "lucide-react";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { BottomBar, ctaClass } from "@/components/booking/bottom-bar";
import { DayStrip, addDays, weekdayOf } from "@/components/booking/day-strip";
import { SlotGrid } from "@/components/booking/slot-grid";
import { Notice } from "@/components/notice";
import type { BookingCatalog } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
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

const STEPS = ["Servicio", "Barbero", "Horario", "Tus datos"];
const MAX_SEARCH = 14;

const rowClass =
  "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left shadow-card transition-colors hover:border-brand/60";
const inputClass =
  "h-11 rounded-lg border bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function Steps({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Progreso">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-col gap-1.5" aria-current={step === i + 1 ? "step" : undefined}>
          <span className={cn("h-1 rounded-full", step >= i + 1 ? "bg-brand" : "bg-border")} />
          <span
            className={cn(
              "text-xs",
              step === i + 1 ? "font-semibold" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Choice({
  title,
  detail,
  onChange,
}: {
  title: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-card">
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      <button type="button" onClick={onChange} className="shrink-0 text-sm font-medium underline underline-offset-4">
        Cambiar
      </button>
    </div>
  );
}

export function BookingWizard(props: Props) {
  const { slug, timezone, currency, catalog } = props;

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [loading, setLoading] = useState<"day" | "search" | null>(null);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Marca (state.at) del último conflicto ya atendido por el usuario, para
  // que el aviso viejo no reaparezca durante un nuevo envío.
  const [handledAt, setHandledAt] = useState(0);

  const [state, formAction, pending] = useActionState<BookState, FormData>(
    bookAction.bind(null, slug),
    { error: null, at: 0 },
  );

  const service = catalog.services.find((s) => s.id === serviceId) ?? null;
  const barber = service?.barbers.find((b) => b.id === barberId) ?? null;
  const money = (amount: number) => formatMoney(amount, currency);

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

  function workingWeekdays(svcId: string, barber: string) {
    const svc = catalog.services.find((s) => s.id === svcId);
    const ids = barber === "any" ? (svc?.barbers.map((b) => b.id) ?? []) : [barber];
    return new Set(ids.flatMap((id) => catalog.barberWeekdays[id] ?? []));
  }
  const openWeekdays = service && barberId ? workingWeekdays(service.id, barberId) : null;
  const isClosed = (iso: string) => openWeekdays !== null && !openWeekdays.has(weekdayOf(iso));

  async function fetchDay(svc: string, barber: string, date: string): Promise<SlotDto[]> {
    const params = new URLSearchParams({ tenant: slug, service: svc, date });
    if (barber !== "any") params.set("barber", barber);
    try {
      const res = await fetch(`/api/availability?${params}`);
      const json = res.ok ? await res.json() : { slots: [] };
      return json.slots ?? [];
    } catch {
      return [];
    }
  }

  async function loadDay(svc: string, barber: string, date: string) {
    setDateISO(date);
    setStartISO(null);
    setLoading("day");
    setSlots(await fetchDay(svc, barber, date));
    setLoading(null);
  }

  async function findFirstAvailable(svc: string, barber: string) {
    setStartISO(null);
    setSlots(null);
    setLoading("search");
    const open = workingWeekdays(svc, barber);
    const candidates = days.filter((d) => open.has(weekdayOf(d))).slice(0, MAX_SEARCH);
    for (const date of candidates) {
      const found = await fetchDay(svc, barber, date);
      if (found.length > 0) {
        setDateISO(date);
        setSlots(found);
        setLoading(null);
        return;
      }
    }
    setDateISO(candidates[0] ?? props.todayISO);
    setSlots([]);
    setLoading(null);
  }

  function chooseBarber(id: string) {
    if (!service) return;
    setBarberId(id);
    void findFirstAvailable(service.id, id);
  }

  function backToSlots() {
    setReviewing(false);
    if (service && barberId && dateISO) void loadDay(service.id, barberId, dateISO);
  }

  const showConflict = state.error === "slot_taken" && state.at !== handledAt;
  const step = !service ? 1 : !barberId ? 2 : !reviewing || !startISO ? 3 : 4;

  const priceText = (() => {
    if (!service) return "";
    if (barber) return money(barber.price);
    const prices = service.barbers.map((b) => b.price);
    const min = Math.min(...prices);
    return min === Math.max(...prices) ? money(min) : `desde ${money(min)}`;
  })();
  const barberLabel = barberId === "any" ? "cualquier barbero" : (barber?.name ?? "");

  return (
    <div className="flex flex-col gap-6">
      <Steps step={step} />

      {state.error && state.error !== "slot_taken" ? (
        <Notice tone="danger">
          {state.error === "rate_limited"
            ? "Demasiados intentos, espera un momento."
            : "No pudimos crear la reserva. Revisa tus datos e intenta de nuevo."}
        </Notice>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-3">
          <h2 className="title-md">¿Qué te vas a hacer?</h2>
          <ul className="flex flex-col gap-2.5">
            {catalog.services.map((s) => {
              const prices = s.barbers.map((b) => b.price);
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              return (
                <li key={s.id}>
                  <button type="button" className={rowClass} onClick={() => setServiceId(s.id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {s.durationMin} min
                      </span>
                    </span>
                    <span className="font-num font-semibold">
                      {min === max ? money(min) : `desde ${money(min)}`}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {step === 2 && service ? (
        <section className="flex flex-col gap-3">
          <Choice
            title={service.name}
            detail={`${service.durationMin} min`}
            onChange={() => setServiceId(null)}
          />
          <h2 className="title-md">¿Con quién?</h2>
          <ul className="flex flex-col gap-2.5">
            <li>
              <button type="button" className={rowClass} onClick={() => chooseBarber("any")}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Cualquier barbero</span>
                  <span className="block text-sm text-muted-foreground">
                    Te damos el primer horario libre
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
            {service.barbers.map((b) => (
              <li key={b.id}>
                <button type="button" className={rowClass} onClick={() => chooseBarber(b.id)}>
                  <BarberAvatar name={b.name} photoUrl={b.photoUrl} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.name}</span>
                      <span className="font-num text-sm">{money(b.price)}</span>
                    </span>
                    {b.bio ? (
                      <span className="block truncate text-sm text-muted-foreground">{b.bio}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 3 && service && barberId ? (
        <section className="flex flex-col gap-4 pb-32">
          <Choice
            title={service.name}
            detail={`con ${barberLabel} · ${service.durationMin} min`}
            onChange={() => {
              setBarberId(null);
              setStartISO(null);
              setSlots(null);
              setDateISO(null);
            }}
          />
          {showConflict ? (
            <Notice tone="warning">Ese horario acaba de ocuparse. Elige otro.</Notice>
          ) : null}
          <DayStrip
            days={days}
            selected={dateISO}
            isClosed={isClosed}
            onSelect={(d) => void loadDay(service.id, barberId, d)}
          />
          {loading === "search" ? (
            <p className="text-sm text-muted-foreground">Buscando el primer horario libre…</p>
          ) : loading === "day" ? (
            <p className="text-sm text-muted-foreground">Buscando horarios…</p>
          ) : slots && slots.length > 0 ? (
            <SlotGrid
              slots={slots}
              selected={startISO}
              onSelect={setStartISO}
              formatTime={formatTime}
            />
          ) : slots ? (
            <p className="text-sm text-muted-foreground">
              No hay horarios ese día. Prueba con otra fecha.
            </p>
          ) : null}

          {startISO && dateISO ? (
            <BottomBar>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="title-sm">{formatDay(dateISO)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {service.name} con {barberLabel} · {service.durationMin} min
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-num text-xl leading-tight font-semibold">{formatTime(startISO)}</p>
                  <p className="font-num text-sm text-muted-foreground">{priceText}</p>
                </div>
              </div>
              <button
                type="button"
                className={ctaClass}
                onClick={() => {
                  setHandledAt(state.at);
                  setReviewing(true);
                }}
              >
                Continuar <ArrowRight className="size-4" />
              </button>
            </BottomBar>
          ) : null}
        </section>
      ) : null}

      {step === 4 && service && barberId && startISO && dateISO ? (
        <form action={formAction} className="flex flex-col gap-5 pb-36">
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="barberId" value={barberId} />
          <input type="hidden" name="startISO" value={startISO} />

          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Tu cita</p>
                <p className="title-md mt-1">{formatDay(dateISO)}</p>
                <p className="font-num text-2xl font-semibold">{formatTime(startISO)}</p>
              </div>
              <button type="button" onClick={backToSlots} className="text-sm font-medium underline underline-offset-4">
                Cambiar
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-dashed pt-3 text-sm">
              <span className="text-muted-foreground">
                {service.name} con {barberLabel} · {service.durationMin} min
              </span>
              <span className="font-num font-semibold">{priceText}</span>
            </div>
          </div>

          {showConflict ? (
            <Notice tone="warning" className="flex flex-col gap-2">
              <p>Ese horario acaba de ocuparse.</p>
              <button
                type="button"
                className="self-start font-medium underline"
                onClick={() => {
                  setHandledAt(state.at);
                  backToSlots();
                }}
              >
                Ver horarios disponibles
              </button>
            </Notice>
          ) : null}

          <h2 className="title-md">Tus datos</h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="name">
              Tu nombre
            </label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="phone">
              Teléfono (WhatsApp)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              minLength={7}
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Te avisamos ahí antes de tu cita.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email (opcional, para tu confirmación)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <BottomBar>
            <button type="submit" disabled={pending} className={ctaClass}>
              {pending ? "Reservando…" : "Confirmar reserva"}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Sin crear cuenta · puedes cancelar o cambiar desde el enlace que te damos
            </p>
          </BottomBar>
        </form>
      ) : null}
    </div>
  );
}
