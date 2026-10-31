import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Plus, Scissors } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { cn } from "@/lib/utils";
import { createService, moveService } from "./actions";

export const metadata = { title: "Servicios · BarberDesk" };

export default async function ServicesPage() {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;

  const services = await withTenant(ctx.tenantId, (tx) =>
    tx.service.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { barbers: true } } },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Servicios"
        description="Lo que ofreces, en el orden en que aparece en tu página. Cada barbero elige los suyos desde su ficha."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nuevo servicio</CardTitle>
          <CardDescription>
            Luego podrás ajustar el descanso entre citas y asignarlo a tus barberos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createService}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_auto] sm:items-end"
          >
            <Field>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input id="name" name="name" required minLength={2} placeholder="Corte clásico" />
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <Field>
                <FieldLabel htmlFor="durationMin">Minutos</FieldLabel>
                <Input
                  id="durationMin"
                  name="durationMin"
                  type="number"
                  required
                  min={5}
                  max={480}
                  defaultValue={30}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="price">Precio</FieldLabel>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="180"
                />
              </Field>
            </div>
            <SubmitButton pendingLabel="Agregando…">
              <Plus /> Agregar servicio
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {services.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Scissors />
            </EmptyMedia>
            <EmptyTitle>Aún no hay servicios</EmptyTitle>
            <EmptyDescription>
              Agrega el primero arriba; después asígnalo a tus barberos para que se pueda reservar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="flex flex-col divide-y">
            {services.map((s, i) => {
              const hidden = s.active && s._count.barbers === 0;
              return (
                <li key={s.id} className="flex items-center gap-2 py-2 pr-3 pl-2 sm:gap-3">
                  <div className="flex shrink-0 flex-col">
                    <form action={moveService.bind(null, s.id, "up")}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        disabled={i === 0}
                        aria-label={`Subir ${s.name}`}
                      >
                        <ChevronUp />
                      </Button>
                    </form>
                    <form action={moveService.bind(null, s.id, "down")}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        disabled={i === services.length - 1}
                        aria-label={`Bajar ${s.name}`}
                      >
                        <ChevronDown />
                      </Button>
                    </form>
                  </div>
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-medium", !s.active && "text-muted-foreground")}>
                          {s.name}
                        </span>
                        {!s.active ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactivo
                          </span>
                        ) : null}
                        {hidden ? (
                          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                            Sin barbero: no visible
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.durationMin} min
                        {s.bufferMin > 0 ? ` + ${s.bufferMin} de descanso` : ""} ·{" "}
                        {s._count.barbers} barbero{s._count.barbers === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="font-num shrink-0 font-semibold">
                      {formatMoney(Number(s.price), tenant.currency)}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        Un servicio aparece en tu página solo si está activo y al menos un barbero activo lo
        realiza.
      </p>
    </div>
  );
}
