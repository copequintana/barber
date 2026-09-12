import Image from "next/image";
import Link from "next/link";
import { DirectoryList } from "@/components/directory-list";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo-mark-hero.png"
          alt="BarberDesk"
          width={125}
          height={88}
          priority
          className="rounded-xl shadow-md"
        />
        <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
          BarberDesk
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Barberías cerca de ti</h1>
        <p className="text-sm opacity-70">
          Si tu navegador te pide tu ubicación, acéptala para ordenar por
          cercanía.
        </p>
      </div>

      <DirectoryList />

      <div className="mt-4 border-t border-black/10 pt-4 text-sm dark:border-white/15">
        {session?.user ? (
          <Link href="/select-tenant" className="underline opacity-70">
            Ir a mis barberías →
          </Link>
        ) : (
          <Link href="/login" className="underline opacity-50">
            ¿Tienes una cuenta de barbería? Entra
          </Link>
        )}
      </div>
    </main>
  );
}
