# T08 — Motor de disponibilidad

- **Fase:** 1 — MVP reservable
- **Estimación:** 4–5 días
- **Depende de:** T06, T07
- **Estado:** completada

## Descripción

El corazón del producto: función pura y testeada que calcula los slots disponibles de un barbero (o de todos) para un servicio y una fecha. Es la zona con más bugs potenciales del sistema (DST, solapes, buffers) — la suite de tests es parte del entregable, no un extra.

## Subtareas

- [x] Motor en [src/lib/availability.ts](../../src/lib/availability.ts): `computeDaySlots` (función **pura**, con `now` inyectable) genera slots sobre hora de pared del tenant y los compara contra ocupación en instantes UTC; `getDayAvailability` carga horarios/bloqueos/citas y la aplica por barbero. El `end` del slot incluye el buffer (es lo que ocupará `appointments.ends_at`).
- [x] Modo "cualquier barbero": unión de slots indicando `barberIds` libres en cada horario.
- [x] Configuración por tenant: `slotGridMinutes` (15), `minLeadMinutes` (60), `maxAdvanceDays` (30) — campos ya en `tenants`.
- [x] Endpoint público `GET /api/availability?tenant&service&date[&barber]` con validación Zod y cache corto (15 s); verificado contra seed: 62 ms de latencia (<200 ms criterio).
- [x] Suite: 15 tests unitarios ([availability.test.ts](../../tests/unit/availability.test.ts)) — DST de primavera (horas inexistentes no generan slots) y otoño (hora repetida), buffers, franjas partidas, bloqueos parciales, bordes de antelación mín/máx exactos, citas contiguas — y 4 de integración del wrapper ([db/availability.test.ts](../../tests/db/availability.test.ts)).

## Criterios de aceptación

- Toda la suite de tests pasa en CI, incluyendo los casos de DST.
- El cálculo de un día con 5 barberos responde < 200 ms.
