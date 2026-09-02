import { withTenant } from "./db";

/**
 * Catálogo público de un tenant: solo servicios activos con al menos un
 * barbero activo asignado, y barberos activos. Es lo único que ve el cliente
 * final en /b/[slug].
 */
/** Catálogo para el wizard de reserva: servicios con sus barberos y precios. */
export type BookingCatalog = {
  services: {
    id: string;
    name: string;
    durationMin: number;
    barbers: { id: string; name: string; price: number }[];
  }[];
};

export async function getBookingCatalog(
  tenantId: string,
): Promise<BookingCatalog> {
  return withTenant(tenantId, async (tx) => {
    const services = await tx.service.findMany({
      where: {
        active: true,
        barbers: { some: { barber: { active: true } } },
      },
      orderBy: { sortOrder: "asc" },
      include: {
        barbers: {
          where: { barber: { active: true } },
          include: { barber: true },
        },
      },
    });
    return {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        barbers: s.barbers.map((bs) => ({
          id: bs.barberId,
          name: bs.barber.displayName,
          price: Number(bs.priceOverride ?? s.price),
        })),
      })),
    };
  });
}

export function getPublicCatalog(tenantId: string) {
  return withTenant(tenantId, async (tx) => {
    const services = await tx.service.findMany({
      where: {
        active: true,
        barbers: { some: { barber: { active: true } } },
      },
      orderBy: { sortOrder: "asc" },
    });
    const barbers = await tx.barber.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
    });
    return { services, barbers };
  });
}
