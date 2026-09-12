import { Prisma } from "@prisma/client";
import { prisma, withTenant } from "./db";
import { sendEmail } from "./email/send";
import {
  cancellationEmail,
  confirmationEmail,
  rescheduleEmail,
  staffNewBookingEmail,
  type AppointmentEmailData,
} from "./email/templates";
import { getTenantById } from "./tenancy";
import { formatZoned } from "./time";

/**
 * Notificaciones (T12).
 *
 * Idempotencia: antes de enviar se inserta la fila en `notifications`
 * (única por appointment + type + channel). Si la fila ya existe, otro
 * proceso ya envió o está enviando: no se duplica. El resultado del envío
 * se registra en `status`/`sent_at`; T13 reintentará las `failed`.
 */

export type NotifyType =
  | "confirmation"
  | "cancellation"
  | "reschedule"
  | "staff_new_booking"
  | "reminder_24h"
  | "reminder_2h";

export type NotifyChannel = "email" | "whatsapp";

export type NotifyResult =
  | { sent: true }
  | { sent: false; reason: "duplicate" | "no_recipient" | "not_found" | "failed" };

/** URL pública base de la app (también usada por el código QR de cada tenant). */
export function appBaseUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export async function loadAppointmentEmailData(
  tenantId: string,
  appointmentId: string,
): Promise<
  | (AppointmentEmailData & {
      customerEmail: string | null;
      customerPhone: string;
      tenantSlug: string;
    })
  | null
> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  const appt = await withTenant(tenantId, (tx) =>
    tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, barber: true, customer: true },
    }),
  );
  if (!appt) return null;

  const money = new Intl.NumberFormat("es", {
    style: "currency",
    currency: tenant.currency,
    maximumFractionDigits: 0,
  });
  const citaUrl = `${appBaseUrl()}/b/${tenant.slug}/cita/${appt.cancelToken}`;

  return {
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    brandColor: tenant.brandColor,
    serviceName: appt.service.name,
    barberName: appt.barber.displayName,
    whenText: `${formatZoned(tenant.timezone, appt.startsAt)} (hora local)`,
    priceText: money.format(Number(appt.priceAtBooking)),
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    customerPhone: appt.customer.phone,
    citaUrl,
    icsUrl: `${citaUrl}/ics`,
  };
}

/**
 * Reclama el derecho a enviar (inserta la fila idempotente). Si ya existe
 * una fila `failed`, la re-reclama atómicamente para permitir el reintento.
 * Devuelve el id de la fila, o null si otro envío ya la tiene (sent/pending).
 */
export async function claimNotification(
  tenantId: string,
  appointmentId: string,
  type: NotifyType,
  channel: NotifyChannel = "email",
): Promise<string | null> {
  try {
    const row = await withTenant(tenantId, (tx) =>
      tx.notification.create({
        data: {
          tenantId,
          appointmentId,
          channel,
          type,
          status: "pending",
        },
      }),
    );
    return row.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Reintento de una fila fallida: solo un proceso gana el updateMany
      const reclaimed = await withTenant(tenantId, async (tx) => {
        const existing = await tx.notification.findUnique({
          where: {
            appointmentId_type_channel: { appointmentId, type, channel },
          },
        });
        if (!existing || existing.status !== "failed") return null;
        const updated = await tx.notification.updateMany({
          where: { id: existing.id, status: "failed" },
          data: { status: "pending" },
        });
        return updated.count === 1 ? existing.id : null;
      });
      return reclaimed;
    }
    throw e;
  }
}

export async function finishNotification(
  tenantId: string,
  rowId: string,
  ok: boolean,
) {
  await withTenant(tenantId, (tx) =>
    tx.notification.update({
      where: { id: rowId },
      data: { status: ok ? "sent" : "failed", sentAt: ok ? new Date() : null },
    }),
  );
}

export async function sendAppointmentEmail(input: {
  tenantId: string;
  appointmentId: string;
  type: "confirmation" | "cancellation" | "reschedule";
}): Promise<NotifyResult> {
  const data = await loadAppointmentEmailData(
    input.tenantId,
    input.appointmentId,
  );
  if (!data) return { sent: false, reason: "not_found" };
  if (!data.customerEmail) return { sent: false, reason: "no_recipient" };

  const rowId = await claimNotification(
    input.tenantId,
    input.appointmentId,
    input.type,
  );
  if (!rowId) return { sent: false, reason: "duplicate" };

  const { subject, html } =
    input.type === "confirmation"
      ? confirmationEmail(data)
      : input.type === "reschedule"
        ? rescheduleEmail(data)
        : cancellationEmail(data);
  const result = await sendEmail({ to: data.customerEmail, subject, html });
  await finishNotification(input.tenantId, rowId, result.ok);
  return result.ok ? { sent: true } : { sent: false, reason: "failed" };
}

/** Aviso a los dueños/admins del tenant cuando entra una reserva en línea. */
export async function notifyStaffNewBooking(input: {
  tenantId: string;
  appointmentId: string;
}): Promise<NotifyResult> {
  const data = await loadAppointmentEmailData(
    input.tenantId,
    input.appointmentId,
  );
  if (!data) return { sent: false, reason: "not_found" };

  const staff = await prisma.membership.findMany({
    where: { tenantId: input.tenantId, role: { in: ["owner", "admin"] } },
    include: { user: true },
  });
  const emails = staff.map((m) => m.user.email).filter(Boolean);
  if (emails.length === 0) return { sent: false, reason: "no_recipient" };

  const rowId = await claimNotification(
    input.tenantId,
    input.appointmentId,
    "staff_new_booking",
  );
  if (!rowId) return { sent: false, reason: "duplicate" };

  const { subject, html } = staffNewBookingEmail(data);
  const result = await sendEmail({ to: emails, subject, html });
  await finishNotification(input.tenantId, rowId, result.ok);
  return result.ok ? { sent: true } : { sent: false, reason: "failed" };
}

/** Todo lo que dispara una reserva nueva del flujo público. */
export async function sendBookingNotifications(
  tenantId: string,
  appointmentId: string,
): Promise<void> {
  try {
    await sendAppointmentEmail({ tenantId, appointmentId, type: "confirmation" });
    await notifyStaffNewBooking({ tenantId, appointmentId });
  } catch (e) {
    // Nunca romper el flujo de reserva por el email
    console.error("[notifications] error enviando emails de reserva:", e);
  }
}

export async function sendCancellationNotification(
  tenantId: string,
  appointmentId: string,
): Promise<void> {
  try {
    await sendAppointmentEmail({ tenantId, appointmentId, type: "cancellation" });
  } catch (e) {
    console.error("[notifications] error enviando email de cancelación:", e);
  }
}
