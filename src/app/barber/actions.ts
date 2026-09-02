"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  barberBlockSlot,
  barberDeleteTimeOff,
  barberSetOutcome,
  type BarberPanelError,
} from "@/lib/barber-panel";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";

const ERROR_MSG: Record<BarberPanelError, string> = {
  invalid_input: "Revisa los datos.",
  not_found: "No se encontró el recurso.",
  forbidden: "Solo puedes modificar tus propias citas y bloqueos.",
  not_editable: "La cita ya está en un estado final.",
};

function back(date: string | null, extra = ""): never {
  redirect(`/barber${date ? `?date=${date}` : ""}${extra}`);
}

export async function markOutcome(
  appointmentId: string,
  outcome: "completed" | "no_show",
  date: string,
) {
  const ctx = await requireTenantRole("barber");
  const result = await barberSetOutcome({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    appointmentId,
    outcome,
  });
  revalidatePath("/barber");
  if (!result.ok) {
    back(date, `&error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  back(date);
}

export async function blockSlot(formData: FormData) {
  const ctx = await requireTenantRole("barber");
  const tenant = (await getTenantById(ctx.tenantId))!;

  const parsed = z
    .object({
      startLocal: z.string().min(10),
      minutes: z.coerce.number().int().min(5).max(1440),
      reason: z.string().trim().max(120).optional(),
      date: z.string(),
    })
    .safeParse({
      startLocal: formData.get("startLocal"),
      minutes: formData.get("minutes"),
      reason: formData.get("reason") ?? undefined,
      date: formData.get("date"),
    });
  if (!parsed.success) back(null, `?error=${encodeURIComponent("Datos inválidos")}`);

  const result = await barberBlockSlot({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    timezone: tenant.timezone,
    startLocal: parsed.data.startLocal,
    minutes: parsed.data.minutes,
    reason: parsed.data.reason,
  });
  revalidatePath("/barber");
  if (!result.ok) {
    back(parsed.data.date, `&error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  back(parsed.data.date);
}

export async function removeTimeOff(timeOffId: string, date: string) {
  const ctx = await requireTenantRole("barber");
  const result = await barberDeleteTimeOff({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    timeOffId,
  });
  revalidatePath("/barber");
  if (!result.ok) {
    back(date, `&error=${encodeURIComponent(ERROR_MSG[result.error])}`);
  }
  back(date);
}
