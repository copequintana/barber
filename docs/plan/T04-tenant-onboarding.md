# T04 — Resolución de tenant y onboarding

- **Fase:** 0 — Fundaciones
- **Estimación:** 2–3 días
- **Depende de:** T03
- **Estado:** completada (el paso 2 del wizard —primer barbero/servicio— y el branding se integran con los formularios de T05/T06)

## Descripción

Resolver el tenant por slug en la URL pública (`/b/[slug]`) y construir el flujo de alta: registro → crear barbería → wizard mínimo. Cierra la Fase 0.

## Subtareas

- [x] Resolución de tenant por slug en `/b/[slug]` (helper `getTenantBySlug` + `withTenant` para los datos) → [página pública](../../src/app/b/%5Bslug%5D/page.tsx) con servicios y barberos del seed.
- [x] Página 404 propia para slugs inexistentes.
- [x] Onboarding en `/onboarding`: nombre, slug autogenerado (validado, único, con lista de reservados), timezone IANA, moneda; crea `tenant` + membership `owner` y activa el tenant → [actions.ts](../../src/app/onboarding/actions.ts).
- [ ] Paso 2 del wizard: primer barbero y primer servicio — se hará con los formularios de T05/T06.
- [ ] Branding (logo y color): pendiente; la página pública ya usa `brandColor` si existe.

## Criterios de aceptación

- Un usuario nuevo llega de cero a una barbería creada con un barbero y un servicio en menos de 3 minutos.
- Dos tenants de prueba conviven sin ver datos del otro — **criterio de salida de la Fase 0**.
