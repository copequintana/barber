# T12 — Emails transaccionales

- **Fase:** 1 — MVP reservable
- **Estimación:** 1–2 días
- **Depende de:** T10
- **Estado:** completada (falta solo poner `RESEND_API_KEY` en `.env` para envío real; sin ella corre el transporte de desarrollo por consola)

## Descripción

Emails de confirmación y cancelación con Resend + React Email, registrados en la tabla `notifications` para idempotencia. Cierra la Fase 1.

## Subtareas

- [x] Plantillas HTML con color de marca del tenant: confirmación (link de cita + .ics), cancelación (con CTA de re-reserva) y aviso al staff → [templates.ts](../../src/lib/email/templates.ts). *(Se optó por funciones HTML propias en lugar de `@react-email/*`, cuyos paquetes están marcados deprecated en npm.)*
- [x] Envío tras responder con `after()` de Next (no bloquea la reserva); orquestación y registro en `notifications` → [src/lib/notifications.ts](../../src/lib/notifications.ts). Transporte: Resend con `RESEND_API_KEY`, o consola en desarrollo → [send.ts](../../src/lib/email/send.ts).
- [x] Idempotencia por unique `(appointment, type, channel)`: el envío "reclama" la fila antes de enviar; los `failed` quedan registrados para el reintento del cron de T13.
- [x] Aviso "Nueva reserva" a todos los owners/admins del tenant cuando entra una reserva en línea (verificado end-to-end con el E2E + log de consola). *(El toggle por tenant llegará con la página de configuración.)*
- [x] Cancelaciones notifican al cliente tanto si cancela él (link) como si cancela la barbería (agenda).
- [ ] **Trámite paralelo (acción del negocio):** iniciar registro en Meta WhatsApp Cloud API y someter plantillas — lo usa T13 y la aprobación demora semanas.
- [x] Tests ([notifications.test.ts](../../tests/db/notifications.test.ts)): idempotencia por tipo, cliente sin email, destinatarios de staff, cita inexistente.

## Criterios de aceptación

- Toda reserva y cancelación genera exactamente un email, verificable en `notifications`.
- **Criterio de salida de Fase 1:** piloto con 1–2 barberías reales operando su agenda una semana completa.
