import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cancelBookingByToken, getAppointmentByToken } from "@/lib/booking";
import { sendCancellationNotification } from "@/lib/notifications";
import { getTenantBySlug } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";

export const metadata = { title: "Tu cita · BarberDesk" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <p className="text-sm opacity-70">{tenant.name}</p>
        <h1 className="text-2xl font-bold">Tu cita</h1>
      </div>

      {movida && !cancelled && !error ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          ¡Listo! Tu cita quedó en el nuevo horario.
        </p>
      ) : null}
      {nueva && !cancelled && !error ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          ¡Cita reservada! Guarda este enlace: con él puedes ver o cancelar tu
          cita.
        </p>
      ) : null}
      {cancelled ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Tu cita fue cancelada. ¡Te esperamos en otra ocasión!
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          Ya no es posible cancelar esta cita en línea. Contacta directamente a
          la barbería.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <p className="text-lg font-semibold">{appt.serviceName}</p>
        <p>
          Con <strong>{appt.barberName}</strong>
        </p>
        <p className="tabular-nums">
          {formatZoned(tenant.timezone, appt.startsAt)} (hora local)
        </p>
        <p className="text-sm opacity-70">A nombre de {appt.customerName}</p>
        <p
          className={`self-start rounded-full px-2.5 py-0.5 text-xs ${
            isCancelled
              ? "bg-black/10 dark:bg-white/15"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {STATUS_LABEL[appt.status] ?? appt.status}
        </p>
      </div>

      {!isCancelled ? (
        <a
          href={`/b/${slug}/cita/${token}/ics`}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-center font-medium text-white"
        >
          Agregar a mi calendario (.ics)
        </a>
      ) : null}

      {appt.cancelable ? (
        <Link
          href={`/b/${slug}/cita/${token}/reprogramar`}
          className="rounded-md border border-black/15 px-4 py-2 text-center font-medium dark:border-white/20"
        >
          Cambiar horario
        </Link>
      ) : null}

      {appt.cancelable ? (
        <form action={cancel} className="flex flex-col gap-2">
          <button
            type="submit"
            className="rounded-md border border-red-300 px-4 py-2 font-medium text-red-700 dark:border-red-900 dark:text-red-400"
          >
            Cancelar mi cita
          </button>
          <p className="text-xs opacity-60">
            Puedes cancelar hasta {Math.round(tenant.cancelMinMinutes / 60)} h
            antes de la hora de tu cita.
          </p>
        </form>
      ) : !isCancelled ? (
        <p className="text-sm opacity-70">
          Esta cita ya no puede cancelarse en línea. Si no puedes asistir,
          avisa a la barbería.
        </p>
      ) : null}

      <Link href={`/b/${slug}`} className="text-sm underline opacity-70">
        ← Volver a {tenant.name}
      </Link>
    </main>
  );
}
