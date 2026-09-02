# T18 — Suscripciones SaaS con Stripe Billing

- **Fase:** 3 — Monetización
- **Estimación:** 4–5 días
- **Depende de:** T04
- **Estado:** pendiente

## Descripción

Cobrarle al tenant: planes por número de barberos, trial, portal de facturación y gating de features por plan.

## Subtareas

- [ ] Definir planes (p. ej. Solo: 1 barbero / Studio: hasta 5 / Shop: ilimitado + features premium) y crearlos en Stripe.
- [ ] Checkout de suscripción y Customer Portal de Stripe para cambios de plan y facturas.
- [ ] Webhooks (`checkout.session.completed`, `customer.subscription.updated/deleted`) con verificación de firma e idempotencia; estado de suscripción en `tenants`.
- [ ] Trial de 14 días sin tarjeta; banners de estado (trial por vencer, pago fallido, suspendido).
- [ ] Gating central de features: helper `tenantCan(feature)` usado en servicio y UI (p. ej. límite de barberos activos, recordatorios WhatsApp, dominio propio).
- [ ] Comportamiento al suspender: página pública sigue mostrando la barbería pero sin aceptar reservas nuevas; panel en solo-lectura.

## Criterios de aceptación

- Flujo completo: trial → suscripción → upgrade/downgrade → cancelación, verificado contra Stripe en modo test.
- Un tenant en plan Solo no puede activar un segundo barbero.
