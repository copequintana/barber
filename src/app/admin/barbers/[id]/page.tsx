import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarClock, KeyRound, Mail } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ImageUploadField } from "@/components/image-upload-field";
import { Notice } from "@/components/notice";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { mergeWeek, summarizeWeek } from "@/lib/hours";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  linkBarberUser,
  resendBarberInvite,
  setBarberImage,
  setBarberServices,
  unlinkBarberUser,
  updateBarber,
} from "../actions";

export const metadata = { title: "Editar barbero · BarberDesk" };

export default async function BarberEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;

  const data = await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({
      where: { id },
      include: {
        services: true,
        user: true,
        workingHours: { select: { weekday: true, startMin: true, endMin: true } },
        timeOff: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          take: 3,
        },
      },
    });
    if (!barber) return null;
    const allServices = await tx.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return { barber, allServices };
  });
  if (!data) notFound();
  const { barber, allServices } = data;
  const assigned = new Map(
    barber.services.map((bs) => [bs.serviceId, bs.priceOverride]),
  );
  const schedule = summarizeWeek(mergeWeek(barber.workingHours));
  const scheduleHref = `/admin/barbers/${barber.id}/schedule`;

  const updateAction = updateBarber.bind(null, barber.id);
  const servicesAction = setBarberServices.bind(null, barber.id);
  const linkAction = linkBarberUser.bind(null, barber.id);
  const unlinkAction = unlinkBarberUser.bind(null, barber.id);
  const resendAction = resendBarberInvite.bind(null, barber.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={barber.displayName}
        back={{ href: "/admin/barbers", label: "Barberos" }}
        description={
          barber.active
            ? "Aparece en tu página de reservas y tiene agenda."
            : "Inactivo: no aparece en tu página ni recibe reservas."
        }
        actions={
          <Button asChild variant="outline">
            <Link href={scheduleHref}>
              <CalendarClock /> Horarios y bloqueos
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Así aparece en tu página de reservas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploadField
                label="Foto"
                tenantId={ctx.tenantId}
                currentUrl={barber.photoUrl}
                previewClassName="size-16 rounded-full border object-cover"
                help="PNG, JPG o WEBP, máx. 10 MB. Se guarda en cuanto la subes."
                onUpload={setBarberImage.bind(null, barber.id)}
              />
            </CardContent>
            <form action={updateAction} className="flex flex-col gap-4">
              <CardContent>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="displayName">Nombre</FieldLabel>
                    <Input
                      id="displayName"
                      name="displayName"
                      required
                      minLength={2}
                      defaultValue={barber.displayName}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="bio">Bio</FieldLabel>
                    <Textarea
                      id="bio"
                      name="bio"
                      rows={3}
                      maxLength={500}
                      defaultValue={barber.bio ?? ""}
                      placeholder="Especialidad, años de oficio, lo que lo distingue."
                    />
                    <FieldDescription>Se muestra en tu página pública.</FieldDescription>
                  </Field>
                  <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="active">Activo</Label>
                      <p className="text-sm text-muted-foreground">
                        Visible en tu página y con agenda para reservar.
                      </p>
                    </div>
                    <Switch id="active" name="active" defaultChecked={barber.active} />
                  </div>
                </FieldGroup>
              </CardContent>
              <CardFooter className="justify-end">
                <SubmitButton>Guardar perfil</SubmitButton>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horario</CardTitle>
              <CardDescription>Cuándo se le puede reservar en la semana.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {schedule.length === 0 ? (
                <Notice tone="warning">
                  No tiene horario: nadie puede reservar con {barber.displayName} hasta
                  que le agregues franjas.
                </Notice>
              ) : (
                <ul className="flex flex-col gap-1">
                  {schedule.map((l) => (
                    <li key={l.days} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{l.days}</span>
                      <span className="font-num">{l.hours}</span>
                    </li>
                  ))}
                </ul>
              )}
              {barber.timeOff.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t pt-3">
                  {barber.timeOff.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-muted-foreground">
                      <Ban className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {formatZoned(tenant.timezone, t.startsAt)} →{" "}
                        {formatZoned(tenant.timezone, t.endsAt)}
                        {t.reason ? ` · ${t.reason}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end">
              <Button asChild variant="outline">
                <Link href={scheduleHref}>Editar horario y bloqueos</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Servicios que realiza</CardTitle>
              <CardDescription>
                Marca los que hace. Si cobra distinto, pon su precio; vacío usa el precio base.
              </CardDescription>
            </CardHeader>
            <form action={servicesAction} className="flex flex-col gap-4">
              <CardContent>
                {allServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Primero crea servicios en{" "}
                    <Link href="/admin/services" className="text-foreground underline underline-offset-4">
                      Servicios
                    </Link>
                    .
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y overflow-hidden rounded-lg border">
                    {allServices.map((s) => {
                      const override = assigned.get(s.id);
                      return (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 has-data-checked:bg-primary/5"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <Checkbox
                              name="service"
                              value={s.id}
                              defaultChecked={assigned.has(s.id)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{s.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {s.durationMin} min · base {formatMoney(Number(s.price), tenant.currency)}
                              </span>
                            </span>
                          </label>
                          <Input
                            name={`override_${s.id}`}
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Precio propio"
                            aria-label={`Precio propio para ${s.name}`}
                            defaultValue={override != null ? Number(override) : ""}
                            className="w-32"
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
              {allServices.length > 0 ? (
                <CardFooter className="justify-end">
                  <SubmitButton>Guardar servicios</SubmitButton>
                </CardFooter>
              ) : null}
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuenta de acceso</CardTitle>
              <CardDescription>
                Con una cuenta, {barber.displayName} ve su día desde el celular, marca
                citas como listas y bloquea huecos.
              </CardDescription>
            </CardHeader>
            {barber.user ? (
              <>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p className="flex items-center gap-2">
                    <KeyRound className="size-4 shrink-0 text-success" />
                    <span className="min-w-0 truncate font-medium">{barber.user.email}</span>
                    <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                      Vinculada
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Si no le llegó el correo para crear su contraseña, reenvíalo y pídele
                    que revise también spam.
                  </p>
                </CardContent>
                <CardFooter className="flex-wrap justify-end gap-2">
                  <form action={unlinkAction}>
                    <ConfirmSubmit
                      title={`¿Desvincular a ${barber.user.email}?`}
                      description={`Ya no podrá entrar al panel de ${barber.displayName}. Sus citas y su agenda se conservan, y puedes volver a vincularlo cuando quieras.`}
                      confirmLabel="Sí, desvincular"
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-danger hover:bg-danger-soft hover:text-danger",
                      )}
                    >
                      Desvincular
                    </ConfirmSubmit>
                  </form>
                  <form action={resendAction}>
                    <SubmitButton variant="outline" pendingLabel="Enviando…">
                      <Mail /> Reenviar invitación
                    </SubmitButton>
                  </form>
                </CardFooter>
              </>
            ) : (
              <form action={linkAction} className="flex flex-col gap-4">
                <CardContent>
                  <Field>
                    <FieldLabel htmlFor="email">Correo del barbero</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="nombre@correo.com"
                    />
                    <FieldDescription>
                      Le mandamos un correo para que cree su contraseña.
                    </FieldDescription>
                  </Field>
                </CardContent>
                <CardFooter className="justify-end">
                  <SubmitButton pendingLabel="Enviando…">
                    <Mail /> Vincular y enviar invitación
                  </SubmitButton>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
