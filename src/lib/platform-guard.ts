import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./db";
import type { PlatformUser } from "./platform";

/**
 * Acceso a la consola de plataforma: `users.is_platform_admin` o emails en
 * PLATFORM_ADMIN_EMAILS (coma-separados; útil en desarrollo).
 */
export async function requirePlatformAdmin(): Promise<PlatformUser> {
  const session = await getSession();
  const sessionUser = session?.user;
  if (!sessionUser?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) redirect("/login");

  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!user.isPlatformAdmin && !allowlist.includes(user.email.toLowerCase())) {
    redirect("/");
  }
  return { id: user.id, email: user.email };
}
