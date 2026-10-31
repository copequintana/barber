import Link from "next/link";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePlatformAdmin } from "@/lib/platform-guard";
import {
  getPlatformMetrics,
  listTenantsWithActivity,
} from "@/lib/platform";
import { toggleSuspension } from "./actions";

export const metadata = { title: "Plataforma · BarberDesk" };

export default async function PlatformPage() {
  const actor = await requirePlatformAdmin();
  const metrics = await getPlatformMetrics();
  const tenants = await listTenantsWithActivity();

  const cards = [
    { label: "Barberías", value: metrics.tenants },
    { label: "Activas (30 días)", value: metrics.activeTenants30d },
    { label: "Suspendidas", value: metrics.suspended },
    { label: "Usuarios", value: metrics.users },
    { label: "Reservas totales", value: metrics.totalAppointments },
    { label: "Reservas (30 días)", value: metrics.appointments30d },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Consola de plataforma"
        description={`Sesión: ${actor.email}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/">
              <LogOut /> Salir de la consola
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="border-b">
          <CardTitle>Barberías</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nombre</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Barberos</TableHead>
                <TableHead className="text-right">Citas 30 d</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4">
                    <Link href={`/platform/${t.id}`} className="font-medium underline-offset-4 hover:underline">
                      {t.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">/b/{t.slug}</span>
                  </TableCell>
                  <TableCell>{t.plan}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.barbers}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.citas30d}</TableCell>
                  <TableCell className="tabular-nums">{t.createdAt.toISOString().slice(0, 10)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        t.suspended
                          ? "rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger"
                          : "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                      }
                    >
                      {t.suspended ? "Suspendida" : "Activa"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <form action={toggleSuspension.bind(null, t.id, !t.suspended, "/platform")}>
                      {t.suspended ? (
                        <Button type="submit" variant="outline" size="sm">
                          Reactivar
                        </Button>
                      ) : (
                        <ConfirmSubmit
                          title={`¿Suspender ${t.name}?`}
                          description="Su página pública dejará de aceptar reservas nuevas hasta que la reactives."
                          confirmLabel="Sí, suspender"
                          className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                        >
                          Suspender
                        </ConfirmSubmit>
                      )}
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </main>
  );
}
