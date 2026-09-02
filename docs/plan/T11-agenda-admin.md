# T11 — Agenda admin día/semana

- **Fase:** 1 — MVP reservable
- **Estimación:** 4–5 días
- **Depende de:** T10
- **Estado:** completada (marcar completada/no-show llega en T14, como estaba planeado)

## Descripción

La vista principal del panel del tenant: agenda con columnas por barbero donde el staff ve, crea, mueve y cancela citas, incluyendo walk-ins que llegan sin reserva.

## Subtareas

- [x] `/admin/agenda`: vista día (columnas por barbero) y semana (un barbero, selector), grilla posicionada por minutos con franjas laborales resaltadas, líneas de hora y navegación ←/Hoy/→ + selector de fecha → [page.tsx](../../src/app/admin/agenda/page.tsx).
- [x] Walk-in en `/admin/agenda/nueva` (botón global y "+" por columna): cliente rápido por nombre/teléfono (se liga al historial si el teléfono existe), **sin restricción de antelación ni grilla para el staff**; un choque devuelve mensaje claro, nunca un 500 → [src/lib/admin-appointments.ts](../../src/lib/admin-appointments.ts).
- [x] Mover cita (fecha/hora y/o barbero, validando que el nuevo barbero ofrezca el servicio) revalidada por el constraint anti-solape.
- [x] Cancelar con motivo; `cancelled_by` distingue `customer` (link público) vs `shop` (staff) — nueva migración.
- [x] Bloqueos (`time_off`) pintados en la grilla con ⛔ y motivo. *(El alta de bloqueos vive en Horarios del barbero, a un clic.)*
- [x] Ficha de cliente `/admin/customers/[id]`: historial, contadores (citas, completadas, no-shows) y notas editables; enlazada desde el detalle de cita.
- [x] Tests de integración ([admin-appointments.test.ts](../../tests/db/admin-appointments.test.ts)): walk-in fuera de grilla con buffer correcto, choque tipado, mover con revalidación, estados finales inmutables, atribución de cancelación por ambas vías.

## Criterios de aceptación

- Todo el día de operación de una barbería (reservas online + walk-ins + cambios) se gestiona sin salir de esta vista.
- Los cambios hechos en la agenda se reflejan de inmediato en los slots de la página pública.
