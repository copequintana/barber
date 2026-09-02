# T01 — Scaffold del proyecto y CI

- **Fase:** 0 — Fundaciones
- **Estimación:** 2–3 días
- **Depende de:** —
- **Estado:** completada (CI y despliegue pospuestos por decisión: desarrollo local sin git por ahora)

## Descripción

Crear el esqueleto del monolito Next.js con TypeScript, tooling de calidad y pipeline de CI, junto con los entornos de desarrollo y producción.

## Subtareas

- [x] Proyecto Next.js 16 (App Router) con TypeScript estricto. *(Sin git por decisión del equipo — se desarrolla sobre carpeta local.)*
- [x] ESLint y Vitest configurados; scripts `lint`, `typecheck`, `test`. Playwright agregado en T09 (`npm run test:e2e`).
- [ ] ~~CI (GitHub Actions)~~ Pospuesto: requiere repo git.
- [ ] ~~Vercel~~ Pospuesto: se decidirá al momento de desplegar.
- [x] PostgreSQL 16 en Docker local (`barberdesk-pg`, puerto 5433) con rol de app sin privilegios (`npm run db:init`); `.env.example` documentado. *(Neon/Supabase quedará para producción.)*
- [x] Estructura de carpetas base: `src/app/`, `src/lib/`, `prisma/`, `tests/`, `scripts/`, `docs/`.

## Criterios de aceptación

- `npm run dev` levanta la app localmente conectada a la BD de dev.
- Un PR de prueba ejecuta lint + typecheck + tests en CI y despliega un preview en Vercel.
