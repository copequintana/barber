import Link from "next/link";
import { DateTime } from "luxon";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { createWalkIn } from "../actions";

export const metadata = { title: "Nueva cita · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; barber?: string; error?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { date, barber, error } = await searchParams;

  const { barbers, services } = await withTenant(ctx.tenantId, async (tx) => {
    const barbers = await tx.barber.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
      include: { services: { select: { serviceId: true } } },
    });
    const services = await tx.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return { barbers, services };
  });

  const now = DateTime.now().setZone(tenant.timezone);
  const defaultLocal = `${date ?? now.toISODate()}T${now
    .plus({ minutes: 15 - (now.minute % 15) })
    .toFormat("HH:mm")}`;

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <Link href="/admin/agenda" className="text-sm underline opacity-70">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nueva cita</h1>
        <p className="text-sm opacity-70">
          Para walk-ins o reservas por teléfono. Sin restricción de antelación:
          la única regla es que el horario no choque.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <form action={createWalkIn} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="barberId">
              Barbero
            </label>
            <select
              id="barberId"
              name="barberId"
              required
              defaultValue={barber ?? undefined}
              className={inputClass}
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="serviceId">
              Servicio
            </label>
            <select id="serviceId" name="serviceId" required className={inputClass}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} min)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="startLocal">
            Fecha y hora (local de la barbería)
          </label>
          <input
            id="startLocal"
            name="startLocal"
            type="datetime-local"
            required
            defaultValue={defaultLocal}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="name">
              Cliente
            </label>
            <input id="name" name="name" required placeholder="Nombre" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="phone">
              Teléfono
            </label>
            <input id="phone" name="phone" type="tel" required className={inputClass} />
          </div>
        </div>
        <p className="text-xs opacity-60">
          Si el teléfono ya existe, la cita se liga a ese cliente y su historial.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="notes">
            Notas (opcional)
          </label>
          <input id="notes" name="notes" maxLength={300} className={inputClass} />
        </div>

        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground"
        >
          Crear cita
        </button>
      </form>

      <p className="text-xs opacity-60">
        El servicio se cobra al precio del barbero elegido (con su precio
        propio si lo tiene). Si el barbero no ofrece el servicio elegido, la
        creación fallará.
      </p>
    </div>
  );
}
