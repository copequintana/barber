import Link from "next/link";
import { DirectoryList } from "./directory-list";

export const metadata = {
  title: "Barberías cerca de ti · BarberDesk",
  description: "Encuentra y reserva en una barbería cerca de ti.",
};

export default function DirectoryPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/" className="text-sm underline opacity-70">
          ← BarberDesk
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Barberías cerca de ti</h1>
        <p className="text-sm opacity-70">
          Si tu navegador te pide tu ubicación, acéptala para ordenar por
          cercanía.
        </p>
      </div>

      <DirectoryList />
    </main>
  );
}
