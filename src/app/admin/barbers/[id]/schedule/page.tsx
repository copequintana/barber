import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Copy, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { DateTimeInput } from "@/components/date-time-input";
import { Notice } from "@/components/notice";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { cityName } from "@/lib/hours";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned, minutesToHhmm, WEEKDAYS_ES } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  addTimeOff,
  addWorkingHour,
  copyDay,
  deleteTimeOff,
  deleteWorkingHour,
} from "./actions";
import { AddRange } from "./add-range";
import { timeFieldClass } from "./field-class";

export const metadata = { title: "Horarios · BarberDesk" };

// Orden de despliegue: lunes primero
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warn?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { id } = await params;
  const { warn } = await searchParams;

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
  const place =
    cityName(tenant.address) ?? tenant.timezone.replace("America/", "").replaceAll("_", " ");
  const addRange = addWorkingHour.bind(null, barber.id);
  const warnCount = warn ? Number(warn) : 0;
  const firstWorkingDay = WEEK_ORDER.find((d) => (byDay.get(d) ?? []).length > 0) ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Horario de ${barber.displayName}`}
        back={{ href: `/admin/barbers/${barber.id}`, label: barber.displayName }}
        description={`Horas en el horario local de ${place}.`}
      />

      {warnCount > 0 ? (
        <Notice tone="warning" className="flex flex-col gap-1">
          <p className="font-medium">
            El bloqueo cae sobre {warnCount} cita{warnCount === 1 ? "" : "s"} activa
            {warnCount === 1 ? "" : "s"}.
          </p>
          <p>
            No se cancelan solas: revísalas en la{" "}
            <Link href="/admin/agenda" className="font-medium underline underline-offset-4">
              agenda
            </Link>{" "}
            y reprográmalas o cancélalas.
          </p>
        </Notice>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Semana tipo</CardTitle>
              <CardDescription>
                Las franjas en que se puede reservar con {barber.displayName}. Un día puede
                tener varias, por ejemplo mañana y tarde.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y">
                {WEEK_ORDER.map((day) => {
                  const ranges = byDay.get(day) ?? [];
                  return (
                    <li
                      key={day}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-center"
                    >
                      <span className="w-28 shrink-0 text-sm font-medium">{WEEKDAYS_ES[day]}</span>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:min-w-48">
                        {ranges.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Descansa</span>
                        ) : (
                          ranges.map((r) => (
                            <form
                              key={r.id}
                              action={deleteWorkingHour.bind(null, barber.id, r.id)}
                              className="inline-flex items-center gap-0.5 rounded-full border bg-muted/50 py-0.5 pr-0.5 pl-3 text-sm"
                            >
                              <span className="font-num">
                                {minutesToHhmm(r.startMin)}–{minutesToHhmm(r.endMin)}
                              </span>
                              <ConfirmSubmit
                                title={`¿Quitar ${WEEKDAYS_ES[day].toLowerCase()} ${minutesToHhmm(r.startMin)}–${minutesToHhmm(r.endMin)}?`}
                                description="Los clientes ya no podrán reservar en esa franja. Las citas ya reservadas no se cancelan."
                                confirmLabel="Sí, quitar franja"
                                ariaLabel={`Quitar ${minutesToHhmm(r.startMin)}–${minutesToHhmm(r.endMin)}`}
                                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <X className="size-3.5" />
                              </ConfirmSubmit>
                            </form>
                          ))
                        )}
                      </div>
                      <div className="sm:ml-auto">
                        <AddRange action={addRange} weekday={day} dayName={WEEKDAYS_ES[day]} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Copiar un día</CardTitle>
              <CardDescription>
                Pone el horario de un día en los días que marques. Lo que esos días tenían se
                reemplaza.
              </CardDescription>
            </CardHeader>
            <form action={copyDay.bind(null, barber.id)} className="flex flex-col gap-4">
              <CardContent className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="from">Copiar el horario del</FieldLabel>
                  <NativeSelect id="from" name="from" defaultValue={firstWorkingDay} className="w-full sm:w-56">
                    {WEEK_ORDER.map((d) => (
                      <NativeSelectOption key={d} value={d}>
                        {WEEKDAYS_ES[d]}
                        {(byDay.get(d) ?? []).length === 0 ? " (descansa)" : ""}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">a estos días</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEK_ORDER.map((d) => (
                      <label
                        key={d}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm has-data-checked:border-primary has-data-checked:bg-primary/5"
                      >
                        <Checkbox name="to" value={String(d)} />
                        {WEEKDAYS_ES[d].slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </CardContent>
              <CardFooter className="justify-end">
                <SubmitButton variant="outline" pendingLabel="Copiando…">
                  <Copy /> Copiar horario
                </SubmitButton>
              </CardFooter>
            </form>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Bloqueos</CardTitle>
            <CardDescription>
              Vacaciones, permisos o un hueco que no quieres que reserven. Las citas que ya
              existan no se cancelan solas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeOff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin bloqueos próximos.</p>
            ) : (
              <ul className="flex flex-col divide-y rounded-lg border">
                {timeOff.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="flex min-w-0 items-start gap-2">
                      <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-num">
                          {formatZoned(tenant.timezone, t.startsAt)} →{" "}
                          {formatZoned(tenant.timezone, t.endsAt)}
                        </p>
                        {t.reason ? (
                          <p className="truncate text-muted-foreground">{t.reason}</p>
                        ) : null}
                      </div>
                    </div>
                    <form action={deleteTimeOff.bind(null, barber.id, t.id)}>
                      <ConfirmSubmit
                        title="¿Quitar este bloqueo?"
                        description="Ese horario volverá a estar disponible para reservas."
                        confirmLabel="Sí, quitar bloqueo"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
                      >
                        Quitar
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <form action={addTimeOff.bind(null, barber.id)} className="flex flex-col gap-4">
            <CardContent className="grid gap-3 border-t pt-4">
              <h3 className="text-sm font-medium">Nuevo bloqueo</h3>
              <Field>
                <FieldLabel htmlFor="startsAt">Desde</FieldLabel>
                <DateTimeInput
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                  className={`${timeFieldClass} w-full`}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="endsAt">Hasta</FieldLabel>
                <DateTimeInput
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  required
                  className={`${timeFieldClass} w-full`}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reason">Motivo (opcional)</FieldLabel>
                <Input id="reason" name="reason" maxLength={120} placeholder="Vacaciones, curso, cita médica…" />
              </Field>
            </CardContent>
            <CardFooter className="justify-end">
              <SubmitButton pendingLabel="Bloqueando…">
                <Ban /> Bloquear
              </SubmitButton>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
