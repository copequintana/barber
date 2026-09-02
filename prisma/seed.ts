import "dotenv/config";
import { prisma, withTenant } from "../src/lib/db";

/**
 * Seed de desarrollo: dos tenants con barberos, servicios y horarios,
 * para probar el aislamiento RLS y el flujo de reservas.
 */
async function main() {
  await seedTenant({
    name: "La Cueva Barber Shop",
    slug: "la-cueva",
    timezone: "America/Mexico_City",
    ownerEmail: "dueno@lacueva.test",
    barbers: ["Manuel", "Ricardo"],
  });
  await seedTenant({
    name: "Barbería El Patrón",
    slug: "el-patron",
    timezone: "America/Monterrey",
    ownerEmail: "dueno@elpatron.test",
    barbers: ["Andrés"],
  });
  console.log("Seed completado: tenants la-cueva y el-patron");
}

async function seedTenant(input: {
  name: string;
  slug: string;
  timezone: string;
  ownerEmail: string;
  barbers: string[];
}) {
  const owner = await prisma.user.upsert({
    where: { email: input.ownerEmail },
    update: {},
    create: { email: input.ownerEmail, name: `Dueño ${input.name}` },
  });

  const existing = await prisma.tenant.findUnique({
    where: { slug: input.slug },
  });
  if (existing) {
    console.log(`Tenant ${input.slug} ya existe, se omite`);
    return existing;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      memberships: { create: { userId: owner.id, role: "owner" } },
    },
  });

  await withTenant(tenant.id, async (tx) => {
    const serviceData = [
      { name: "Corte clásico", durationMin: 30, bufferMin: 5, price: 180 },
      { name: "Corte + barba", durationMin: 50, bufferMin: 10, price: 280 },
      { name: "Afeitado tradicional", durationMin: 25, bufferMin: 5, price: 150 },
    ];
    const services = [];
    for (const [i, s] of serviceData.entries()) {
      services.push(
        await tx.service.create({
          data: { ...s, tenantId: tenant.id, sortOrder: i },
        }),
      );
    }

    for (const barberName of input.barbers) {
      const barber = await tx.barber.create({
        data: { tenantId: tenant.id, displayName: barberName },
      });
      await tx.barberService.createMany({
        data: services.map((s) => ({
          tenantId: tenant.id,
          barberId: barber.id,
          serviceId: s.id,
        })),
      });
      // Martes a sábado, 10:00–14:00 y 16:00–20:00 hora local
      for (const weekday of [2, 3, 4, 5, 6]) {
        await tx.workingHour.createMany({
          data: [
            { tenantId: tenant.id, barberId: barber.id, weekday, startMin: 10 * 60, endMin: 14 * 60 },
            { tenantId: tenant.id, barberId: barber.id, weekday, startMin: 16 * 60, endMin: 20 * 60 },
          ],
        });
      }
    }
  });

  return tenant;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
