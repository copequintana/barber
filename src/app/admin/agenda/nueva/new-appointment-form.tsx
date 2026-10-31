"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, UserRound } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { DateTimeInput } from "@/components/date-time-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

type Barber = { id: string; name: string; serviceIds: string[] };
type Service = { id: string; name: string; durationMin: number };
type Customer = { id: string; name: string; phone: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  slug: string;
  timezone: string;
  currency: string;
  barbers: Barber[];
  services: Service[];
  prices: Record<string, number>;
  customers: Customer[];
  defaultDate: string;
  defaultTime: string;
  defaultBarberId: string | null;
};

type SlotState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; times: string[] };

const pickerClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function NewAppointmentForm(props: Props) {
  const { barbers, services, prices, customers, currency } = props;

  const [barberId, setBarberId] = useState(
    barbers.find((b) => b.id === props.defaultBarberId)?.id ?? barbers[0]?.id ?? "",
  );
  const offered = useMemo(() => {
    const ids = new Set(barbers.find((b) => b.id === barberId)?.serviceIds ?? []);
    return services.filter((s) => ids.has(s.id));
  }, [barberId, barbers, services]);
  const [serviceId, setServiceId] = useState(offered[0]?.id ?? "");
  const service = offered.find((s) => s.id === serviceId) ?? offered[0] ?? null;

  const [date, setDate] = useState(props.defaultDate);
  const [time, setTime] = useState(props.defaultTime);
  const [slots, setSlots] = useState<SlotState>({ status: "idle" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

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

  useEffect(() => {
    if (!barberId || !service || !date) return;
    let cancelled = false;
    const params = new URLSearchParams({
      tenant: props.slug,
      service: service.id,
      barber: barberId,
      date,
    });
    (async () => {
      setSlots({ status: "loading" });
      try {
        const res = await fetch(`/api/availability?${params}`);
        const json = res.ok ? await res.json() : { slots: [] };
        if (cancelled) return;
        const times: string[] = (json.slots ?? []).map((s: { start: string }) =>
          timeFmt.format(new Date(s.start)),
        );
        setSlots({ status: "ready", times });
      } catch {
        if (!cancelled) setSlots({ status: "ready", times: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [barberId, service, date, props.slug, timeFmt]);

  const known = customers.find((c) => c.phone === phone.trim());
  const price = service ? prices[`${barberId}:${service.id}`] : undefined;

  function onNameChange(value: string) {
    const match = customers.find((c) => `${c.name} · ${c.phone}` === value);
    if (match) {
      setName(match.name);
      setPhone(match.phone);
    } else {
      setName(value);
    }
  }

  function onPhoneChange(value: string) {
    setPhone(value);
    const match = customers.find((c) => c.phone === value.trim());
    if (match && !name.trim()) setName(match.name);
  }

  return (
    <form action={props.action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <input type="hidden" name="startLocal" value={date && time ? `${date}T${time}` : ""} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" /> La cita
          </CardTitle>
          <CardDescription>
            Los horarios libres consideran el horario del barbero y sus otras citas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="barberId">Barbero</FieldLabel>
                <NativeSelect
                  id="barberId"
                  name="barberId"
                  required
                  value={barberId}
                  onChange={(e) => {
                    setBarberId(e.target.value);
                    const ids = new Set(
                      barbers.find((b) => b.id === e.target.value)?.serviceIds ?? [],
                    );
                    if (!ids.has(serviceId)) {
                      setServiceId(services.find((s) => ids.has(s.id))?.id ?? "");
                    }
                  }}
                  className="w-full"
                >
                  {barbers.map((b) => (
                    <NativeSelectOption key={b.id} value={b.id}>
                      {b.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="serviceId">Servicio</FieldLabel>
                <NativeSelect
                  id="serviceId"
                  name="serviceId"
                  required
                  value={service?.id ?? ""}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full"
                >
                  {offered.length === 0 ? (
                    <NativeSelectOption value="">Este barbero no tiene servicios</NativeSelectOption>
                  ) : null}
                  {offered.map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>
                      {s.name} ({s.durationMin} min)
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field className="sm:max-w-56">
              <FieldLabel htmlFor="date">Fecha</FieldLabel>
              <DateTimeInput
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={pickerClass}
              />
            </Field>

            <Field>
              <FieldLabel>Horarios libres</FieldLabel>
              {slots.status === "loading" ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="h-9" />
                  ))}
                </div>
              ) : slots.status === "ready" && slots.times.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Horarios libres">
                  {slots.times.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={t === time}
                      onClick={() => setTime(t)}
                      className={cn(
                        "h-9 rounded-lg border text-sm tabular-nums transition-colors",
                        t === time
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-card hover:border-primary/60",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <FieldDescription>
                  No hay horarios libres publicados ese día. Puedes escribir otra hora abajo.
                </FieldDescription>
              )}
            </Field>

            <Field className="sm:max-w-56">
              <FieldLabel htmlFor="time">Otro horario</FieldLabel>
              <DateTimeInput
                id="time"
                type="time"
                required
                step={300}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={pickerClass}
              />
              <FieldDescription>
                Para walk-ins puedes poner cualquier hora; solo no debe chocar con otra cita.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" /> Cliente
            </CardTitle>
            <CardDescription>Escribe para buscar entre tus clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  list="clientes-nombre"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                />
                <datalist id="clientes-nombre">
                  {customers.map((c) => (
                    <option key={c.id} value={`${c.name} · ${c.phone}`} />
                  ))}
                </datalist>
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  minLength={7}
                  list="clientes-telefono"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                />
                <datalist id="clientes-telefono">
                  {customers.map((c) => (
                    <option key={c.id} value={c.phone}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
                <FieldDescription>
                  {known
                    ? `Cliente existente: la cita se suma al historial de ${known.name}.`
                    : "Si el teléfono ya existe, la cita se liga a ese cliente y su historial."}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notas (opcional)</FieldLabel>
                <Textarea id="notes" name="notes" maxLength={300} rows={2} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Servicio</dt>
              <dd className="truncate">{service ? `${service.name} · ${service.durationMin} min` : "—"}</dd>
              <dt className="text-muted-foreground">Cuándo</dt>
              <dd className="tabular-nums">{date && time ? `${date.split("-").reverse().join("/")} · ${time}` : "—"}</dd>
              <dt className="text-muted-foreground">Precio</dt>
              <dd className="tabular-nums">{price != null ? formatMoney(price, currency) : "—"}</dd>
            </dl>
            <SubmitButton size="lg" pendingLabel="Creando…" disabled={!service}>
              Crear cita
            </SubmitButton>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
