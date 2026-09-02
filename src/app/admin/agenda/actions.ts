"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import {
  adminCancelAppointment,
  adminCreateAppointment,
  adminMoveAppointment,
  adminSetAppointmentOutcome,
  type AdminApptError,
} from "@/lib/admin-appointments";
import { requireTenantRole } from "@/lib/guards";
import {
  sendAppointmentEmail,
  sendCancellationNotification,
} from "@/lib/notifications";

const ERROR_MSG: Record<AdminApptError, string> = {
  invalid_input: "Revisa los datos: hay campos inválidos.",
  not_found: "No se encontró el barbero, servicio o cita.",
  overlap: "Ese horario choca con otra cita o queda ocupado: elige otro.",
  not_editable: "La cita ya está en un estado final y no puede modificarse.",
};

const walkInSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startLocal: z.string().min(10),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  notes: z.string().trim().max(300).optional(),
});

export async function createWalkIn(formData: FormData) {
  const ctx = await requireTenantRole("owner", "admin");

  const parsed = walkInSchema.safeParse({
    barberId: formData.get("barberId"),
    serviceId: formData.get("serviceId"),
    startLocal: formData.get("startLocal"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    notes: formData.get("notes") ?? undefined,
  });
  const back = `/admin/agenda/nueva?date=${String(
    formData.get("startLocal") ?? "",
  ).slice(0, 10)}&barber=${formData.get("barberId") ?? ""}`;
  if (!parsed.success) {
    redirect(`${back}&error=${encodeURIComponent(ERROR_MSG.invalid_input)}`);
  }

  const result = await adminCreateAppointment({
    tenantId: ctx.tenantId,
    barberId: parsed.data.barberId,
    serviceId: parsed.data.serviceId,
    startLocal: parsed.data.startLocal,
    customer: { name: parsed.data.name, phone: parsed.data.phone },
    notes: parsed.data.notes,
  });
  if (!result.ok) {
    redirect(`${back}&error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }

  // Confirmación al cliente si tiene email registrado (walk-in no lo pide)
  const { tenantId } = ctx;
  const { appointmentId } = result;
  after(() =>
    sendAppointmentEmail({ tenantId, appointmentId, type: "confirmation" }),
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${parsed.data.startLocal.slice(0, 10)}`);
}

export async function moveAppointment(
  appointmentId: string,
  formData: FormData,
) {
  const ctx = await requireTenantRole("owner", "admin");
  const back = `/admin/agenda/cita/${appointmentId}`;

  const parsed = z
    .object({
      startLocal: z.string().min(10),
      barberId: z.string().uuid(),
    })
    .safeParse({
      startLocal: formData.get("startLocal"),
      barberId: formData.get("barberId"),
    });
  if (!parsed.success) {
    redirect(`${back}?error=${encodeURIComponent(ERROR_MSG.invalid_input)}`);
  }

  const result = await adminMoveAppointment({
    tenantId: ctx.tenantId,
    appointmentId,
    startLocal: parsed.data.startLocal,
    barberId: parsed.data.barberId,
  });
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  revalidatePath("/admin/agenda");
  revalidatePath(back);
  redirect(`${back}?ok=1`);
}

export async function setAppointmentOutcome(
  appointmentId: string,
  outcome: "completed" | "no_show",
) {
  const ctx = await requireTenantRole("owner", "admin");
  const back = `/admin/agenda/cita/${appointmentId}`;
  const result = await adminSetAppointmentOutcome({
    tenantId: ctx.tenantId,
    appointmentId,
    outcome,
  });
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  revalidatePath("/admin/agenda");
  revalidatePath(back);
  redirect(`${back}?ok=1`);
}

export async function cancelAppointment(
  appointmentId: string,
  formData: FormData,
) {
  const ctx = await requireTenantRole("owner", "admin");
  const back = `/admin/agenda/cita/${appointmentId}`;

  const result = await adminCancelAppointment({
    tenantId: ctx.tenantId,
    appointmentId,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  const { tenantId } = ctx;
  after(() => sendCancellationNotification(tenantId, appointmentId));
  revalidatePath("/admin/agenda");
  revalidatePath(back);
  redirect(`${back}?ok=1`);
}
