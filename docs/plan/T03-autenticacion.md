# T03 — Autenticación y sesión con tenant/rol

- **Fase:** 0 — Fundaciones
- **Estimación:** 2–3 días
- **Depende de:** T02
- **Estado:** completada (magic link por email queda para Fase 1, con Resend; Google listo pero requiere credenciales)

## Descripción

Implementar login con Auth.js v5 (magic link por email + Google OAuth) y enriquecer la sesión con el tenant activo y el rol del usuario (`owner`, `admin`, `barber`), que salen de `memberships`.

## Subtareas

- [x] Auth.js v5 con sesión JWT → [src/lib/auth.ts](../../src/lib/auth.ts). Proveedores: `dev-login` (email libre, solo con `ALLOW_DEV_LOGIN` o fuera de producción) y Google condicionado a `GOOGLE_CLIENT_ID/SECRET`. *(Magic link con Resend: Fase 1, T12.)*
- [x] El token lleva solo `userId`; el tenant activo vive en cookie `bd_active_tenant` y el **rol se verifica contra `memberships` en cada request** (sin roles obsoletos cacheados). Selector en `/select-tenant`.
- [x] Guards de capa de servicio: `requireUser()` y `requireTenantRole(...roles)` → [src/lib/guards.ts](../../src/lib/guards.ts).
- [x] Rutas protegidas: `/admin` (owner/admin) y `/barber` (barber); rol insuficiente redirige al panel que sí corresponde. *(`/platform`: T20.)*
- [x] Página de login con manejo de errores y logout (limpia cookie de tenant + sesión).
- [x] Smoke test HTTP end-to-end: login → selector; usuario sin membresía con cookie de tenant forjada → expulsado a `/select-tenant`.

## Criterios de aceptación

- Un usuario sin membership en el tenant X no puede acceder a ningún dato de X (verificado por test de integración, no solo redirect de UI).
- El rol `barber` no puede acceder a rutas de admin.
