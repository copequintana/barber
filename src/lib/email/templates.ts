/**
 * Plantillas HTML de email (T12). Tablas + estilos inline: lo que los
 * clientes de correo renderizan de forma consistente.
 */

import { DEFAULT_BRAND_COLOR } from "../tenancy";

export type AppointmentEmailData = {
  tenantName: string;
  brandColor: string | null;
  serviceName: string;
  barberName: string;
  /** Fecha/hora ya formateada en la zona del tenant */
  whenText: string;
  priceText: string;
  customerName: string;
  citaUrl: string;
  icsUrl: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(
  accent: string,
  title: string,
  body: string,
  footer = "Enviado por BarberDesk en nombre de la barbería. Si no reconoces esta cita, ignora este correo.",
): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#26241f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:${esc(accent)};height:6px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:28px 28px 8px;">
<h1 style="margin:0;font-size:20px;">${title}</h1>
</td></tr>
${body}
<tr><td style="padding:16px 28px 28px;font-size:12px;color:#8a8578;">
${footer}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function detailRows(d: AppointmentEmailData): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#8a8578;font-size:14px;width:90px;">${label}</td><td style="padding:6px 0;font-size:14px;"><strong>${value}</strong></td></tr>`;
  return `<tr><td style="padding:8px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee9dd;border-bottom:1px solid #eee9dd;">
${row("Servicio", esc(d.serviceName))}
${row("Barbero", esc(d.barberName))}
${row("Cuándo", esc(d.whenText))}
${row("Precio", esc(d.priceText))}
</table>
</td></tr>`;
}

export function confirmationEmail(d: AppointmentEmailData): {
  subject: string;
  html: string;
} {
  const accent = d.brandColor ?? "#1e3a5f";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>Hola ${esc(d.customerName)}, tu cita en <strong>${esc(d.tenantName)}</strong> quedó confirmada:</p>
</td></tr>
${detailRows(d)}
<tr><td style="padding:20px 28px;" align="center">
<a href="${esc(d.citaUrl)}" style="display:inline-block;background:${esc(accent)};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:bold;">Ver o cancelar mi cita</a>
</td></tr>
<tr><td style="padding:0 28px;font-size:13px;color:#8a8578;" align="center">
<a href="${esc(d.icsUrl)}" style="color:#1e3a5f;">Agregar a mi calendario (.ics)</a>
</td></tr>`;
  return {
    subject: `Cita confirmada · ${d.tenantName} · ${d.whenText}`,
    html: layout(accent, "¡Cita confirmada!", body),
  };
}

export function cancellationEmail(d: AppointmentEmailData): {
  subject: string;
  html: string;
} {
  const accent = d.brandColor ?? "#1e3a5f";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>Hola ${esc(d.customerName)}, tu cita en <strong>${esc(d.tenantName)}</strong> fue cancelada:</p>
</td></tr>
${detailRows(d)}
<tr><td style="padding:20px 28px;font-size:14px;" align="center">
¿Quieres otra fecha? <a href="${esc(d.citaUrl.replace(/\/cita\/.*$/, "/reservar"))}" style="color:${esc(accent)};font-weight:bold;">Reserva de nuevo aquí</a>.
</td></tr>`;
  return {
    subject: `Cita cancelada · ${d.tenantName}`,
    html: layout(accent, "Cita cancelada", body),
  };
}

export function reminderEmail(
  d: AppointmentEmailData & { hoursBefore: number },
): { subject: string; html: string } {
  const accent = d.brandColor ?? "#1e3a5f";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>Hola ${esc(d.customerName)}, te recordamos tu cita en <strong>${esc(d.tenantName)}</strong>${
    d.hoursBefore <= 3 ? " en unas horas" : " mañana"
  }:</p>
</td></tr>
${detailRows(d)}
<tr><td style="padding:20px 28px;" align="center">
<a href="${esc(d.citaUrl)}" style="display:inline-block;background:${esc(accent)};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:bold;">Ver, mover o cancelar mi cita</a>
</td></tr>
<tr><td style="padding:0 28px;font-size:13px;color:#8a8578;" align="center">
Si no puedes asistir, cancela o reprograma con tiempo. ¡Gracias!
</td></tr>`;
  return {
    subject: `Recordatorio · ${d.serviceName} · ${d.whenText}`,
    html: layout(accent, "Recordatorio de tu cita", body),
  };
}

export function rescheduleEmail(d: AppointmentEmailData): {
  subject: string;
  html: string;
} {
  const accent = d.brandColor ?? "#1e3a5f";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>Hola ${esc(d.customerName)}, tu cita en <strong>${esc(d.tenantName)}</strong> cambió de horario. Los nuevos datos:</p>
</td></tr>
${detailRows(d)}
<tr><td style="padding:20px 28px;" align="center">
<a href="${esc(d.citaUrl)}" style="display:inline-block;background:${esc(accent)};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:bold;">Ver mi cita</a>
</td></tr>
<tr><td style="padding:0 28px;font-size:13px;color:#8a8578;" align="center">
<a href="${esc(d.icsUrl)}" style="color:#1e3a5f;">Actualizar mi calendario (.ics)</a>
</td></tr>`;
  return {
    subject: `Cita reprogramada · ${d.tenantName} · ${d.whenText}`,
    html: layout(accent, "Tu cita cambió de horario", body),
  };
}

export function staffNewBookingEmail(
  d: AppointmentEmailData & { customerPhone: string },
): { subject: string; html: string } {
  const accent = d.brandColor ?? "#1e3a5f";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>Nueva reserva en línea de <strong>${esc(d.customerName)}</strong> (${esc(d.customerPhone)}):</p>
</td></tr>
${detailRows(d)}`;
  return {
    subject: `Nueva reserva · ${d.serviceName} con ${d.barberName} · ${d.whenText}`,
    html: layout(accent, "Nueva reserva", body),
  };
}

/**
 * Configurar contraseña (cuenta nueva, p. ej. invitación de barbero) o
 * restablecerla (la olvidó). Mismo link de Better Auth en los dos casos —
 * solo cambia el copy según si ya tenía una contraseña.
 */
export function setPasswordEmail(input: {
  url: string;
  isNewAccount: boolean;
  tenantName?: string | null;
}): { subject: string; html: string } {
  const accent = DEFAULT_BRAND_COLOR;
  const intro = input.isNewAccount
    ? `Te dieron acceso como barbero${
        input.tenantName ? ` en <strong>${esc(input.tenantName)}</strong>` : ""
      } en BarberDesk. Configura tu contraseña para entrar a tu panel:`
    : "Pediste restablecer tu contraseña de BarberDesk. Elige una nueva:";
  const body = `
<tr><td style="padding:0 28px;font-size:14px;line-height:1.5;">
<p>${intro}</p>
</td></tr>
<tr><td style="padding:20px 28px;" align="center">
<a href="${esc(input.url)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:bold;">${
    input.isNewAccount ? "Configurar mi contraseña" : "Elegir nueva contraseña"
  }</a>
</td></tr>
<tr><td style="padding:0 28px;font-size:13px;color:#8a8578;">
Si tú no lo pediste, ignora este correo — no se cambia nada hasta que abras el link. Expira en unos días.
</td></tr>`;
  return {
    subject: input.isNewAccount
      ? "Configura tu acceso · BarberDesk"
      : "Restablece tu contraseña · BarberDesk",
    html: layout(
      accent,
      input.isNewAccount ? "Bienvenido a BarberDesk" : "Restablece tu contraseña",
      body,
      "Enviado por BarberDesk. Si no reconoces esta solicitud, ignora este correo.",
    ),
  };
}
