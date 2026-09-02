# T05 — CRUD de barberos

- **Fase:** 1 — MVP reservable
- **Estimación:** 2 días
- **Depende de:** T04
- **Estado:** completada (subida de foto a blob storage y email de invitación quedan ligados a proveedor externo/T12)

## Descripción

Gestión de barberos desde el panel admin: alta, edición, foto, activación/desactivación e invitación opcional a crear cuenta.

## Subtareas

- [x] Listado y ficha de barberos: nombre, bio, foto (por URL; el upload a blob storage se hará al elegir proveedor de storage), activo → [/admin/barbers](../../src/app/admin/barbers/page.tsx).
- [x] Vincular cuenta por email: crea/reusa `user` + membership `barber` (sin degradar owner/admin) y permite desvincular. *(El email de invitación automático llega con T12; mientras, el barbero entra en /login con ese email.)*
- [x] Desactivación suave: el inactivo sale de la página pública (regla verificada en [tests/db/catalog.test.ts](../../tests/db/catalog.test.ts)) y conserva historial.
- [x] Validaciones con Zod en las server actions → [actions.ts](../../src/app/admin/barbers/actions.ts). Además: asignación de servicios con precio propio por barbero desde la ficha.

## Criterios de aceptación

- Un admin crea, edita y desactiva barberos; los cambios se reflejan en la página pública.
- Un barbero invitado inicia sesión y solo ve su propio panel.
