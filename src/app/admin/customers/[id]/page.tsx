import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CalendarX2, ChevronRight, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cliente · BarberDesk" };

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;

  const customer = await withTenant(ctx.tenantId, (tx) =>
    tx.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true, barber: true },
          orderBy: { startsAt: "desc" },
          take: 50,
        },
      },
    }),
  );
  if (!customer) notFound();

  const noShows = customer.appointments.filter(
    (a) => a.status === "no_show",
  ).length;
  const completed = customer.appointments.filter(
    (a) => a.status === "completed",
  ).length;
  const spent = customer.appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.priceAtBooking), 0);
  const phoneDigits = customer.phone.replace(/\D/g, "");

  async function saveNotes(formData: FormData) {
    "use server";
    const ctx = await requireTenantRole("owner", "admin");
    const notes = String(formData.get("notes") ?? "")
      .trim()
      .slice(0, 1000);
    await withTenant(ctx.tenantId, (tx) =>
      tx.customer.updateMany({ where: { id }, data: { notes: notes || null } }),
    );
    revalidatePath(`/admin/customers/${id}`);
    redirect(`/admin/customers/${id}?ok=1`);
  }

  const stats = [
    { label: customer.appointments.length === 1 ? "Cita" : "Citas", value: customer.appointments.length },
    { label: completed === 1 ? "Completada" : "Completadas", value: completed },
    { label: "No asistió", value: noShows, alert: noShows > 0 },
    { label: "Gastado", value: formatMoney(spent, tenant.currency) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/agenda", label: "Agenda" }}
        title={customer.name}
        description={
          <span className="tabular-nums">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`tel:${customer.phone}`}>
                <Phone /> Llamar
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm" className={cn(s.alert && "border-danger/30 bg-danger-soft")}>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", s.alert && "text-danger")}>
                {s.value}
              </p>
              <p className={cn("text-muted-foreground", s.alert && "text-danger")}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <form action={saveNotes} className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Notas del cliente</CardTitle>
              <CardDescription>
                Preferencias, alergias, cómo le gusta el corte. Las ve el barbero en su panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                rows={5}
                maxLength={1000}
                aria-label="Notas del cliente"
                defaultValue={customer.notes ?? ""}
              />
            </CardContent>
            <CardFooter>
              <SubmitButton>Guardar notas</SubmitButton>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>Las últimas 50 citas, de la más reciente a la más antigua.</CardDescription>
          </CardHeader>
          <CardContent>
            {customer.appointments.length === 0 ? (
              <Empty className="p-4">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarX2 />
                  </EmptyMedia>
                  <EmptyTitle>Sin citas registradas</EmptyTitle>
                  <EmptyDescription>Cuando reserve, sus citas aparecerán aquí.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {customer.appointments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/admin/agenda/cita/${a.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium tabular-nums">
                          {formatZoned(tenant.timezone, a.startsAt)}
                        </p>
                        <p className="truncate text-muted-foreground">
                          {a.service.name} · {a.barber.displayName}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
