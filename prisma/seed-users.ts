import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";

export async function ensureUserWithPassword(email: string, name: string, password: string) {
  const user = (await prisma.user.findUnique({ where: { email } })) ?? (await prisma.user.create({ data: { email, name } }));
  const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" }, select: { id: true } });
  if (!account) {
    const ctx = await auth.$context;
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        providerId: "credential",
        issuer: "local:credential",
        accountId: user.id,
        password: await ctx.password.hash(password),
      },
    });
  }
  return user;
}
