import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";

export const metadata = { title: "Panel · BarberDesk" };

export default async function AdminHomePage() {
  const ctx = await requireTenantRole("owner", "admin");

  const stats = await withTenant(ctx.tenantId, async (tx) => {
    const barbers = await tx.barber.count({ where: { active: true } });
    const services = await tx.service.count({ where: { active: true } });
    const upcoming = await tx.appointment.count({
      where: {
        status: { in: ["pending", "confirmed"] },
        startsAt: { gte: new Date() },
      },
    });
    return { barbers, services, upcoming };
  });

  const cards = [
    { label: "Barberos activos", value: stats.barbers },
    { label: "Servicios activos", value: stats.services },
    { label: "Citas próximas", value: stats.upcoming },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Panel</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-black/10 p-4 dark:border-white/15"
          >
            <p className="text-3xl font-bold tabular-nums">{c.value}</p>
            <p className="text-sm opacity-70">{c.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm opacity-70">
        Próximamente aquí: gestión de barberos, servicios y horarios (T05–T07)
        y la agenda (T11).
      </p>
    </div>
  );
}
