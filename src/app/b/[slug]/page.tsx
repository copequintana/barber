import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold" style={{ color: tenant.brandColor ?? undefined }}>
          {tenant.name}
        </h1>
        <p className="text-sm opacity-70">
          Reserva en línea · Horarios en zona {tenant.timezone.replace("America/", "").replaceAll("_", " ")}
        </p>
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

      <Link
        href={`/b/${slug}/reservar`}
        className="rounded-md bg-foreground px-5 py-3 text-center font-medium text-background"
      >
        Reservar cita
      </Link>
    </main>
  );
}
