# T06 — CRUD de servicios y asignación a barberos

- **Fase:** 1 — MVP reservable
- **Estimación:** 2 días
- **Depende de:** T04
- **Estado:** completada

## Descripción

Gestión del catálogo de servicios del tenant y de qué barbero ofrece cada servicio, con precio propio opcional.

## Subtareas

- [x] Listado y formulario de servicios: nombre, duración, buffer, precio, activo; borrado definitivo bloqueado si hay citas (FK Restrict → mensaje "desactívalo") → [/admin/services](../../src/app/admin/services/page.tsx).
- [x] Asignación barbero↔servicio con `price_override` opcional (se edita en la ficha del barbero; la ficha del servicio muestra quién lo realiza).
- [x] Regla: servicio sin barbero activo no aparece en la página pública — centralizada en [src/lib/catalog.ts](../../src/lib/catalog.ts) y cubierta por [tests/db/catalog.test.ts](../../tests/db/catalog.test.ts); el listado admin lo señala con "Sin barbero: no visible".
- [x] Ordenamiento manual con ▲▼ (swap de `sortOrder`).

## Criterios de aceptación

- El catálogo público muestra solo servicios activos con al menos un barbero, con el precio correcto por barbero.
- Cambiar la duración de un servicio no altera citas ya creadas (usan `ends_at` persistido).
