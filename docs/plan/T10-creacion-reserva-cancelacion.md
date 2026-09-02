# T10 — Creación de reserva y cancelación por token

- **Fase:** 1 — MVP reservable
- **Estimación:** 2–3 días
- **Depende de:** T08
- **Estado:** completada (la UI pública que la invoca llega con T09; editar la ventana de cancelación desde el panel, con la página de configuración del tenant)

## Descripción

Lógica transaccional de creación de citas apoyada en el constraint de exclusión de T02, y cancelación self-service del cliente mediante link firmado, sin cuenta.

## Subtareas

- [x] `createBooking` en [src/lib/booking.ts](../../src/lib/booking.ts): revalida el slot contra el motor (rechaza horas manipuladas: fuera de horario, de grilla o de antelación), upsert de `customer` por teléfono, cita en transacción con `price_at_booking` congelado (respeta `price_override` del barbero) y modo "cualquier barbero" que asigna uno libre.
- [x] El error de exclusión de la BD se traduce a `slot_taken` tipado — nunca un 500.
- [x] `cancel_token` (UUID aleatorio de la cita, no adivinable) y página pública `/b/[slug]/cita/[token]` que muestra la cita y permite cancelar. *(Se optó por capability-token en vez de JWT: no expira mientras la cita exista y es revocable con la cita.)*
- [x] Política configurable: `tenants.cancel_min_minutes` (default 120); fuera de plazo la página lo explica y pide contactar a la barbería.
- [x] Tests de integración ([booking.test.ts](../../tests/db/booking.test.ts)): carrera por el último hueco (exactamente una gana), cancelar libera el slot, ventana de cancelación, dedupe de clientes, precios con override. Smoke E2E: reserva real por script + página del link verificada por HTTP.

## Criterios de aceptación

- Imposible crear dos citas solapadas del mismo barbero, verificado por test de carrera en CI.
- El cliente cancela desde el link del email/WhatsApp sin iniciar sesión y el slot vuelve a estar disponible.
