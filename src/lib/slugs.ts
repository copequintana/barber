/**
 * Reglas de slugs de tenant. Módulo sin dependencias de BD: lo importa
 * también el middleware/proxy (runtime Edge).
 */

/** Slugs que nunca pueden ser de un tenant (rutas y subdominios del sistema). */
export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "b", "barber", "login", "logout", "signup",
  "onboarding", "select-tenant", "platform", "static", "assets", "docs",
  "directorio", "socios", "reset-password",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
