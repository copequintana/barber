import { ImageUploadField } from "@/components/image-upload-field";
import { requireTenantRole } from "@/lib/guards";
import { DEFAULT_BRAND_COLOR, getTenantById } from "@/lib/tenancy";
import { setTenantImage, updateProfile } from "./actions";

export const metadata = { title: "Configuración · BarberDesk" };

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const { error, ok } = await searchParams;
  const tenant = await getTenantById(ctx.tenantId);
  if (!tenant) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm opacity-70">
          Cómo se ve y qué información muestra tu página de reservas pública.
        </p>
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

      <div>
        <h2 className="text-lg font-semibold">Marca</h2>
        <p className="text-sm opacity-70">
          Se usan en tu página de reservas y en los correos a tus clientes. Se
          guardan al subirlas, sin necesidad de tocar &quot;Guardar&quot;.
        </p>
      </div>

      <ImageUploadField
        label="Logo"
        tenantId={ctx.tenantId}
        currentUrl={tenant.logoUrl}
        previewClassName="h-16 w-16 rounded-full border border-black/10 object-cover dark:border-white/15"
        help="Imagen cuadrada. PNG, JPG o WEBP, máx. 10 MB."
        onUpload={setTenantImage.bind(null, "logoUrl")}
      />

      <ImageUploadField
        label="Portada"
        tenantId={ctx.tenantId}
        currentUrl={tenant.coverImageUrl}
        previewClassName="h-16 w-28 rounded-md border border-black/10 object-cover dark:border-white/15"
        help="Imagen ancha del local o del equipo, arriba de tu página de reservas."
        onUpload={setTenantImage.bind(null, "coverImageUrl")}
      />

      <form action={updateProfile} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="brandColor">
            Color de marca
          </label>
          <div className="flex items-center gap-3">
            <input
              id="brandColor"
              name="brandColor"
              type="color"
              defaultValue={tenant.brandColor ?? DEFAULT_BRAND_COLOR}
              className="h-10 w-16 shrink-0 rounded-md border border-black/15 bg-transparent p-1 dark:border-white/20"
            />
            <p className="text-xs opacity-60">
              Colorea el botón de reservar, los horarios seleccionados y el
              encabezado de tus correos.
            </p>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="text-lg font-semibold">Contacto</h2>
          <p className="text-sm opacity-70">
            Se muestran en tu página de reservas para que el cliente sepa
            dónde encontrarte.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="phone">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="55 1234 5678"
            defaultValue={tenant.phone ?? ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="address">
            Dirección
          </label>
          <input
            id="address"
            name="address"
            placeholder="Calle 123, Col. Centro, Ciudad"
            defaultValue={tenant.address ?? ""}
            className={inputClass}
          />
          <p className="text-xs opacity-60">
            Se usa además para armar el link &quot;Cómo llegar&quot; a Google
            Maps.
          </p>
        </div>

        <button type="submit" className="self-start rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground">
          Guardar
        </button>
      </form>
    </div>
  );
}
