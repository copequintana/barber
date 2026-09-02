import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { deleteService, updateService } from "../actions";

export const metadata = { title: "Editar servicio · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function ServiceEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { id } = await params;
  const { error, ok } = await searchParams;

  const service = await withTenant(ctx.tenantId, (tx) =>
    tx.service.findUnique({
      where: { id },
      include: { barbers: { include: { barber: true } } },
    }),
  );
  if (!service) notFound();

  const updateAction = updateService.bind(null, service.id);
  const deleteAction = deleteService.bind(null, service.id);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link href="/admin/services" className="text-sm underline opacity-70">
          ← Servicios
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{service.name}</h1>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Cambios guardados.
        </p>
      ) : null}

      <form action={updateAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={service.name}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="durationMin">
              Duración (min)
            </label>
            <input
              id="durationMin"
              name="durationMin"
              type="number"
              required
              min={5}
              max={480}
              defaultValue={service.durationMin}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="bufferMin">
              Buffer (min)
            </label>
            <input
              id="bufferMin"
              name="bufferMin"
              type="number"
              min={0}
              max={120}
              defaultValue={service.bufferMin}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="price">
              Precio base
            </label>
            <input
              id="price"
              name="price"
              type="number"
              required
              min={0}
              step="0.01"
              defaultValue={Number(service.price)}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs opacity-60">
          El buffer es el descanso/limpieza tras el servicio: el slot ocupa
          duración + buffer. Cambiar la duración no afecta citas ya creadas.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={service.active} />
          Activo (reservable en la página pública)
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Guardar
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Barberos que lo realizan</h2>
        {service.barbers.length === 0 ? (
          <p className="text-sm opacity-70">
            Nadie aún — el servicio no aparece en la página pública. Asígnalo
            desde la ficha de un barbero.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {service.barbers.map((bs) => (
              <li key={bs.barberId}>
                <Link
                  href={`/admin/barbers/${bs.barberId}`}
                  className="rounded-full border border-black/10 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  {bs.barber.displayName}
                  {bs.priceOverride != null
                    ? ` · $${Number(bs.priceOverride)}`
                    : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={deleteAction}>
        <button type="submit" className="text-sm text-red-700 underline dark:text-red-400">
          Borrar servicio definitivamente
        </button>
      </form>
    </div>
  );
}
