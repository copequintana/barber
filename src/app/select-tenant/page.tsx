import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, Play, Plus, Store } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { prisma } from "@/lib/db";
import { isExpiredDemo, purgeExpiredDemos } from "@/lib/demo";
import {
  ACTIVE_TENANT_COOKIE,
  homeForRole,
  requireUser,
} from "@/lib/guards";
import { canRunDemos } from "@/lib/platform-guard";
import { getMembership, getMembershipsWithTenant } from "@/lib/tenancy";

export const metadata = { title: "Elegir barbería · BarberDesk" };

const ROLE_LABEL = { owner: "Dueño", admin: "Admin", barber: "Barbero" } as const;

export default async function SelectTenantPage() {
  const user = await requireUser();
  await purgeExpiredDemos();
  const [memberships, profile] = await Promise.all([
    getMembershipsWithTenant(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, isVendor: true, isPlatformAdmin: true },
    }),
  ]);
  const vendor = profile ? canRunDemos(profile) : false;
  const ownTenants = memberships.filter((m) => !m.tenant.isDemo);
  if (vendor && ownTenants.length === 0) redirect("/demo");
  if (memberships.length === 0) redirect("/onboarding");

  async function select(formData: FormData) {
    "use server";
    const user = await requireUser();
    const tenantId = String(formData.get("tenantId") ?? "");
    const membership = await getMembership(user.id, tenantId);
    if (!membership || isExpiredDemo(membership.tenant)) redirect("/select-tenant");
    const store = await cookies();
    store.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(homeForRole(membership.role));
  }

  async function logout() {
    "use server";
    (await cookies()).delete(ACTIVE_TENANT_COOKIE);
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AuthShell
      wide
      title="Tus barberías"
      description={`Entraste como ${user.email}. Elige con cuál trabajar.`}
      footer={
        <form action={logout}>
          <button type="submit" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </form>
      }
    >
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {memberships.map((m) => (
            <li key={m.tenantId}>
              <form action={select}>
                <input type="hidden" name="tenantId" value={m.tenantId} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-3 text-left transition-colors hover:border-primary/50 hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                    {m.tenant.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.tenant.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">/b/{m.tenant.slug}</span>
                  </span>
                  {m.tenant.isDemo ? <Badge variant="outline">Demo</Badge> : null}
                  <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        {vendor ? (
          <>
            <Button asChild className="w-full">
              <Link href="/demo">
                <Play /> Demo de ventas
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/platform/alta">
                <Store /> Dar de alta una barbería
              </Link>
            </Button>
          </>
        ) : signupEnabled ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/onboarding">
              <Plus /> Crear otra barbería
            </Link>
          </Button>
        ) : null}
      </div>
    </AuthShell>
  );
}
