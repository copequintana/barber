import Link from "next/link";

export default function TenantNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">Barbería no encontrada</h1>
      <p className="text-sm opacity-70">
        El enlace no corresponde a ninguna barbería activa. Verifica la
        dirección con tu barbero.
      </p>
      <Link href="/" className="text-sm underline">
        Ir al inicio
      </Link>
    </main>
  );
}
