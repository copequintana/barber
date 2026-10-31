import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
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
import { getTenantSupportView } from "@/lib/platform";
import { formatZoned } from "@/lib/time";
import { cn } from "@/lib/utils";
import { toggleSuspension } from "../actions";

export const metadata = { title: "Soporte de barbería · BarberDesk" };

export default async function TenantSupportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePlatformAdmin();
  const { id } = await params;
  const view = await getTenantSupportView(actor, id);
  if (!view) notFound();
  const { tenant } = view;

  const stats = [
    { label: "Barberos", value: view.barbers.length },
    { label: "Servicios activos", value: view.services },
    { label: "Clientes", value: view.customers },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <Notice tone="warning">
        Vista de soporte en <strong>solo lectura</strong>. Este acceso queda
        registrado en la auditoría.
      </Notice>

      <PageHeader
        back={{ href: "/platform", label: "Consola" }}
        title={tenant.name}
        description={`/b/${tenant.slug} · ${tenant.timezone} · ${tenant.currency} · plan ${tenant.plan}${tenant.suspended ? " · suspendida" : ""}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/b/${tenant.slug}`} target="_blank">
                <ExternalLink /> Ver página pública
              </Link>
            </Button>
            <form action={toggleSuspension.bind(null, tenant.id, !tenant.suspended, `/platform/${tenant.id}`)}>
              {tenant.suspended ? (
                <Button type="submit" variant="outline">
                  Reactivar
                </Button>
              ) : (
                <ConfirmSubmit
                  title={`¿Suspender ${tenant.name}?`}
                  description="Su página pública dejará de aceptar reservas nuevas hasta que la reactives."
                  confirmLabel="Sí, suspender"
                  className="inline-flex h-9 items-center rounded-lg border border-danger/40 px-3.5 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  Suspender
                </ConfirmSubmit>
              )}
            </form>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-lg border">
            {view.tenant.memberships.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{m.user.email}</span>
                <Badge variant="secondary">{m.role}</Badge>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2 text-sm">
            {view.barbers.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "rounded-full border px-3 py-1",
                  !b.active && "text-muted-foreground line-through",
                )}
              >
                {b.displayName} · {b._count.appointments} citas
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="gap-0 pb-0">
        <CardHeader className="border-b">
          <CardTitle>Últimas reservas</CardTitle>
        </CardHeader>
        {view.recentAppointments.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Sin reservas.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Barbero</TableHead>
                  <TableHead className="pr-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.recentAppointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-4 tabular-nums">{formatZoned(tenant.timezone, a.startsAt)}</TableCell>
                    <TableCell>{a.customer.name}</TableCell>
                    <TableCell>{a.service.name}</TableCell>
                    <TableCell>{a.barber.displayName}</TableCell>
                    <TableCell className="pr-4">
                      <StatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            {view.audit.map((log) => (
              <li key={log.id} className="tabular-nums">
                <span className="text-foreground">
                  {log.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                </span>{" "}
                · {log.action}
                {log.detail ? ` · ${log.detail}` : ""}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
