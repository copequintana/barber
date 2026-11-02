import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { DirectoryList } from "@/components/directory-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Encuentra tu barbería · BarberDesk",
  description: "Busca y reserva en una barbería cerca de ti.",
};

export default function DirectorioPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-semibold tracking-tight">BarberDesk</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">¿Tienes una barbería?</Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-col gap-2 pt-2">
        <p className="text-sm font-medium text-primary">Reserva en línea, sin llamadas</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Encuentra tu barbería y aparta tu lugar</h1>
        <p className="text-muted-foreground">Si tu navegador te pide tu ubicación, acéptala y verás primero las que te quedan más cerca.</p>
      </section>

      <DirectoryList />
    </main>
  );
}
