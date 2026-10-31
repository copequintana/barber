"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
  ExternalLink,
  House,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Inicio", icon: House },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/barbers", label: "Barberos", icon: Users },
  { href: "/admin/services", label: "Servicios", icon: Scissors },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/agenda" && pathname.startsWith("/admin/customers/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type ShellProps = {
  tenantName: string;
  publicHref: string | null;
  userEmail: string;
  logout: () => Promise<void>;
  children: React.ReactNode;
};

function Brand({ tenantName }: { tenantName: string }) {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        {tenantName.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{tenantName}</span>
        <span className="block text-xs text-muted-foreground">BarberDesk</span>
      </span>
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: boolean }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        const link = (
          <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
        return onNavigate ? (
          <SheetClose asChild key={href}>
            {link}
          </SheetClose>
        ) : (
          <div key={href}>{link}</div>
        );
      })}
    </nav>
  );
}

function Footer({
  publicHref,
  userEmail,
  logout,
  inSheet,
}: Omit<ShellProps, "tenantName" | "children"> & { inSheet?: boolean }) {
  const switchLink = (
    <Link
      href="/select-tenant"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <ArrowLeftRight className="size-4" /> Cambiar de barbería
    </Link>
  );
  return (
    <div className="flex flex-col gap-0.5 border-t pt-3">
      {publicHref ? (
        <a
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" /> Ver página pública
        </a>
      ) : null}
      {inSheet ? <SheetClose asChild>{switchLink}</SheetClose> : switchLink}
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" /> Salir
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2 px-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{userEmail}</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AdminShell({ tenantName, publicHref, userEmail, logout, children }: ShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
        <div className="px-2">
          <Brand tenantName={tenantName} />
        </div>
        <div className="flex-1">
          <NavList pathname={pathname} />
        </div>
        <Footer publicHref={publicHref} userEmail={userEmail} logout={logout} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <Brand tenantName={tenantName} />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Abrir menú">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 px-3 py-4">
            <SheetHeader className="px-2 pt-0 pb-4">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <Brand tenantName={tenantName} />
            </SheetHeader>
            <div className="flex-1">
              <NavList pathname={pathname} onNavigate />
            </div>
            <Footer publicHref={publicHref} userEmail={userEmail} logout={logout} inSheet />
          </SheetContent>
        </Sheet>
      </header>

      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
