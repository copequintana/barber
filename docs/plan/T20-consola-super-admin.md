# T20 — Consola super-admin

- **Fase:** 3 — Monetización
- **Estimación:** 2–3 días
- **Depende de:** ~~T18~~ (adaptada: se construyó sin facturación, porque los pagos se pospusieron por decisión del 2026-08-29)
- **Estado:** completada (sin las partes de Stripe: MRR y estado de suscripción llegarán con T18)

## Descripción

Panel interno de la plataforma (`/platform`) para operar el SaaS: tenants, suscripciones, soporte y métricas globales.

## Subtareas

- [x] Acceso por flag `is_platform_admin` + allowlist `PLATFORM_ADMIN_EMAILS` → [src/lib/platform-guard.ts](../../src/lib/platform-guard.ts); usuario sin permiso → redirect (verificado por HTTP).
- [x] Listado de tenants en `/platform`: plan, barberos, citas de los últimos 30 días, fecha de alta y estado. *(Estado de suscripción: con T18.)*
- [x] Suspender/reactivar tenant: la página pública sigue visible pero **no acepta reservas nuevas** (bloqueo en `createBooking` + aviso en la página de reserva + banner en el panel del tenant); auditado. *(Extender trial / cambiar plan: con T18.)*
- [x] Vista de soporte en solo lectura (`/platform/[id]`): configuración, equipo, barberos, últimas reservas — con banner visible y registro `view_tenant` en `platform_audit_logs` (nueva tabla).
- [x] Métricas: barberías totales/activas-30d/suspendidas, usuarios, reservas totales y de 30 días. *(MRR y churn: con T18.)*
- [x] Tests ([platform.test.ts](../../tests/db/platform.test.ts)): suspensión bloquea reservas con error tipado y queda auditada; reactivación restablece.

## Criterios de aceptación

- Ninguna ruta `/platform` es accesible sin el flag de plataforma (test de autorización).
- Toda impersonación queda registrada en el log de auditoría.
