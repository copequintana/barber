# T07 — Horarios de trabajo y bloqueos

- **Fase:** 1 — MVP reservable
- **Estimación:** 2–3 días
- **Depende de:** T05
- **Estado:** completada

## Descripción

Definir la disponibilidad base de cada barbero: franjas semanales recurrentes (`working_hours`, en hora local del tenant) y bloqueos puntuales (`time_off`: vacaciones, almuerzo, imprevistos).

## Subtareas

- [x] Editor semanal en `/admin/barbers/[id]/schedule`: múltiples franjas por día, quitar franja, y "copiar día a otros días" (reemplaza el destino) → [page.tsx](../../src/app/admin/barbers/%5Bid%5D/schedule/page.tsx).
- [x] Validación de franjas: inicio < fin y sin solapes dentro del día (en action + checks SQL de la migración).
- [x] CRUD de bloqueos con rango fecha-hora local del tenant y motivo; lista de bloqueos vigentes. *(Se pintarán en la agenda en T11.)*
- [x] Horarios como weekday + minutos locales; bloqueos como `timestamptz` UTC. Conversión centralizada en [src/lib/time.ts](../../src/lib/time.ts) (Luxon), con tests de DST en [tests/unit/time.test.ts](../../tests/unit/time.test.ts).
- [x] Advertencia al crear un bloqueo que pisa citas activas: banner con el conteo, sin cancelar nada.

## Criterios de aceptación

- Los horarios definidos son exactamente los que el motor de disponibilidad (T08) usa como base.
- Un bloqueo elimina los slots de ese rango en la página pública.
