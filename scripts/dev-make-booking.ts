import "dotenv/config";
import { DateTime } from "luxon";
import { createBooking } from "../src/lib/booking";
import { getDayAvailability } from "../src/lib/availability";
import { prisma, withTenant } from "../src/lib/db";
import { getTenantBySlug } from "../src/lib/tenancy";

/** Utilidad de desarrollo: crea una reserva real en la-cueva y devuelve su link. */
async function main() {
  const tenant = await getTenantBySlug("la-cueva");
  if (!tenant) throw new Error("Corre primero: npm run db:seed");

  const service = await withTenant(tenant.id, (tx) =>
    tx.service.findFirstOrThrow({ where: { name: "Corte clásico" } }),
  );

  let day = DateTime.now().setZone(tenant.timezone).plus({ days: 1 });
  while (day.weekday !== 2) day = day.plus({ days: 1 }); // próximo martes
  const dateISO = day.toISODate()!;

  const av = await getDayAvailability({
    tenantId: tenant.id,
    serviceId: service.id,
    dateISO,
  });
  if (!av || av.slots.length === 0) throw new Error(`Sin slots el ${dateISO}`);

  const result = await createBooking({
    tenantId: tenant.id,
    serviceId: service.id,
    startISO: av.slots[0].start.toISOString(),
    customer: { name: "Cliente Smoke", phone: "555-000-1234" },
  });
  if (!result.ok) throw new Error(`Reserva falló: ${result.error}`);

  console.log(
    JSON.stringify({
      url: `/b/la-cueva/cita/${result.appointment.cancelToken}`,
      start: result.appointment.startsAt.toISOString(),
      price: Number(result.appointment.priceAtBooking),
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
