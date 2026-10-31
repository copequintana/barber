import { DateTime } from "luxon";
import { PageHeader } from "@/components/admin/page-header";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { createWalkIn } from "../actions";
import { NewAppointmentForm } from "./new-appointment-form";

export const metadata = { title: "Nueva cita · BarberDesk" };

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; barber?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { date, barber } = await searchParams;

  const { barbers, services, customers } = await withTenant(ctx.tenantId, async (tx) => {
    const barbers = await tx.barber.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
      include: { services: { select: { serviceId: true, priceOverride: true } } },
    });
    const services = await tx.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    const customers = await tx.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, name: true, phone: true },
    });
    return { barbers, services, customers };
  });

  const basePrice = new Map(services.map((s) => [s.id, Number(s.price)]));
  const prices: Record<string, number> = {};
  for (const b of barbers) {
    for (const bs of b.services) {
      const base = basePrice.get(bs.serviceId);
      if (base == null) continue;
      prices[`${b.id}:${bs.serviceId}`] =
        bs.priceOverride != null ? Number(bs.priceOverride) : base;
    }
  }

  const now = DateTime.now().setZone(tenant.timezone);
  const validDate =
    date && DateTime.fromISO(date, { zone: tenant.timezone }).isValid ? date : now.toISODate()!;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: `/admin/agenda?date=${validDate}`, label: "Agenda" }}
        title="Nueva cita"
        description="Para walk-ins o reservas por teléfono. Sin restricción de antelación: la única regla es que el horario no choque."
      />
      <NewAppointmentForm
        action={createWalkIn}
        slug={tenant.slug}
        timezone={tenant.timezone}
        currency={tenant.currency}
        barbers={barbers.map((b) => ({
          id: b.id,
          name: b.displayName,
          serviceIds: b.services.map((s) => s.serviceId),
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
        }))}
        prices={prices}
        customers={customers}
        defaultDate={validDate}
        defaultTime={now.plus({ minutes: 15 - (now.minute % 15) }).toFormat("HH:mm")}
        defaultBarberId={barber ?? null}
      />
    </div>
  );
}
