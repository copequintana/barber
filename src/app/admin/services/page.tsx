import Link from "next/link";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { createService, moveService } from "./actions";

export const metadata = { title: "Servicios · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { error } = await searchParams;

  const services = await withTenant(ctx.tenantId, (tx) =>
    tx.service.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { barbers: true } } },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Servicios</h1>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <form
        action={createService}
        className="flex max-w-2xl flex-wrap items-end gap-2"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="name">
            Nuevo servicio
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="Corte clásico"
            className={inputClass}
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="durationMin">
            Minutos
          </label>
          <input
            id="durationMin"
            name="durationMin"
            type="number"
            required
            min={5}
            max={480}
            defaultValue={30}
            className={inputClass}
          />
        </div>
        <div className="flex w-28 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="price">
            Precio
          </label>
          <input
            id="price"
            name="price"
            type="number"
            required
            min={0}
            step="0.01"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background"
        >
          Agregar
        </button>
      </form>

      {services.length === 0 ? (
        <p className="text-sm opacity-70">Aún no hay servicios.</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {services.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
            >
              <div className="flex flex-col gap-1">
                <form action={moveService.bind(null, s.id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    aria-label="Subir"
                    className="opacity-60 hover:opacity-100 disabled:opacity-20"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveService.bind(null, s.id, "down")}>
                  <button
                    type="submit"
                    disabled={i === services.length - 1}
                    aria-label="Bajar"
                    className="opacity-60 hover:opacity-100 disabled:opacity-20"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <Link
                href={`/admin/services/${s.id}`}
                className="flex flex-1 items-center justify-between hover:underline"
              >
                <div>
                  <p className={`font-medium ${s.active ? "" : "line-through opacity-50"}`}>
                    {s.name}
                  </p>
                  <p className="text-sm opacity-70">
                    {s.durationMin} min
                    {s.bufferMin > 0 ? ` + ${s.bufferMin} buffer` : ""} · $
                    {Number(s.price)} · {s._count.barbers} barbero
                    {s._count.barbers === 1 ? "" : "s"}
                  </p>
                </div>
                {s._count.barbers === 0 && s.active ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Sin barbero: no visible
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm opacity-60">
        Un servicio solo aparece en la página pública si está activo y al menos
        un barbero activo lo realiza. Asigna servicios desde la ficha de cada
        barbero.
      </p>
    </div>
  );
}
