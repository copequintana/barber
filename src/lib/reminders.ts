import { prisma, withTenant } from "./db";
import { sendEmail } from "./email/send";
import { reminderEmail } from "./email/templates";
import {
  claimNotification,
  finishNotification,
  loadAppointmentEmailData,
} from "./notifications";
import { normalizePhone, sendWhatsAppReminder } from "./whatsapp/send";

/**
 * Recordatorios T-24h / T-2h y cierre automático de citas (T13/T14).
 *
 * Pensado para correr por cron cada ~15 min. Es seguro correrlo en paralelo
 * o repetido: la idempotencia vive en `notifications` (claim por fila única).
 *
 * Reglas:
 *  - Solo citas `confirmed` futuras dentro de la ventana del recordatorio.
 *  - Una cita creada DENTRO de la ventana no recibe ese recordatorio
 *    (nadie quiere un "te esperamos mañana" reservando para dentro de 1 h).
 *  - Canal: WhatsApp si el tenant lo activó y hay credenciales; fallback a
 *    email si no hay WhatsApp o si el envío falla.
 */

const REMINDERS = [
  { type: "reminder_24h", minutes: 24 * 60, enabledField: "reminder24hEnabled" },
  { type: "reminder_2h", minutes: 2 * 60, enabledField: "reminder2hEnabled" },
] as const;

/** No recordar citas que empiezan en menos de 10 min (ya casi está ahí). */
const MIN_REMAINING_MIN = 10;

export type CronStats = {
  tenantsProcessed: number;
  remindersSent: number;
  remindersFailed: number;
  autoCompleted: number;
};

export async function runCron(now = new Date()): Promise<CronStats> {
  const stats: CronStats = {
    tenantsProcessed: 0,
    remindersSent: 0,
    remindersFailed: 0,
    autoCompleted: 0,
  };

  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    stats.tenantsProcessed += 1;
    const r = await runTenantReminders(tenant, now);
    stats.remindersSent += r.sent;
    stats.remindersFailed += r.failed;
    stats.autoCompleted += await autoCompletePast(tenant, now);
  }
  return stats;
}

type TenantRow = {
  id: string;
  timezone: string;
  reminder24hEnabled: boolean;
  reminder2hEnabled: boolean;
  whatsappEnabled: boolean;
  autoCompleteHours: number;
};

export async function runTenantReminders(
  tenant: TenantRow,
  now: Date,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const reminder of REMINDERS) {
    if (!tenant[reminder.enabledField]) continue;

    const windowEnd = new Date(now.getTime() + reminder.minutes * 60_000);
    const candidates = await withTenant(tenant.id, (tx) =>
      tx.appointment.findMany({
        where: {
          status: "confirmed",
          startsAt: {
            gt: new Date(now.getTime() + MIN_REMAINING_MIN * 60_000),
            lte: windowEnd,
          },
        },
        select: { id: true, startsAt: true, createdAt: true },
      }),
    );

    for (const appt of candidates) {
      // Creada dentro de la ventana: ese recordatorio ya no aplica
      const reminderMoment =
        appt.startsAt.getTime() - reminder.minutes * 60_000;
      if (appt.createdAt.getTime() > reminderMoment) continue;

      const ok = await sendOneReminder(
        tenant,
        appt.id,
        reminder.type,
        reminder.minutes / 60,
      );
      if (ok === "sent") sent += 1;
      if (ok === "failed") failed += 1;
    }
  }
  return { sent, failed };
}

async function sendOneReminder(
  tenant: TenantRow,
  appointmentId: string,
  type: "reminder_24h" | "reminder_2h",
  hoursBefore: number,
): Promise<"sent" | "failed" | "skipped"> {
  const data = await loadAppointmentEmailData(tenant.id, appointmentId);
  if (!data) return "skipped";

  // Canal preferido: WhatsApp si el tenant lo activó (sin credenciales de
  // Meta, el transporte de desarrollo imprime en consola).
  if (tenant.whatsappEnabled) {
    const phone = normalizePhone(data.customerPhone);
    if (phone) {
      const rowId = await claimNotification(
        tenant.id,
        appointmentId,
        type,
        "whatsapp",
      );
      if (rowId === null) {
        // ya enviado/en curso por whatsapp: nada más que hacer
        return "skipped";
      }
      const result = await sendWhatsAppReminder({
        to: phone,
        tenantName: data.tenantName,
        serviceLine: `${data.serviceName} con ${data.barberName}`,
        whenText: data.whenText,
        citaUrl: data.citaUrl,
      });
      await finishNotification(tenant.id, rowId, result.ok);
      if (result.ok) return "sent";
      // cae al fallback por email
    }
  }

  if (!data.customerEmail) return "skipped";
  const rowId = await claimNotification(tenant.id, appointmentId, type, "email");
  if (rowId === null) return "skipped";

  const { subject, html } = reminderEmail({ ...data, hoursBefore });
  const result = await sendEmail({ to: data.customerEmail, subject, html });
  await finishNotification(tenant.id, rowId, result.ok);
  return result.ok ? "sent" : "failed";
}

/** Citas confirmadas que terminaron hace más de N horas → completadas. */
export async function autoCompletePast(
  tenant: Pick<TenantRow, "id" | "autoCompleteHours">,
  now: Date,
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - tenant.autoCompleteHours * 3_600_000,
  );
  const updated = await withTenant(tenant.id, (tx) =>
    tx.appointment.updateMany({
      where: { status: "confirmed", endsAt: { lt: cutoff } },
      data: { status: "completed" },
    }),
  );
  return updated.count;
}
