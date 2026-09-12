import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";

const querySchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
});

/**
 * Barberías con ubicación guardada. Con lat/lng, ordenadas por distancia al
 * punto dado (Haversine, ver lib/geo.ts, calculado aquí mismo sobre las
 * pocas decenas de tenants que hay — no hace falta ninguna extensión
 * geoespacial de Postgres ni ningún servicio externo a este volumen). Sin
 * lat/lng (el cliente no dio permiso de ubicación), se devuelven todas por
 * orden alfabético.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "lat/lng inválidos" }, { status: 400 });
  }
  const origin =
    parsed.data.lat != null && parsed.data.lng != null
      ? { lat: parsed.data.lat, lng: parsed.data.lng }
      : null;

  const tenants = await prisma.tenant.findMany({
    where: { suspended: false, lat: { not: null }, lng: { not: null } },
    select: {
      slug: true,
      name: true,
      address: true,
      logoUrl: true,
      brandColor: true,
      lat: true,
      lng: true,
    },
    orderBy: origin ? undefined : { name: "asc" },
  });

  const results = tenants.map((t) => ({
    slug: t.slug,
    name: t.name,
    address: t.address,
    logoUrl: t.logoUrl,
    brandColor: t.brandColor,
    distanceKm: origin ? haversineKm(origin, { lat: t.lat!, lng: t.lng! }) : null,
  }));
  if (origin) results.sort((a, b) => a.distanceKm! - b.distanceKm!);

  return NextResponse.json({ results });
}
