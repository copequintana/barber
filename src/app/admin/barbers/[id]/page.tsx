import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageUploadField } from "@/components/image-upload-field";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import {
  linkBarberUser,
  setBarberImage,
  setBarberServices,
  unlinkBarberUser,
  updateBarber,
} from "../actions";

export const metadata = { title: "Editar barbero · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function BarberEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { id } = await params;
  const { error, ok } = await searchParams;

  const data = await withTenant(ctx.tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({
      where: { id },
      include: { services: true, user: true },
    });
    if (!barber) return null;
    const allServices = await tx.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return { barber, allServices };
  });
  if (!data) notFound();
  const { barber, allServices } = data;
  const assigned = new Map(
    barber.services.map((bs) => [bs.serviceId, bs.priceOverride]),
  );

  const updateAction = updateBarber.bind(null, barber.id);
  const servicesAction = setBarberServices.bind(null, barber.id);
  const linkAction = linkBarberUser.bind(null, barber.id);
  const unlinkAction = unlinkBarberUser.bind(null, barber.id);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link href="/admin/barbers" className="text-sm underline opacity-70">
          ← Barberos
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="mt-1 text-2xl font-bold">{barber.displayName}</h1>
          <Link
            href={`/admin/barbers/${barber.id}/schedule`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/20"
          >
            Horarios y bloqueos →
          </Link>
        </div>
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

      <ImageUploadField
        label="Foto"
        tenantId={ctx.tenantId}
        currentUrl={barber.photoUrl}
        previewClassName="h-16 w-16 rounded-full border border-black/10 object-cover dark:border-white/15"
        help="PNG, JPG o WEBP, máx. 10 MB. Se guarda al subirla."
        onUpload={setBarberImage.bind(null, barber.id)}
      />

      <form action={updateAction} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Datos</h2>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="displayName">
            Nombre
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            defaultValue={barber.displayName}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="bio">
            Bio (se muestra en la página pública)
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={2}
            maxLength={500}
            defaultValue={barber.bio ?? ""}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={barber.active} />
          Activo (visible en la página pública y con agenda)
        </label>
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground"
        >
          Guardar datos
        </button>
      </form>

      <form action={servicesAction} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Servicios que realiza</h2>
        {allServices.length === 0 ? (
          <p className="text-sm opacity-70">
            Primero crea servicios en{" "}
            <Link href="/admin/services" className="underline">
              Servicios
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {allServices.map((s) => {
              const isAssigned = assigned.has(s.id);
              const override = assigned.get(s.id);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 px-4 py-2.5 dark:border-white/15"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="service"
                      value={s.id}
                      defaultChecked={isAssigned}
                    />
                    <span>
                      {s.name}{" "}
                      <span className="text-sm opacity-60">
                        ({s.durationMin} min · base {Number(s.price)})
                      </span>
                    </span>
                  </label>
                  <input
                    name={`override_${s.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Precio propio"
                    defaultValue={override != null ? Number(override) : ""}
                    className={`${inputClass} w-32 text-sm`}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground"
        >
          Guardar servicios
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cuenta de acceso</h2>
        {barber.user ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Vinculado a <strong>{barber.user.email}</strong> — puede entrar a
              su panel de barbero.
            </span>
            <form action={unlinkAction}>
              <button type="submit" className="underline opacity-70">
                Desvincular
              </button>
            </form>
          </div>
        ) : (
          <form action={linkAction} className="flex max-w-md gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="email@delbarbero.com"
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-2 font-medium dark:border-white/20"
            >
              Vincular
            </button>
          </form>
        )}
        <p className="text-xs opacity-60">
          El email de invitación automático llega con T12; por ahora el barbero
          entra en /login con este email.
        </p>
      </section>
    </div>
  );
}
