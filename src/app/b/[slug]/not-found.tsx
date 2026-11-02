import Link from "next/link";

export default function TenantNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="title-lg">Barbería no encontrada</h1>
      <p className="text-sm text-muted-foreground">
        El enlace no corresponde a ninguna barbería activa. Verifica la
        dirección con tu barbero.
      </p>
      <Link
        href="/directorio"
        className="mt-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Buscar barberías cerca de ti
      </Link>
    </main>
  );
}
