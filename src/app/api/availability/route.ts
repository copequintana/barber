import { NextResponse } from "next/server";
import { z } from "zod";
import { getDayAvailability } from "@/lib/availability";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenancy";

/**
 * GET /api/availability?tenant=<slug>&service=<id>&date=YYYY-MM-DD[&barber=<id>]
 *
 * Endpoint público que consume la página de reservas (T09).
 * Cache corto: la disponibilidad cambia con cada reserva.
 */

const querySchema = z.object({
  tenant: z.string().min(1),
  service: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  barber: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  if (!rateLimit(clientKey(request.headers, "availability"), 120, 60_000)) {
    return NextResponse.json(
      { error: "Demasiadas consultas, intenta en un momento" },
      { status: 429 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    tenant: url.searchParams.get("tenant") ?? undefined,
    service: url.searchParams.get("service") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    barber: url.searchParams.get("barber") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const tenant = await getTenantBySlug(parsed.data.tenant);
  if (!tenant) {
    return NextResponse.json({ error: "Barbería no encontrada" }, { status: 404 });
  }

  const availability = await getDayAvailability({
    tenantId: tenant.id,
    serviceId: parsed.data.service,
    dateISO: parsed.data.date,
    barberId: parsed.data.barber,
  });
  if (!availability) {
    return NextResponse.json(
      { error: "Servicio no disponible" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      date: parsed.data.date,
      timezone: tenant.timezone,
      durationMin: availability.durationMin,
      slots: availability.slots.map((s) => ({
        start: s.start.toISOString(),
        barberIds: s.barberIds,
      })),
    },
    // Sin cache: tras un "slot ocupado" el cliente refresca esta lista y una
    // respuesta cacheada le re-mostraría el horario recién ocupado.
    { headers: { "Cache-Control": "no-store" } },
  );
}
