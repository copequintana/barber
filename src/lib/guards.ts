import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "./auth";
import { getMembership } from "./tenancy";

export const ACTIVE_TENANT_COOKIE = "bd_active_tenant";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type TenantContext = {
  user: SessionUser;
  tenantId: string;
  role: Role;
};

/** Usuario autenticado o redirect a /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Autoriza contra el tenant activo (cookie) verificando el rol en
 * `memberships` en cada request. Redirige a /select-tenant si no hay
 * tenant activo o el usuario no pertenece; al panel que sí le corresponde
 * si el rol no alcanza.
 *
 * Nota: esto autoriza el ACCESO; el aislamiento de DATOS lo garantiza RLS
 * vía withTenant() aunque este guard tuviera un bug.
 */
export async function requireTenantRole(
  ...roles: Role[]
): Promise<TenantContext> {
  const user = await requireUser();
  const store = await cookies();
  const tenantId = store.get(ACTIVE_TENANT_COOKIE)?.value;
  if (!tenantId) redirect("/select-tenant");

  const membership = await getMembership(user.id, tenantId);
  if (!membership) redirect("/select-tenant");

  if (!roles.includes(membership.role)) {
    redirect(membership.role === "barber" ? "/barber" : "/admin");
  }
  return { user, tenantId, role: membership.role };
}

export function homeForRole(role: Role): string {
  return role === "barber" ? "/barber" : "/admin";
}
