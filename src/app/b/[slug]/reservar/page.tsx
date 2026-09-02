import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { getBookingCatalog } from "@/lib/catalog";
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-8">
      <div>
        <Link href={`/b/${slug}`} className="text-sm underline opacity-70">
          ← {tenant.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Reserva tu cita</h1>
        <p className="text-sm opacity-70">
          Horarios en hora local (
          {tenant.timezone.replace("America/", "").replaceAll("_", " ")}).
        </p>
      </div>

      {tenant.suspended ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Esta barbería no está aceptando reservas en línea por el momento.
          Contáctala directamente para agendar.
        </p>
      ) : catalog.services.length === 0 ? (
        <p className="text-sm opacity-70">
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
