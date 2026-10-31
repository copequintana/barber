import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { BottomBar, ctaClass } from "@/components/booking/bottom-bar";
import { TenantHero } from "@/components/booking/tenant-hero";
import { FallbackImage } from "@/components/fallback-image";
import { Notice } from "@/components/notice";
import { getPublicCatalog } from "@/lib/catalog";
import {
  cityName,
  mergeWeek,
  openStatus,
  shortLocation,
  summarizeWeek,
} from "@/lib/hours";
import { formatMoney } from "@/lib/money";
import { getTenantBySlug } from "@/lib/tenancy";
import { getTheme } from "@/lib/themes";

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
    robots: tenant.isDemo ? { index: false, follow: false } : undefined,
  };
}

function SectionTitle({ children, rule }: { children: React.ReactNode; rule: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="title-md">{children}</h2>
      {rule ? <span aria-hidden className="h-px flex-1 bg-ornament/40" /> : null}
    </div>
  );
}

export default async function TenantPublicPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const theme = getTheme(tenant.theme);
  const { services, barbers, hours } = await getPublicCatalog(tenant.id);
  const week = mergeWeek(hours);
  const schedule = summarizeWeek(week);
  const status = openStatus(week, DateTime.now().setZone(tenant.timezone));
  const location = shortLocation(tenant.address);
  const city = cityName(tenant.address);
  const money = (amount: number) => formatMoney(amount, tenant.currency);

  const mapsUrl =
    tenant.lat != null && tenant.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${tenant.lat},${tenant.lng}`
      : tenant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
        : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col pb-36">
      {tenant.coverImageUrl ? (
        <FallbackImage
          src={tenant.coverImageUrl}
          alt=""
          className="h-44 w-full object-cover sm:h-56 sm:rounded-b-xl"
        />
      ) : null}

      <TenantHero
        traits={theme.traits}
        name={tenant.name}
        logoUrl={tenant.logoUrl}
        location={location}
        city={city}
        schedule={schedule}
        status={status}
      />

      <div className="flex flex-col gap-8 px-5 pt-7">
        {tenant.suspended ? (
          <Notice tone="warning">
            Esta barbería no está aceptando reservas en línea por el momento.
            Contáctala directamente para agendar.
          </Notice>
        ) : null}

        <section className="flex flex-col gap-3">
          <SectionTitle rule={theme.traits.priceList !== "tarjetas"}>
            {theme.traits.priceList === "puntos" ? "Lista de precios" : "Servicios"}
          </SectionTitle>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta barbería aún no publicó sus servicios.
            </p>
          ) : theme.traits.priceList === "lineas" ? (
            <ul className="flex flex-col border-t">
              {services.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3 border-b py-4">
                  <div>
                    <p className="title-sm">{s.name}</p>
                    <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
                      {s.durationMin} min
                    </p>
                  </div>
                  <p className="font-num text-lg">{money(Number(s.price))}</p>
                </li>
              ))}
            </ul>
          ) : theme.traits.priceList === "puntos" ? (
            <ul className="flex flex-col gap-3.5">
              {services.map((s) => (
                <li key={s.id} className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span aria-hidden className="leader" />
                    <span className="font-num font-semibold">
                      {money(Number(s.price))}
                    </span>
                  </div>
                  <span className="font-num text-xs text-muted-foreground">
                    {s.durationMin} min
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.durationMin} min</p>
                  </div>
                  <p className="font-num font-semibold">{money(Number(s.price))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {barbers.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionTitle rule={theme.traits.barbers === "lista"}>Barberos</SectionTitle>
            {theme.traits.barbers === "lista" ? (
              <ul className="flex flex-col divide-y divide-border">
                {barbers.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 py-3 first:pt-0">
                    <BarberAvatar name={b.displayName} photoUrl={b.photoUrl} className="size-12" />
                    <div className="flex flex-col gap-0.5">
                      <p className="font-medium">{b.displayName}</p>
                      {b.bio ? (
                        <p className="text-sm text-muted-foreground">{b.bio}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {barbers.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-card"
                  >
                    <BarberAvatar name={b.displayName} photoUrl={b.photoUrl} className="size-12" />
                    <p className="font-medium">{b.displayName}</p>
                    {b.bio ? (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{b.bio}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tenant.address || tenant.phone || schedule.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionTitle rule={theme.traits.priceList !== "tarjetas"}>
              Ubicación y horario
            </SectionTitle>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-sm shadow-card">
              {tenant.address ? (
                <p className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {tenant.address}
                </p>
              ) : null}
              {schedule.length > 0 ? (
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <ul className="flex flex-col gap-0.5">
                    {schedule.map((l) => (
                      <li key={l.days}>
                        {l.days} · <span className="font-num">{l.hours}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {tenant.phone ? (
                <p className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-num">{tenant.phone}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-medium hover:bg-muted"
                  >
                    <Navigation className="size-4" /> Cómo llegar
                  </a>
                ) : null}
                {tenant.phone ? (
                  <a
                    href={`tel:${tenant.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-medium hover:bg-muted"
                  >
                    <Phone className="size-4" /> Llamar
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {!tenant.suspended && services.length > 0 ? (
        <BottomBar>
          <Link href={`/b/${slug}/reservar`} className={ctaClass}>
            Reservar cita
          </Link>
        </BottomBar>
      ) : null}
    </main>
  );
}
