import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { ConfirmSubmit } from "@/components/confirm-submit";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { cn } from "@/lib/utils";
import { deleteService, updateService } from "../actions";

export const metadata = { title: "Editar servicio · BarberDesk" };

export default async function ServiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;

  const service = await withTenant(ctx.tenantId, (tx) =>
    tx.service.findUnique({
      where: { id },
      include: {
        barbers: {
          include: { barber: true },
          orderBy: { barber: { displayName: "asc" } },
        },
      },
    }),
  );
  if (!service) notFound();

  const updateAction = updateService.bind(null, service.id);
  const deleteAction = deleteService.bind(null, service.id);
  const money = (amount: number) => formatMoney(amount, tenant.currency);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={service.name}
        back={{ href: "/admin/services", label: "Servicios" }}
        description={
          !service.active
            ? "Inactivo: no se puede reservar."
            : service.barbers.length === 0
              ? "Activo, pero ningún barbero lo realiza todavía."
              : "Visible en tu página de reservas."
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Datos del servicio</CardTitle>
            <CardDescription>Cambiar la duración no afecta las citas ya reservadas.</CardDescription>
          </CardHeader>
          <form action={updateAction} className="flex flex-col gap-4">
            <CardContent>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="name">Nombre</FieldLabel>
                  <Input id="name" name="name" required minLength={2} defaultValue={service.name} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="durationMin">Duración (min)</FieldLabel>
                    <Input
                      id="durationMin"
                      name="durationMin"
                      type="number"
                      required
                      min={5}
                      max={480}
                      defaultValue={service.durationMin}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="bufferMin">Descanso (min)</FieldLabel>
                    <Input
                      id="bufferMin"
                      name="bufferMin"
                      type="number"
                      min={0}
                      max={120}
                      defaultValue={service.bufferMin}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="price">Precio base</FieldLabel>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      required
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      defaultValue={Number(service.price)}
                    />
                  </Field>
                </div>
                <FieldDescription>
                  El descanso es el tiempo de limpieza tras el servicio: el horario reservado
                  ocupa duración + descanso.
                </FieldDescription>
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/40 p-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="active">Activo</Label>
                    <p className="text-sm text-muted-foreground">
                      Se puede reservar en tu página.
                    </p>
                  </div>
                  <Switch id="active" name="active" defaultChecked={service.active} />
                </div>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end">
              <SubmitButton>Guardar cambios</SubmitButton>
            </CardFooter>
          </form>
        </Card>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Barberos que lo realizan</CardTitle>
              <CardDescription>Se asigna desde la ficha de cada barbero.</CardDescription>
            </CardHeader>
            <CardContent>
              {service.barbers.length === 0 ? (
                <Notice tone="warning">
                  Nadie lo realiza todavía, así que no aparece en tu página. Asígnalo desde
                  la ficha de un barbero en{" "}
                  <Link href="/admin/barbers" className="font-medium underline underline-offset-4">
                    Barberos
                  </Link>
                  .
                </Notice>
              ) : (
                <ul className="flex flex-col divide-y rounded-lg border">
                  {service.barbers.map((bs) => (
                    <li key={bs.barberId}>
                      <Link
                        href={`/admin/barbers/${bs.barberId}`}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <BarberAvatar
                          name={bs.barber.displayName}
                          photoUrl={bs.barber.photoUrl}
                          className="size-8 text-sm"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {bs.barber.displayName}
                        </span>
                        <span className="font-num shrink-0 text-muted-foreground">
                          {bs.priceOverride != null
                            ? money(Number(bs.priceOverride))
                            : `${money(Number(service.price))} base`}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle>Borrar servicio</CardTitle>
              <CardDescription>
                Si ya tiene citas registradas no se puede borrar: desactívalo para que deje
                de reservarse.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-end">
              <form action={deleteAction}>
                <ConfirmSubmit
                  title={`¿Borrar ${service.name} definitivamente?`}
                  description="Deja de aparecer en tu página y en la agenda. Esta acción no se puede deshacer."
                  confirmLabel="Sí, borrar servicio"
                  pendingLabel="Borrando…"
                  className={cn(buttonVariants({ variant: "destructive" }), "gap-1.5")}
                >
                  <Trash2 className="size-4" /> Borrar definitivamente
                </ConfirmSubmit>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
