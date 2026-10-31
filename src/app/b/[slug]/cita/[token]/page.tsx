import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { CalendarPlus, CalendarSync, MapPin, Navigation } from "lucide-react";
import { ctaClass } from "@/components/booking/bottom-bar";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { cancelBookingByToken, getAppointmentByToken } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { sendCancellationNotification } from "@/lib/notifications";
import { getTenantBySlug } from "@/lib/tenancy";
import { formatZoned, longDateEs, utcToZoned } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tu cita · BarberDesk" };

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente de confirmación", className: "bg-warning-soft text-warning" },
  confirmed: { label: "Confirmada", className: "bg-success-soft text-success" },
  completed: { label: "Completada", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelada", className: "bg-danger-soft text-danger" },
  no_show: { label: "No asistió", className: "bg-danger-soft text-danger" },
};

export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{
    cancelled?: string;
    error?: string;
    nueva?: string;
    movida?: string;
  }>;
}) {
  const { slug, token } = await params;
  const { cancelled, error, nueva, movida } = await searchParams;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const appt = await getAppointmentByToken(tenant.id, token);
  if (!appt) notFound();

  async function cancel() {
    "use server";
    const tenant = await getTenantBySlug(slug);
    if (!tenant) notFound();
    const result = await cancelBookingByToken(tenant.id, token);
    if (result.ok) {
      const tenantId = tenant.id;
      after(() =>
        sendCancellationNotification(tenantId, result.appointmentId),
      );
    }
    revalidatePath(`/b/${slug}/cita/${token}`);
    redirect(
      result.ok
        ? `/b/${slug}/cita/${token}?cancelled=1`
        : `/b/${slug}/cita/${token}?error=1`,
    );
  }

  const isCancelled = appt.status === "cancelled";
  const status = STATUS[appt.status] ?? { label: appt.status, className: "bg-muted" };
  const start = utcToZoned(tenant.timezone, appt.startsAt);
  const mapsUrl =
    tenant.lat != null && tenant.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${tenant.lat},${tenant.lng}`
      : tenant.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
        : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link href={`/b/${slug}`} className="eyebrow self-start hover:underline">
          {tenant.name}
        </Link>
        <h1 className="title-lg">Tu cita</h1>
      </div>

      {movida && !cancelled && !error ? (
        <Notice tone="success">¡Listo! Tu cita quedó en el nuevo horario.</Notice>
      ) : null}
      {nueva && !cancelled && !error ? (
        <Notice tone="success">
          ¡Cita reservada! Guarda este enlace: con él puedes ver, cambiar o
          cancelar tu cita.
        </Notice>
      ) : null}
      {cancelled ? (
        <Notice tone="success">
          Tu cita fue cancelada. ¡Te esperamos en otra ocasión!
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="danger">
          Ya no es posible cancelar esta cita en línea. Contacta directamente a
          la barbería.
        </Notice>
      ) : null}

      <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="title-md">{appt.serviceName}</h2>
              <p className="text-sm text-muted-foreground">
                con {appt.barberName} · {appt.durationMin} min
              </p>
            </div>
            <span
              className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}
            >
              {status.label}
            </span>
          </div>
          <div className={cn(isCancelled && "text-muted-foreground line-through")}>
            <p className="font-medium">{longDateEs(start)}</p>
            <p className="font-num text-4xl leading-tight font-semibold">
              {start.toFormat("HH:mm")}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 border-t border-dashed px-5 py-4 text-sm">
          <div>
            <dt className="text-muted-foreground">A nombre de</dt>
            <dd className="font-medium">{appt.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Precio</dt>
            <dd className="font-num font-medium">{formatMoney(appt.price, tenant.currency)}</dd>
          </div>
        </dl>
        {tenant.address ? (
          <div className="flex items-start justify-between gap-3 border-t px-5 py-4 text-sm">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {tenant.address}
            </p>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 font-medium underline underline-offset-4"
              >
                <Navigation className="size-3.5" /> Cómo llegar
              </a>
            ) : null}
          </div>
        ) : null}
      </article>

      {!isCancelled ? (
        <a href={`/b/${slug}/cita/${token}/ics`} className={ctaClass}>
          <CalendarPlus className="size-5 shrink-0" /> Agregar al calendario
        </a>
      ) : (
        <Link href={`/b/${slug}/reservar`} className={ctaClass}>
          Reservar otra cita
        </Link>
      )}

      {appt.cancelable ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/b/${slug}/cita/${token}/reprogramar`}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-card font-medium hover:bg-muted"
          >
            <CalendarSync className="size-4" /> Cambiar horario
          </Link>
          <form action={cancel} className="flex">
            <ConfirmSubmit
              title="¿Cancelar tu cita?"
              description={`${appt.serviceName} con ${appt.barberName}, ${formatZoned(tenant.timezone, appt.startsAt)}. El horario quedará libre para alguien más; si solo necesitas otra hora, usa Cambiar horario.`}
              confirmLabel="Sí, cancelar mi cita"
              cancelLabel="No, conservarla"
              pendingLabel="Cancelando…"
              className="h-11 w-full rounded-lg border border-danger/40 font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
            >
              Cancelar mi cita
            </ConfirmSubmit>
          </form>
        </div>
      ) : null}

      {appt.cancelable ? (
        <p className="text-center text-xs text-muted-foreground">
          Puedes cambiar o cancelar hasta {Math.round(tenant.cancelMinMinutes / 60)} h
          antes de tu cita.
        </p>
      ) : !isCancelled ? (
        <p className="text-center text-sm text-muted-foreground">
          Esta cita ya no puede cancelarse en línea. Si no puedes asistir,
          avisa a la barbería{tenant.phone ? ` al ${tenant.phone}` : ""}.
        </p>
      ) : null}
    </main>
  );
}
