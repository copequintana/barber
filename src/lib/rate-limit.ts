/**
 * Rate limiting simple en memoria (ventana deslizante por clave).
 *
 * Suficiente para una sola instancia (dev / despliegue single-node). Para
 * múltiples instancias en producción, sustituir por un backend compartido
 * (p. ej. Upstash Redis) manteniendo esta misma interfaz.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  // poda ocasional para que el mapa no crezca sin límite
  if (buckets.size > 10_000 && Math.random() < 0.01) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** Clave por IP a partir de los headers del request (detrás de proxy o no). */
export function clientKey(headers: Headers, scope: string): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local";
  return `${scope}:${ip}`;
}
