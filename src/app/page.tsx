import Image from "next/image";
import Link from "next/link";
import { DirectoryList } from "@/components/directory-list";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Encuentra tu barbería · BarberDesk",
  description: "Busca y reserva en una barbería cerca de ti.",
};

/**
 * Landing pública: para el cliente que busca dónde cortarse el pelo, no
 * para el dueño de barbería (esa pitch vive aparte, en /socios, compartida
 * en privado con prospectos — no enlazada desde aquí a propósito).
 */
export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <span className="font-semibold tracking-tight">BarberDesk</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            {session?.user ? (
              <Link href="/select-tenant">Mis barberías</Link>
            ) : (
              <Link href="/login">Tengo una barbería</Link>
            )}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-col gap-2 pt-2">
        <p className="text-sm font-medium text-primary">Reserva en línea, sin llamadas</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Encuentra tu barbería y aparta tu lugar
        </h1>
        <p className="text-muted-foreground">
          Si tu navegador te pide tu ubicación, acéptala y verás primero las
          que te quedan más cerca.
        </p>
      </section>

      <DirectoryList />
    </main>
  );
}
