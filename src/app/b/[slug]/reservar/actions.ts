"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking";
import { sendBookingNotifications } from "@/lib/notifications";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenancy";

export type BookState = {
  error:
    | null
    | "invalid_input"
    | "not_found"
    | "slot_taken"
    | "rate_limited";
  /** Identifica cada resultado para que la UI no re-muestre errores viejos */
  at: number;
};

const schema = z.object({
  serviceId: z.string().uuid(),
  barberId: z.union([z.literal("any"), z.string().uuid()]),
  startISO: z.string().min(10),
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+\d][\d\s()-]+$/, "Teléfono inválido"),
  email: z.union([z.literal(""), z.string().trim().email()]),
  notes: z.string().trim().max(300).optional(),
});

export async function bookAction(
  slug: string,
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const hdrs = await headers();
  if (!rateLimit(clientKey(hdrs, "book"), 10, 60_000)) {
    return { error: "rate_limited", at: Date.now() };
  }

  const parsed = schema.safeParse({
    serviceId: formData.get("serviceId"),
    barberId: formData.get("barberId"),
    startISO: formData.get("startISO"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid_input", at: Date.now() };

  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { error: "not_found", at: Date.now() };

  const result = await createBooking({
    tenantId: tenant.id,
    serviceId: parsed.data.serviceId,
    barberId: parsed.data.barberId === "any" ? undefined : parsed.data.barberId,
    startISO: parsed.data.startISO,
    customer: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
    },
    notes: parsed.data.notes,
  });

  if (!result.ok) {
    return {
      error:
        result.error === "outside_window" || result.error === "suspended"
          ? "invalid_input"
          : result.error,
      at: Date.now(),
    };
  }
  // Emails (cliente + staff) después de responder, sin bloquear la reserva
  after(() => sendBookingNotifications(tenant.id, result.appointment.id));
  redirect(`/b/${slug}/cita/${result.appointment.cancelToken}?nueva=1`);
}
