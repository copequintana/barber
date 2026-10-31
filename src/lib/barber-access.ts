import type { Prisma } from "@prisma/client";
import { withTenant } from "./db";

async function dropUnusedBarberAccess(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
) {
  const linked = await tx.barber.count({ where: { userId } });
  if (linked > 0) return;
  await tx.membership.deleteMany({ where: { userId, tenantId, role: "barber" } });
}

export function linkBarberAccount(tenantId: string, barberId: string, email: string) {
  return withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id: barberId } });
    if (!barber) return null;

    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0] },
    });
    await tx.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      update: {},
      create: { userId: user.id, tenantId, role: "barber" },
    });
    await tx.barber.updateMany({ where: { id: barberId }, data: { userId: user.id } });

    if (barber.userId && barber.userId !== user.id) {
      await dropUnusedBarberAccess(tx, tenantId, barber.userId);
    }
    return user;
  });
}

export function unlinkBarberAccount(tenantId: string, barberId: string) {
  return withTenant(tenantId, async (tx) => {
    const barber = await tx.barber.findUnique({ where: { id: barberId } });
    if (!barber) return false;
    if (barber.userId) {
      await tx.barber.updateMany({ where: { id: barberId }, data: { userId: null } });
      await dropUnusedBarberAccess(tx, tenantId, barber.userId);
    }
    return true;
  });
}
