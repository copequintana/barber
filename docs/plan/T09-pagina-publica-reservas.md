# T09 — Página pública de reservas

- **Fase:** 1 — MVP reservable
- **Estimación:** 4–5 días
- **Depende de:** T08
- **Estado:** completada

## Descripción

Página pública por tenant (`/b/[slug]`) donde el cliente reserva sin crear cuenta, en un flujo de 4 pasos. Mobile-first: la mayoría de las reservas llegarán desde el teléfono, típicamente vía link en Instagram/WhatsApp de la barbería.

## Subtareas

- [x] Landing del tenant con color de marca, servicios con precio/duración, barberos y CTA "Reservar cita". *(El logo se mostrará cuando exista upload de imágenes.)*
- [x] Flujo de 4 pasos en `/b/[slug]/reservar` → [wizard.tsx](../../src/app/b/%5Bslug%5D/reservar/wizard.tsx): servicio (con "desde $X" si hay overrides) → barbero o "cualquiera" → tira de fechas + slots del motor → nombre/teléfono/email opcional. Si el slot se ocupa mientras llenan el form: banner + "Ver horarios disponibles" para recuperarse.
- [x] Horarios en timezone del tenant con etiqueta explícita.
- [x] Confirmación en la página de la cita (`?nueva=1`) con "Agregar a mi calendario" (ruta `.ics`).
- [x] SSR con metadatos OG por tenant.
- [x] Rate limiting por IP en `/api/availability` (120/min) y en la action de reserva (10/min) → [src/lib/rate-limit.ts](../../src/lib/rate-limit.ts), en memoria (una instancia); para multi-instancia, cambiar el backend a Upstash conservando la interfaz.
- [x] E2E Playwright ([tests/e2e/booking.spec.ts](../../tests/e2e/booking.spec.ts)) en viewport desktop y móvil: flujo completo + cancelación desde el link + recuperación de conflicto de slot. `npm run test:e2e`.

## Hallazgo durante el desarrollo

El E2E en paralelo destapó un defecto real del modo "cualquier barbero": se elegía siempre el primer barbero libre y, si dos reservas simultáneas apuntaban al mismo slot, la segunda fallaba aunque otro barbero estuviera libre. Ahora `createBooking` baraja los candidatos y reintenta con el siguiente al perder la carrera (test: dos reservas "cualquiera" simultáneas ganan con barberos distintos).

## Criterios de aceptación

- Reserva completa en móvil en menos de 60 segundos sin registro.
- Test E2E (Playwright) del flujo completo de reserva pasa en CI.
