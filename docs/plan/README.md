# Tareas del plan de implementación

Índice de tareas derivadas de [`docs/plan-implementacion.md`](../plan-implementacion.md).

📋 **Reportes:** [pendientes de configuración (acciones del dueño)](./reports/pendientes-configuracion.md) · [guía de pruebas manuales por escenarios](./reports/guia-pruebas.md)
Cada tarea es un archivo con su descripción, subtareas, dependencias y criterios de aceptación.
Al completar una tarea, actualizar su campo **Estado** (`pendiente` → `en progreso` → `completada`) y marcar la fila aquí.

## Fase 0 — Fundaciones (1–2 semanas)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| [T01](./T01-scaffold-proyecto.md) | Scaffold del proyecto y CI | — | ✅ completada (CI/deploy pospuestos) |
| [T02](./T02-esquema-bd-rls.md) | Esquema de BD, RLS y constraint anti-solape | T01 | ✅ completada |
| [T03](./T03-autenticacion.md) | Autenticación y sesión con tenant/rol | T02 | ✅ completada |
| [T04](./T04-tenant-onboarding.md) | Resolución de tenant y onboarding | T03 | ✅ completada (paso 2 y branding → T05/T06) |

## Fase 1 — MVP reservable (3–4 semanas)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| [T05](./T05-crud-barberos.md) | CRUD de barberos | T04 | ✅ completada |
| [T06](./T06-crud-servicios.md) | CRUD de servicios y asignación a barberos | T04 | ✅ completada |
| [T07](./T07-horarios-bloqueos.md) | Horarios de trabajo y bloqueos | T05 | ✅ completada |
| [T08](./T08-motor-disponibilidad.md) | Motor de disponibilidad | T06, T07 | ✅ completada |
| [T09](./T09-pagina-publica-reservas.md) | Página pública de reservas | T08 | ✅ completada |
| [T10](./T10-creacion-reserva-cancelacion.md) | Creación de reserva y cancelación por token | T08 | ✅ completada |
| [T11](./T11-agenda-admin.md) | Agenda admin día/semana | T10 | ✅ completada |
| [T12](./T12-emails-transaccionales.md) | Emails transaccionales | T10 | ✅ completada (falta `RESEND_API_KEY` para envío real) |

## Fase 2 — Retención y operación diaria (2–3 semanas)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| [T13](./T13-recordatorios.md) | Recordatorios automáticos (WhatsApp/email) | T12 | ✅ completada (WhatsApp real: faltan credenciales de Meta) |
| [T14](./T14-reprogramacion-ciclo-vida.md) | Reprogramación y ciclo de vida de citas | T10 | ✅ completada |
| [T15](./T15-panel-barbero.md) | Panel del barbero (mobile-first) | T11 | ✅ completada |
| [T16](./T16-subdominios.md) | Subdominios por tenant | T09 | ✅ código listo (DNS/hosting al desplegar) |
| [T17](./T17-reportes.md) | Reportes básicos | T11, T14 | ✅ completada |

## Fase 3 — Monetización (3–4 semanas)

| # | Tarea | Depende de | Estado |
|---|---|---|---|
| [T18](./T18-stripe-billing.md) | Suscripciones SaaS con Stripe Billing | T04 | ⏸️ pospuesta (decisión 2026-08-29: sin pagos por ahora) |
| [T19](./T19-depositos-hold.md) | Depósitos del cliente con hold de slot | T10, T18 | ⏸️ pospuesta (decisión 2026-08-29) |
| [T20](./T20-consola-super-admin.md) | Consola super-admin | — | ✅ completada (partes de Stripe → cuando se retome T18) |
| [T21](./T21-dominios-propios.md) | Dominios propios por tenant | T16, T18 | ⏸️ pospuesta (requiere despliegue y plan de pagos) |

## Criterios de salida por fase

- **Fase 0:** dos tenants de prueba conviven sin ver datos del otro (test automatizado de aislamiento RLS).
- **Fase 1:** piloto con 1–2 barberías reales operando su agenda una semana completa.
- **Fase 2:** tasa de no-show medible y en descenso; barberos usando su panel a diario.
- **Fase 3:** primer tenant pagando; cobro de depósito de punta a punta en producción.
