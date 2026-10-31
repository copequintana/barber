import Link from "next/link";
import { ChevronRight, Clock, KeyRound, Plus, UserRoundX, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { mergeWeek, summarizeWeek } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { createBarber } from "./actions";

export const metadata = { title: "Barberos · BarberDesk" };

export default async function BarbersPage() {
  const ctx = await requireTenantRole("owner", "admin");

  const barbers = await withTenant(ctx.tenantId, (tx) =>
    tx.barber.findMany({
      orderBy: [{ active: "desc" }, { displayName: "asc" }],
      include: {
        _count: { select: { services: true } },
        user: true,
        workingHours: { select: { weekday: true, startMin: true, endMin: true } },
      },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Barberos"
        description="Quién atiende en tu barbería, qué servicios hace y si puede entrar a su propio panel."
      />

      <Card>
        <CardHeader>
          <CardTitle>Agregar barbero</CardTitle>
          <CardDescription>
            Después le asignas servicios, horario y, si quieres, una cuenta para su panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBarber} className="flex flex-col gap-2 sm:flex-row">
            <Input
              name="displayName"
              required
              minLength={2}
              placeholder="Nombre del barbero"
              aria-label="Nombre del barbero"
              className="sm:max-w-xs"
            />
            <SubmitButton pendingLabel="Agregando…">
              <Plus /> Agregar barbero
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {barbers.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>Aún no hay barberos</EmptyTitle>
            <EmptyDescription>
              Agrega el primero arriba. Sin barberos activos tu página no puede recibir reservas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {barbers.map((b) => {
            const schedule = summarizeWeek(mergeWeek(b.workingHours));
            return (
              <li key={b.id}>
                <Link
                  href={`/admin/barbers/${b.id}`}
                  className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
                >
                  <BarberAvatar
                    name={b.displayName}
                    photoUrl={b.photoUrl}
                    className={cn("size-12", !b.active && "opacity-50")}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate font-medium", !b.active && "text-muted-foreground")}>
                        {b.displayName}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          b.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {b.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b._count.services} servicio{b._count.services === 1 ? "" : "s"}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {schedule.length > 0
                          ? schedule.map((l) => `${l.days} · ${l.hours}`).join(" — ")
                          : "Sin horario"}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {b.user ? (
                        <>
                          <KeyRound className="size-3.5 shrink-0" />
                          <span className="truncate">{b.user.email}</span>
                        </>
                      ) : (
                        <>
                          <UserRoundX className="size-3.5 shrink-0" />
                          Sin cuenta de acceso
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
