import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { BookingHeader } from "@/components/booking/page-header";
import { Notice } from "@/components/notice";
import { getBookingCatalog } from "@/lib/catalog";
import { cityName } from "@/lib/hours";
import { getTenantBySlug } from "@/lib/tenancy";
import { BookingWizard } from "./wizard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  return { title: tenant ? `Reservar · ${tenant.name}` : "Reservar" };
}

export default async function ReservarPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const catalog = await getBookingCatalog(tenant.id);
  const todayISO = DateTime.now().setZone(tenant.timezone).toISODate()!;
  const place =
    cityName(tenant.address) ??
    tenant.timezone.replace("America/", "").replaceAll("_", " ");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-5 py-6">
      <BookingHeader
        backHref={`/b/${slug}`}
        backLabel={`Volver a ${tenant.name}`}
        eyebrow={tenant.name}
        title="Reserva tu cita"
      >
        <p className="text-sm text-muted-foreground">Horarios en hora local de {place}.</p>
      </BookingHeader>

      {tenant.suspended ? (
        <Notice tone="warning">
          Esta barbería no está aceptando reservas en línea por el momento.
          Contáctala directamente para agendar.
        </Notice>
      ) : catalog.services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta barbería aún no tiene servicios reservables en línea.
        </p>
      ) : (
        <BookingWizard
          slug={slug}
          timezone={tenant.timezone}
          currency={tenant.currency}
          maxAdvanceDays={tenant.maxAdvanceDays}
          todayISO={todayISO}
          catalog={catalog}
        />
      )}
    </main>
  );
}
