"use client";

import Link from "next/link";
import { ArrowLeftRight, LogOut, Menu } from "lucide-react";
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

export function BarberMenu({
  name,
  tenantName,
  logout,
}: {
  name: string;
  tenantName: string;
  logout: () => Promise<void>;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{tenantName}</p>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-2">
          <SheetClose asChild>
            <Link
              href="/select-tenant"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-base hover:bg-muted"
            >
              <ArrowLeftRight className="size-5 text-muted-foreground" /> Cambiar de barbería
            </Link>
          </SheetClose>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base hover:bg-muted"
            >
              <LogOut className="size-5 text-muted-foreground" /> Salir
            </button>
          </form>
          <div className="flex items-center justify-between px-3 py-3 text-base">
            Tema
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
