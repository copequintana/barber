# T13 — Recordatorios automáticos (WhatsApp/email)

- **Fase:** 2 — Retención y operación diaria
- **Estimación:** 3–4 días
- **Depende de:** T12
- **Estado:** completada (WhatsApp real requiere credenciales de Meta y plantilla aprobada; sin ellas corre el transporte de desarrollo)

## Descripción

Recordatorios T-24h y T-2h por WhatsApp (canal principal en LATAM) con email como fallback, disparados por cron. Es la feature que más reduce no-shows.

## Subtareas

- [x] Meta WhatsApp Cloud API → [src/lib/whatsapp/send.ts](../../src/lib/whatsapp/send.ts): plantilla parametrizada (`WHATSAPP_TOKEN/PHONE_ID/TEMPLATE`), normalización de teléfonos a formato internacional, transporte consola en desarrollo.
- [x] Motor de cron → [src/lib/reminders.ts](../../src/lib/reminders.ts): ventanas T-24h y T-2h sobre citas `confirmed`; endpoint `GET /api/cron/reminders` (protegido con `CRON_SECRET`) y `npm run cron` local. Programar cada 15 min al desplegar.
- [x] Idempotente por unique `(appointment, type, channel)` con re-claim atómico de filas `failed` (reintentos sin duplicar).
- [x] Fallback a email si el tenant no activó WhatsApp, si el teléfono no es normalizable o si el envío falla.
- [x] Config por tenant: `reminder_24h_enabled`, `reminder_2h_enabled`, `whatsapp_enabled` (migración). *(UI de configuración pendiente; editable por BD.)*
- [x] El recordatorio lleva el link de la cita (ver/mover/cancelar). Regla extra: cita creada dentro de la ventana no recibe ese recordatorio, y nada se envía a <10 min del inicio.
- [x] Tests ([reminders.test.ts](../../tests/db/reminders.test.ts)): ventanas, idempotencia, creada-dentro-de-ventana, canal WhatsApp, toggles y cierre automático.

## Criterios de aceptación

- Ninguna cita recibe el mismo recordatorio dos veces, incluso si el cron corre en paralelo.
- Cita creada dentro de la ventana (p. ej. 1 h antes) no recibe recordatorios ya vencidos.
