# T19 — Depósitos del cliente con hold de slot

- **Fase:** 3 — Monetización
- **Estimación:** 4–5 días
- **Depende de:** T10, T18
- **Estado:** pendiente

## Descripción

Cobro opcional de depósito o prepago al cliente final al reservar (Mercado Pago o Stripe, según el país del tenant), con hold del slot mientras dura el checkout. Es la primera vez que el sistema necesita holds — antes el constraint bastaba.

## Subtareas

- [ ] Configuración por tenant/servicio: sin pago, depósito fijo o porcentaje, o prepago total.
- [ ] Hold del slot: cita en estado `pending` con TTL (p. ej. 10 min) que ocupa el slot vía el mismo constraint; cron/job libera holds vencidos.
- [ ] Integración de checkout (Mercado Pago Checkout Pro y/o Stripe Checkout) y webhooks de confirmación: pago aprobado → `confirmed`; rechazado/expirado → liberar.
- [ ] Política de reembolso en cancelación según plazo (automático o manual, configurable).
- [ ] Registro de pagos en tabla `payments` vinculada a la cita; visible en agenda y reportes.

## Criterios de aceptación

- Un slot en checkout no puede ser tomado por otro cliente, y se libera solo si el pago no se concreta.
- Flujo de punta a punta (reserva → pago → confirmación → reembolso por cancelación) verificado en sandbox.
