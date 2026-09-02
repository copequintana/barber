# T17 — Reportes básicos

- **Fase:** 2 — Retención y operación diaria
- **Estimación:** 2–3 días
- **Depende de:** T11, T14
- **Estado:** completada

## Descripción

Dashboard de reportes del tenant con las métricas que le importan al dueño, calculadas sobre citas en estados finales. Cierra la Fase 2.

## Subtareas

- [x] `/admin/reports` con rango en timezone del tenant: atajos (este mes, mes pasado, últimos 30 días) + fechas personalizadas.
- [x] Métricas: citas por estado (canceladas desglosadas por quién canceló), ingresos de completadas, **ocupación por barbero** (reservado / disponible según horarios del rango menos bloqueos), servicios top con ingresos, tasa de no-show (null sin citas terminadas, no un 0 engañoso).
- [x] Comparativa contra el período anterior de la misma longitud (deltas en las tarjetas).
- [x] Export CSV (`/admin/reports/csv`, con BOM para Excel), protegido por rol.
- [x] Cálculo en función pura `computeReport` → [src/lib/reports.ts](../../src/lib/reports.ts), verificado con seed conocido en [tests/unit/reports.test.ts](../../tests/unit/reports.test.ts) (6 tests, incl. bloqueos que pisan franjas parcialmente).

## Criterios de aceptación

- Los números cuadran con la agenda (verificado con seed conocido en tests).
- **Criterio de salida de Fase 2:** tasa de no-show medible y en descenso; barberos usando su panel a diario.
