import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Ban, Check, History, MessageCircle, Phone, StickyNote } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DateTimeInput } from "@/components/date-time-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { longDateEs } from "@/lib/time";
import {
  cancelAppointment,
  moveAppointment,
  setAppointmentOutcome,
} from "../../actions";

export const metadata = { title: "Cita · BarberDesk" };

const pickerClass =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function CitaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;

  const data = await withTenant(ctx.tenantId, async (tx) => {
    const appt = await tx.appointment.findUnique({
      where: { id },
      include: { customer: true, service: true, barber: true },
    });
    if (!appt) return null;
    const barbers = await tx.barber.findMany({
      where: { active: true, services: { some: { serviceId: appt.serviceId } } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    });
    const [visits, noShows] = await Promise.all([
      tx.appointment.count({
        where: { customerId: appt.customerId, status: "completed" },
      }),
      tx.appointment.count({
        where: { customerId: appt.customerId, status: "no_show" },
      }),
    ]);
    return { appt, barbers, visits, noShows };
  });
  if (!data) notFound();
  const { appt, barbers, visits, noShows } = data;

  const editable = appt.status === "pending" || appt.status === "confirmed";
  const start = DateTime.fromJSDate(appt.startsAt, { zone: "utc" }).setZone(tenant.timezone);
  const end = DateTime.fromJSDate(appt.endsAt, { zone: "utc" }).setZone(tenant.timezone);
  const startLocal = start.toFormat("yyyy-MM-dd'T'HH:mm");
  const dayISO = startLocal.slice(0, 10);
  const phoneDigits = appt.customer.phone.replace(/\D/g, "");
  const past = appt.endsAt.getTime() < DateTime.now().toMillis();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/admin/agenda?date=${dayISO}`, label: "Agenda" }}
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tabular-nums">{start.toFormat("HH:mm")}</span>
            <span>{appt.customer.name}</span>
            <StatusBadge status={appt.status} className="text-sm" />
          </span>
        }
        description={`${longDateEs(start)} · ${appt.service.name} con ${appt.barber.displayName}`}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="lg:col-start-1">
            <CardHeader>
              <CardTitle>Detalle de la cita</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Fecha</dt>
                  <dd className="font-medium">{longDateEs(start)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Horario</dt>
                  <dd className="font-medium tabular-nums">
                    {start.toFormat("HH:mm")}–{end.toFormat("HH:mm")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Servicio</dt>
                  <dd className="font-medium">
                    {appt.service.name} · {appt.service.durationMin} min
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Barbero</dt>
                  <dd className="font-medium">{appt.barber.displayName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Precio</dt>
                  <dd className="font-medium tabular-nums">
                    {formatMoney(Number(appt.priceAtBooking), tenant.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={appt.status} />
                    {appt.status === "cancelled" && appt.cancelledBy ? (
                      <span className="text-muted-foreground">
                        {appt.cancelledBy === "customer"
                          ? "Canceló el cliente"
                          : "Canceló la barbería"}
                        {appt.cancelReason ? `: ${appt.cancelReason}` : ""}
                      </span>
                    ) : null}
                  </dd>
                </div>
                {appt.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Notas de la cita</dt>
                    <dd>{appt.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

        <Card className="lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                {appt.customer.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{appt.customer.name}</p>
                <p className="text-muted-foreground tabular-nums">{appt.customer.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <a href={`tel:${appt.customer.phone}`}>
                  <Phone /> Llamar
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                  <MessageCircle /> WhatsApp
                </a>
              </Button>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1">
                <strong className="tabular-nums">{visits}</strong>{" "}
                {visits === 1 ? "visita" : "visitas"}
              </span>
              {noShows > 0 ? (
                <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">
                  <strong className="tabular-nums">{noShows}</strong> no asistió
                </span>
              ) : null}
            </div>
            {appt.customer.notes ? (
              <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5">
                <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {appt.customer.notes}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button asChild variant="link" className="h-auto px-0">
              <Link href={`/admin/customers/${appt.customerId}`}>
                <History /> Historial y notas del cliente
              </Link>
            </Button>
          </CardFooter>
        </Card>

          {editable ? (
            <Card className="lg:col-start-1">
              <CardHeader>
                <CardTitle>¿Cómo salió?</CardTitle>
                <CardDescription>
                  {past
                    ? "La cita ya terminó: márcala para que cuente en tus reportes."
                    : "Márcala cuando el cliente haya pasado o si no llegó."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <form action={setAppointmentOutcome.bind(null, appt.id, "completed")}>
                  <SubmitButton
                    variant="outline"
                    className="border-success/40 bg-success-soft text-success hover:bg-success-soft/70"
                  >
                    <Check /> Completada
                  </SubmitButton>
                </form>
                <form action={setAppointmentOutcome.bind(null, appt.id, "no_show")}>
                  <SubmitButton
                    variant="outline"
                    className="border-danger/40 bg-danger-soft text-danger hover:bg-danger-soft/70"
                  >
                    <Ban /> No asistió
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {editable ? (
            <Card className="lg:col-start-1">
              <form action={moveAppointment.bind(null, appt.id)} className="flex flex-col gap-4">
                <CardHeader>
                  <CardTitle>Mover cita</CardTitle>
                  <CardDescription>
                    Cambia la hora o pásala a otro barbero que haga este servicio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="startLocal">Nueva fecha y hora</FieldLabel>
                      <DateTimeInput
                        id="startLocal"
                        name="startLocal"
                        type="datetime-local"
                        required
                        defaultValue={startLocal}
                        className={pickerClass}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="barberId">Barbero</FieldLabel>
                      <NativeSelect
                        id="barberId"
                        name="barberId"
                        required
                        defaultValue={appt.barberId}
                        className="w-full"
                      >
                        {barbers.map((b) => (
                          <NativeSelectOption key={b.id} value={b.id}>
                            {b.displayName}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <SubmitButton pendingLabel="Moviendo…">Mover cita</SubmitButton>
                </CardFooter>
              </form>
            </Card>
          ) : null}

          {editable ? (
            <Card className="border-danger/30 lg:col-start-1">
              <form action={cancelAppointment.bind(null, appt.id)} className="flex flex-col gap-4">
                <CardHeader>
                  <CardTitle className="text-danger">Cancelar cita</CardTitle>
                  <CardDescription>
                    El cliente recibe el aviso y el horario queda libre para otra reserva.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Field>
                    <FieldLabel htmlFor="reason">Motivo (opcional)</FieldLabel>
                    <Input id="reason" name="reason" maxLength={200} />
                  </Field>
                </CardContent>
                <CardFooter>
                  <ConfirmSubmit
                    title="¿Cancelar esta cita?"
                    description={`${appt.customer.name} recibirá el aviso de cancelación y el horario quedará libre.`}
                    confirmLabel="Sí, cancelar cita"
                    pendingLabel="Cancelando…"
                    className="inline-flex h-9 items-center rounded-lg border border-danger/40 bg-card px-3.5 text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
                  >
                    Cancelar cita
                  </ConfirmSubmit>
                </CardFooter>
              </form>
            </Card>
          ) : null}
      </div>
    </div>
  );
}
