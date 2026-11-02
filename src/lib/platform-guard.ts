import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./db";
import type { PlatformUser } from "./platform";

function isAllowlisted(email: string): boolean {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function isPlatformAdminUser(user: { isPlatformAdmin: boolean; email: string }): boolean {
  return user.isPlatformAdmin || isAllowlisted(user.email);
}

export function canRunDemos(user: {
  isPlatformAdmin: boolean;
  isVendor: boolean;
  email: string;
}): boolean {
  return user.isVendor || isPlatformAdminUser(user);
}

async function currentUser() {
  const session = await getSession();
  const sessionUser = session?.user;
  if (!sessionUser?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) redirect("/login");
  return user;
}

/**
 * Acceso a la consola de plataforma: `users.is_platform_admin` o emails en
 * PLATFORM_ADMIN_EMAILS (coma-separados; útil en desarrollo).
 */
export async function requirePlatformAdmin(): Promise<PlatformUser> {
  const user = await currentUser();
  if (!isPlatformAdminUser(user)) redirect("/");
  return { id: user.id, email: user.email };
}

export async function requireVendor(): Promise<PlatformUser> {
  const user = await currentUser();
  if (!canRunDemos(user)) redirect("/select-tenant");
  return { id: user.id, email: user.email };
}

export async function requireStaff(): Promise<PlatformUser & { isAdmin: boolean }> {
  const user = await currentUser();
  if (!canRunDemos(user)) redirect("/select-tenant");
  return { id: user.id, email: user.email, isAdmin: isPlatformAdminUser(user) };
}
