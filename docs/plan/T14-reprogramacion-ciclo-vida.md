# T14 — Reprogramación y ciclo de vida de citas

- **Fase:** 2 — Retención y operación diaria
- **Estimación:** 2–3 días
- **Depende de:** T10
- **Estado:** completada

## Descripción

Reprogramación self-service desde el link del cliente y estados finales de la cita (`completed`, `no_show`) con cierre automático de citas pasadas.

## Subtareas

- [x] Reprogramación en `/b/[slug]/cita/[token]/reprogramar` (mismo barbero y servicio): el constraint protege el nuevo horario **actualizando la fila** (mejor que cancelar+crear: si pierde la carrera, la original queda intacta y el link no cambia). Cubierta en el E2E.
- [x] Misma ventana de política que la cancelación; email "tu cita cambió de horario" al cliente. Al mover (self-service o staff) se **borran los recordatorios enviados** para que el cron los re-emita con el nuevo horario.
- [x] Acciones "✓ Completada" / "No asistió" en el detalle de cita admin. *(En el panel del barbero: T15.)*
- [x] Cierre automático: citas confirmadas terminadas hace más de `auto_complete_hours` (default 24, por tenant) → `completed`, dentro del mismo cron.
- [x] Contador de no-shows en la ficha del cliente (desde T11).
- [x] Tests ([reschedule.test.ts](../../tests/db/reschedule.test.ts)): mover ok conservando token, conflicto deja la original intacta, ventana de política, horas manipuladas.

## Criterios de aceptación

- Reprogramar nunca deja al cliente sin cita (si el nuevo slot falla, conserva la original).
- Toda cita pasada termina en un estado final sin intervención manual.
