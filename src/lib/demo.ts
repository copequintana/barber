import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { prisma, withTenant } from "./db";

export const DEMO_TTL_HOURS = 3;
export const DEMO_EMAIL_DOMAIN = "demo.barberdesk.test";
export const DEMO_TENANT_NAME = "El Filo Barber Studio";
const DEMO_TIMEZONE = "America/Hermosillo";

const SERVICES = [
  { name: "Corte clásico", durationMin: 30, bufferMin: 5, price: 180, weight: 5 },
  { name: "Fade / degradado", durationMin: 40, bufferMin: 5, price: 220, weight: 5 },
  { name: "Corte + barba", durationMin: 50, bufferMin: 10, price: 280, weight: 4 },
  { name: "Arreglo de barba", durationMin: 25, bufferMin: 5, price: 150, weight: 2 },
  { name: "Corte infantil", durationMin: 25, bufferMin: 5, price: 140, weight: 2 },
];

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const BARBERS = [
  {
    displayName: "Chuy Valenzuela",
    bio: "Clásicos, navaja y toalla caliente. 12 años en la silla.",
    weekdays: EVERY_DAY,
    login: true,
  },
  {
    displayName: "Dani Soto",
    bio: "Cortes modernos, texturizados y fades limpios.",
    weekdays: EVERY_DAY,
    login: false,
  },
  {
    displayName: "Beto Ramírez",
    bio: "Fades y diseños a navaja. Los sábados se llena: reserva temprano.",
    weekdays: [1, 2, 3, 4, 5, 6],
    login: false,
  },
];

const SHIFTS = [
  { startMin: 10 * 60, endMin: 14 * 60 },
  { startMin: 16 * 60, endMin: 20 * 60 },
];

const SLOT_HOURS = [10, 11, 12, 13, 16, 17, 18, 19];

const CUSTOMERS = [
  "Luis Hernández",
  "Carlos Méndez",
  "Jorge Ochoa",
  "Fernando Ruiz",
  "Alejandro Castro",
  "Miguel Ángel Félix",
  "Ricardo Valdez",
  "Óscar Molina",
  "Iván Encinas",
  "Sergio Durazo",
  "Raúl Gastélum",
  "Eduardo Robles",
  "Mateo Romero",
  "Diego Navarro",
  "Andrés Peralta",
];

const NOTES = [
  "Primera vez en la barbería",
  "Trae a su hijo después",
  "Prefiere tijera arriba",
  "Le gusta el fade bajo",
];

export type DemoTenant = {
  id: string;
  name: string;
  slug: string;
  demoExpiresAt: Date | null;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(items: T[], r: number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let acc = r * total;
  for (const item of items) {
    acc -= item.weight;
    if (acc < 0) return item;
  }
  return items[items.length - 1];
}

function demoSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET no está definido");
  return secret;
}

export function demoBarberCredentials(tenant: { id: string; slug: string }) {
  const digits = createHmac("sha256", demoSecret()).update(tenant.id).digest().readUInt32BE(0) % 1_000_000;
  return {
    email: `barbero-${tenant.slug.replace(/^demo-/, "")}@${DEMO_EMAIL_DOMAIN}`,
    password: `filo-${digits.toString().padStart(6, "0")}`,
  };
}

export function isExpiredDemo(
  tenant: { isDemo: boolean; demoExpiresAt: Date | null },
  now = new Date(),
): boolean {
  return tenant.isDemo && (!tenant.demoExpiresAt || tenant.demoExpiresAt <= now);
}

export function getActiveDemo(ownerId: string, now = new Date()): Promise<DemoTenant | null> {
  return prisma.tenant.findFirst({
    where: { isDemo: true, demoOwnerId: ownerId, demoExpiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, demoExpiresAt: true },
  });
}

export async function createDemo(ownerId: string, now = new Date()): Promise<DemoTenant> {
  await purgeExpiredDemos(now);
  const existing = await getActiveDemo(ownerId, now);
  if (existing) return existing;

  const slug = `demo-${randomBytes(4).toString("hex").slice(0, 6)}`;
  const tenant = await prisma.tenant.create({
    data: {
      name: DEMO_TENANT_NAME,
      slug,
      timezone: DEMO_TIMEZONE,
      plan: "demo",
      theme: "clasica",
      address: "Col. Centro, Hermosillo, Son.",
      minLeadMinutes: 30,
      reminder24hEnabled: false,
      reminder2hEnabled: false,
      isDemo: true,
      demoOwnerId: ownerId,
      demoExpiresAt: new Date(now.getTime() + DEMO_TTL_HOURS * 3_600_000),
      memberships: { create: { userId: ownerId, role: "owner" } },
    },
    select: { id: true, name: true, slug: true, demoExpiresAt: true },
  });

  try {
    const barberIds = await seedDemoData(tenant.id, now);
    await createDemoBarberLogin(tenant, barberIds.loginBarberId);
  } catch (error) {
    await endDemo(tenant.id);
    throw error;
  }
  return tenant;
}

async function seedDemoData(tenantId: string, now: Date) {
  const random = seededRandom(20261030);
  const today = DateTime.fromJSDate(now).setZone(DEMO_TIMEZONE).startOf("day");

  const services = SERVICES.map((s, i) => ({ ...s, id: randomUUID(), sortOrder: i }));
  const barbers = BARBERS.map((b) => ({ ...b, id: randomUUID() }));
  const customers = CUSTOMERS.map((name, i) => ({
    id: randomUUID(),
    tenantId,
    name,
    phone: `662 000 ${String(101 + i).padStart(4, "0")}`,
    notes: i % 5 === 0 ? "Cliente frecuente" : null,
  }));

  const timeOffBarber = barbers[2];
  const timeOffDay = today.plus({ days: 2 });
  const timeOff = {
    startsAt: timeOffDay.set({ hour: 16 }),
    endsAt: timeOffDay.set({ hour: 18 }),
  };

  const appointments: Prisma.AppointmentCreateManyInput[] = [];
  for (let offset = -14; offset <= 3; offset++) {
    const day = today.plus({ days: offset });
    const weekday = day.weekday % 7;
    for (const barber of barbers) {
      if (!barber.weekdays.includes(weekday)) continue;
      for (const hour of SLOT_HOURS) {
        const start = day.set({ hour });
        const r = random();
        const isPast = start.toJSDate() < now;
        const occupancy = isPast ? 0.72 : offset <= 1 ? 0.5 : 0.35;
        if (r > occupancy) continue;
        if (
          barber === timeOffBarber &&
          start >= timeOff.startsAt &&
          start < timeOff.endsAt
        ) {
          continue;
        }

        const service = pickWeighted(services, random());
        const customer = customers[Math.floor(random() * customers.length)];
        const end = start.plus({ minutes: service.durationMin + service.bufferMin });
        const outcome = random();
        let status: AppointmentStatus = "confirmed";
        if (isPast && end.toJSDate() <= now) {
          status = outcome < 0.84 ? "completed" : outcome < 0.92 ? "no_show" : "cancelled";
        } else if (!isPast && outcome > 0.93) {
          status = "cancelled";
        }
        const bookedAt = Math.min(
          start.minus({ hours: 6 + Math.floor(random() * 90) }).toMillis(),
          now.getTime(),
        );

        appointments.push({
          tenantId,
          barberId: barber.id,
          customerId: customer.id,
          serviceId: service.id,
          startsAt: start.toJSDate(),
          endsAt: end.toJSDate(),
          status,
          priceAtBooking: service.price,
          cancelledBy: status === "cancelled" ? "customer" : null,
          notes: random() < 0.12 ? NOTES[Math.floor(random() * NOTES.length)] : null,
          createdAt: new Date(bookedAt),
        });
      }
    }
  }

  await withTenant(tenantId, async (tx) => {
    await tx.service.createMany({
      data: services.map(({ id, name, durationMin, bufferMin, price, sortOrder }) => ({
        id,
        tenantId,
        name,
        durationMin,
        bufferMin,
        price,
        sortOrder,
      })),
    });
    await tx.barber.createMany({
      data: barbers.map((b) => ({ id: b.id, tenantId, displayName: b.displayName, bio: b.bio })),
    });
    await tx.barberService.createMany({
      data: barbers.flatMap((b) =>
        services.map((s) => ({ tenantId, barberId: b.id, serviceId: s.id })),
      ),
    });
    await tx.workingHour.createMany({
      data: barbers.flatMap((b) =>
        b.weekdays.flatMap((weekday) =>
          SHIFTS.map((shift) => ({ tenantId, barberId: b.id, weekday, ...shift })),
        ),
      ),
    });
    await tx.timeOff.create({
      data: {
        tenantId,
        barberId: timeOffBarber.id,
        startsAt: timeOff.startsAt.toJSDate(),
        endsAt: timeOff.endsAt.toJSDate(),
        reason: "Curso de barbería",
      },
    });
    await tx.customer.createMany({ data: customers });
    await tx.appointment.createMany({ data: appointments });
  });

  return { loginBarberId: barbers.find((b) => b.login)!.id };
}

async function createDemoBarberLogin(tenant: { id: string; slug: string }, barberId: string) {
  const { email, password } = demoBarberCredentials(tenant);
  const barber = BARBERS.find((b) => b.login)!;
  const user = await prisma.user.create({
    data: {
      email,
      name: barber.displayName,
      emailVerified: true,
      memberships: { create: { tenantId: tenant.id, role: "barber" } },
    },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      issuer: "local:credential",
      userId: user.id,
      password: await hashPassword(password),
    },
  });
  await withTenant(tenant.id, (tx) =>
    tx.barber.update({ where: { id: barberId }, data: { userId: user.id } }),
  );
}

export async function endDemo(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { isDemo: true },
  });
  if (!tenant?.isDemo) return false;

  await withTenant(tenantId, async (tx) => {
    await tx.notification.deleteMany({});
    await tx.appointment.deleteMany({});
    await tx.timeOff.deleteMany({});
    await tx.workingHour.deleteMany({});
    await tx.barberService.deleteMany({});
    await tx.customer.deleteMany({});
    await tx.barber.deleteMany({});
    await tx.service.deleteMany({});
  });
  await prisma.user.deleteMany({
    where: {
      email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` },
      memberships: { some: { tenantId } },
    },
  });
  await prisma.tenant.delete({ where: { id: tenantId } });
  return true;
}

export async function purgeExpiredDemos(now = new Date()): Promise<number> {
  const expired = await prisma.tenant.findMany({
    where: { isDemo: true, OR: [{ demoExpiresAt: null }, { demoExpiresAt: { lte: now } }] },
    select: { id: true },
  });
  let purged = 0;
  for (const tenant of expired) {
    if (await endDemo(tenant.id)) purged += 1;
  }
  return purged;
}

export function remainingLabel(expiresAt: Date | null, now = new Date()): string {
  const minutes = Math.max(0, Math.round(((expiresAt?.getTime() ?? 0) - now.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
