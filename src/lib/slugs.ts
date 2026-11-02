/**
 * Reglas de slugs de tenant. Módulo sin dependencias de BD: lo importa
 * también el middleware/proxy (runtime Edge).
 */

/** Slugs que nunca pueden ser de un tenant (rutas y subdominios del sistema). */
export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "b", "barber", "login", "logout", "signup",
  "onboarding", "select-tenant", "platform", "static", "assets", "docs",
  "directorio", "socios", "reset-password", "demo",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "El link debe tener al menos 3 letras";
  if (slug.length > 40) return "El link puede tener hasta 40 letras";
  if (!SLUG_RE.test(slug)) return "Usa solo letras sin acentos, números y guiones, sin guion al principio ni al final";
  if (RESERVED_SLUGS.has(slug)) return "Ese link está reservado; elige otro";
  return null;
}
