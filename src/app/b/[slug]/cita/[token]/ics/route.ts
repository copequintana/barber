import { getAppointmentByToken } from "@/lib/booking";
import { getTenantBySlug } from "@/lib/tenancy";

/** Archivo .ics para "agregar a calendario" desde la página de la cita. */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> },
) {
  const { slug, token } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return new Response("Not found", { status: 404 });
  const appt = await getAppointmentByToken(tenant.id, token);
  if (!appt || appt.status === "cancelled") {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const citaUrl = `${url.origin}/b/${slug}/cita/${token}`;
  const end = new Date(appt.startsAt.getTime() + appt.durationMin * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarberDesk//ES",
    "BEGIN:VEVENT",
    `UID:${token}@barberdesk`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(appt.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(`${appt.serviceName} · ${tenant.name}`)}`,
    `DESCRIPTION:${escapeText(
      `Con ${appt.barberName}. Ver o cancelar: ${citaUrl}`,
    )}`,
    `LOCATION:${escapeText(tenant.name)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita.ics"',
    },
  });
}
