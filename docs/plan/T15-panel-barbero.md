# T15 — Panel del barbero (mobile-first)

- **Fase:** 2 — Retención y operación diaria
- **Estimación:** 2–3 días
- **Depende de:** T11
- **Estado:** completada

## Descripción

Vista reducida y optimizada para el teléfono del barbero: su día de un vistazo y las dos o tres acciones que hace entre corte y corte.

## Subtareas

- [x] Vista "mi día" en `/barber`: lista cronológica con hora, cliente, servicio, precio, notas del cliente (📝) y navegación ←/hoy/→ → [page.tsx](../../src/app/barber/page.tsx).
- [x] Acciones rápidas: "✓ Listo" / "No vino", tap-para-llamar (`tel:`) y botón directo a WhatsApp del cliente.
- [x] "Bloquear un hueco" (desde/duración/motivo) y quitar bloqueos propios, desde el teléfono.
- [x] Autorización en capa de servicio → [src/lib/barber-panel.ts](../../src/lib/barber-panel.ts): todo verifica `barber.userId === sesión`; cubierto por [tests/db/barber-panel.test.ts](../../tests/db/barber-panel.test.ts) (marcar/quitar de otro barbero → `forbidden`).
- [x] PWA: `manifest.webmanifest` (start_url `/barber`, standalone) + ícono SVG de poste de barbero.

## Criterios de aceptación

- Todo el flujo diario del barbero funciona con una mano en una pantalla de móvil.
- Un barbero no puede ver ni modificar citas de otro barbero (test de autorización).
