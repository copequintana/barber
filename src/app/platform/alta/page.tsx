import Link from "next/link";
import { headers } from "next/headers";
import { ExternalLink, LayoutDashboard, Mail, Play } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCreatedBy } from "@/lib/platform";
import { requireStaff } from "@/lib/platform-guard";
import { resendInviteAction } from "./actions";
import { NewBarbershopForm } from "./new-barbershop-form";

export const metadata = { title: "Dar de alta barbería · BarberDesk" };

const OK: Record<string, string> = {
  invitado: "Barbería dada de alta. Le enviamos al dueño el correo para crear su contraseña.",
  agregado: "Barbería dada de alta. El dueño ya tenía cuenta: entra con su contraseña de siempre y la verá en sus barberías.",
  reenviado: "Le volvimos a enviar la invitación al dueño.",
};

const fecha = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; barberia?: string }> }) {
  const actor = await requireStaff();
  const { ok, error, barberia } = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "barberdesk.net";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const mine = await listCreatedBy(actor.id);
  const highlighted = mine.find((b) => b.id === barberia);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <PageHeader
        title="Dar de alta una barbería"
        description={`Después de la demo, da de alta la barbería con los datos del dueño. Sesión: ${actor.email}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/demo">
                <Play /> Demo de ventas
              </Link>
            </Button>
            {actor.isAdmin ? (
              <Button asChild variant="outline">
                <Link href="/platform">
                  <LayoutDashboard /> Consola
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {ok && OK[ok] ? (
        <Notice tone="success">
          {OK[ok]}
          {highlighted ? (
            <>
              {" "}
              Su página de reservas queda en{" "}
              <span className="font-num font-semibold">
                {host}/b/{highlighted.slug}
              </span>
              .
            </>
          ) : null}
        </Notice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva barbería</CardTitle>
          <CardDescription>
            El dueño recibe un correo para crear su contraseña y entra directo a configurar servicios, barberos y horario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewBarbershopForm host={host} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Las que diste de alta</CardTitle>
          <CardDescription>
            {mine.length === 1 ? "1 barbería" : `${mine.length} barberías`}. Si el dueño no ha creado su contraseña, puedes reenviarle la invitación.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {mine.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground sm:px-0">Todavía no das de alta ninguna barbería.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbería</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead className="hidden md:table-cell">Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mine.map((b) => (
                  <TableRow key={b.id} className={b.id === barberia ? "bg-primary/5" : undefined}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-1.5 font-medium">
                          {b.name}
                          {b.suspended ? <Badge variant="outline">Suspendida</Badge> : null}
                        </span>
                        <a
                          href={`${origin}/b/${b.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-num inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          /b/{b.slug} <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {b.owner ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm break-all">{b.owner.email}</span>
                          {b.owner.pending ? (
                            <span className="text-xs text-warning">No ha creado su contraseña</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Ya entró</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin dueño</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden align-top text-sm md:table-cell">{fecha(b.createdAt)}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end">
                        {b.owner?.pending ? (
                          <form action={resendInviteAction}>
                            <input type="hidden" name="tenantId" value={b.id} />
                            <SubmitButton variant="outline" size="sm" pendingLabel="Enviando…">
                              <Mail /> Reenviar invitación
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
