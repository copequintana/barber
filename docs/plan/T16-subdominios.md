# T16 — Subdominios por tenant

- **Fase:** 2 — Retención y operación diaria
- **Estimación:** 1–2 días
- **Depende de:** T09
- **Estado:** completada en código (pendiente lo que requiere despliegue real: DNS wildcard y dominio en el hosting)

## Descripción

Migrar la resolución de tenant de slug en ruta (`/b/la-cueva`) a subdominio (`la-cueva.app.com`), manteniendo las URLs viejas como redirect.

## Subtareas

- [ ] DNS wildcard `*.dominio` y dominio wildcard en el hosting — **pendiente de despliegue** (requiere dominio real).
- [x] Proxy (`src/proxy.ts`, la convención de Next 16 que sustituye a middleware): con `ROOT_DOMAIN` definido, `slug.dominio/...` se rewritea internamente a `/b/slug/...`; sin `ROOT_DOMAIN` (dev), la resolución por ruta sigue igual. Probado con headers `Host` contra el servidor real (lvh.me).
- [x] Redirect 301 de `dominio/b/slug/...` al subdominio equivalente.
- [x] Subdominios del sistema reservados (módulo [src/lib/slugs.ts](../../src/lib/slugs.ts), sin dependencias de BD para el runtime Edge): `admin.dominio` no se rewritea; subdominio inexistente → 404 del tenant.
- [ ] Scoping fino de cookies entre dominio principal y subdominios — se validará al desplegar (la página pública no usa sesión, riesgo bajo).

## Criterios de aceptación

- Cada tenant es accesible en su subdominio con SSL válido.
- Los links viejos por slug siguen funcionando vía redirect.
