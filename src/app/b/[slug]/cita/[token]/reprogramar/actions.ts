"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { rescheduleBookingByToken } from "@/lib/booking";
import { sendAppointmentEmail } from "@/lib/notifications";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenancy";

export type RescheduleState = {
  error: null | "slot_taken" | "outside_window" | "invalid_input" | "rate_limited";
  at: number;
};

export async function rescheduleAction(
  slug: string,
  token: string,
  _prev: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  const hdrs = await headers();
  if (!rateLimit(clientKey(hdrs, "reschedule"), 10, 60_000)) {
    return { error: "rate_limited", at: Date.now() };
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "invalid_input", at: Date.now() };

  const startISO = String(formData.get("startISO") ?? "");
  const result = await rescheduleBookingByToken(tenant.id, token, startISO);
  if (!result.ok) {
    const error =
      result.error === "slot_taken" || result.error === "outside_window"
        ? result.error
        : ("invalid_input" as const);
    return { error, at: Date.now() };
  }

  const tenantId = tenant.id;
  after(() =>
    sendAppointmentEmail({
      tenantId,
      appointmentId: result.appointmentId,
      type: "reschedule",
    }),
  );
  redirect(`/b/${slug}/cita/${token}?movida=1`);
}
