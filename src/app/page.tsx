import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold">💈 BarberDesk</h1>
        <p className="mt-2 opacity-70">
          Citas en línea para barberías. Multi-barbero, multi-tenant.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {session?.user ? (
          <Link
            href="/select-tenant"
            className="rounded-md bg-foreground px-5 py-2.5 font-medium text-background"
          >
            Ir a mis barberías
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-foreground px-5 py-2.5 font-medium text-background"
          >
            Entrar
          </Link>
        )}
        <Link href="/b/la-cueva" className="text-sm underline opacity-70">
          Ver una barbería de ejemplo
        </Link>
      </div>
    </main>
  );
}
