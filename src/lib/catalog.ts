import { withTenant } from "./db";
import type { WeeklyRange } from "./hours";

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
    barbers: {
      id: string;
      name: string;
      price: number;
      bio: string | null;
      photoUrl: string | null;
    }[];
  }[];
  barberWeekdays: Record<string, number[]>;
};

function weekdaysByBarber(rows: { barberId: string; weekday: number }[]) {
  const map: Record<string, number[]> = {};
  for (const r of rows) {
    const days = (map[r.barberId] ??= []);
    if (!days.includes(r.weekday)) days.push(r.weekday);
  }
  return map;
}

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
    const hours = await tx.workingHour.findMany({
      where: { barber: { active: true } },
      select: { barberId: true, weekday: true },
    });
    return {
      barberWeekdays: weekdaysByBarber(hours),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        barbers: s.barbers.map((bs) => ({
          id: bs.barberId,
          name: bs.barber.displayName,
          price: Number(bs.priceOverride ?? s.price),
          bio: bs.barber.bio,
          photoUrl: bs.barber.photoUrl,
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
    const hours: WeeklyRange[] = await tx.workingHour.findMany({
      where: { barber: { active: true } },
      select: { weekday: true, startMin: true, endMin: true },
    });
    return { services, barbers, hours };
  });
}

export async function getBarberWeekdays(
  tenantId: string,
  barberId: string,
): Promise<number[]> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.workingHour.findMany({
      where: { barberId },
      select: { barberId: true, weekday: true },
    }),
  );
  return weekdaysByBarber(rows)[barberId] ?? [];
}
