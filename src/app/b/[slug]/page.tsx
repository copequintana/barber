import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FallbackImage } from "@/components/fallback-image";
import { getPublicCatalog } from "@/lib/catalog";
import { getTenantBySlug } from "@/lib/tenancy";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Barbería no encontrada" };
  const description = `Agenda tu cita en ${tenant.name}: reserva en línea, sin llamadas.`;
  return {
    title: `${tenant.name} · Reserva tu cita`,
    description,
    openGraph: {
      title: tenant.name,
      description,
      type: "website",
      images: tenant.coverImageUrl ? [tenant.coverImageUrl] : undefined,
    },
  };
}

export default async function TenantPublicPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const { services, barbers } = await getPublicCatalog(tenant.id);

  const money = new Intl.NumberFormat("es", {
    style: "currency",
    currency: tenant.currency,
    maximumFractionDigits: 0,
  });

  const hasContact = Boolean(tenant.phone || tenant.address);
  const mapsUrl = tenant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col pb-10">
      {tenant.coverImageUrl ? (
        <FallbackImage
          src={tenant.coverImageUrl}
          alt=""
          className="h-40 w-full object-cover sm:h-52"
        />
      ) : null}

      <div className="flex flex-col gap-8 px-6 pt-10">
        <header className="flex items-center gap-4">
          {tenant.logoUrl ? (
            <FallbackImage
              src={tenant.logoUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold" style={{ color: tenant.brandColor ?? undefined }}>
              {tenant.name}
            </h1>
            <p className="text-sm opacity-70">
              Reserva en línea · Horarios en zona {tenant.timezone.replace("America/", "").replaceAll("_", " ")}
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Servicios</h2>
          {services.length === 0 ? (
            <p className="text-sm opacity-70">
              Esta barbería aún no publicó sus servicios.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm opacity-70">{s.durationMin} min</p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {money.format(Number(s.price))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Barberos</h2>
          <ul className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <li
                key={b.id}
                className="rounded-full border border-black/10 px-4 py-1.5 text-sm dark:border-white/15"
              >
                {b.displayName}
              </li>
            ))}
          </ul>
        </section>

        {hasContact ? (
          <section className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
            <h2 className="mb-1 text-lg font-semibold">Ubicación y contacto</h2>
            {tenant.address ? <p className="opacity-80">{tenant.address}</p> : null}
            {tenant.phone ? <p className="opacity-80">Tel. {tenant.phone}</p> : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 self-start font-medium text-[var(--brand)] underline"
              >
                Cómo llegar ↗
              </a>
            ) : null}
          </section>
        ) : null}

        <Link
          href={`/b/${slug}/reservar`}
          className="rounded-md bg-[var(--brand)] px-5 py-3 text-center font-medium text-white"
        >
          Reservar cita
        </Link>
      </div>
    </main>
  );
}
