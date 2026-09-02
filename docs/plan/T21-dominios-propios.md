# T21 — Dominios propios por tenant

- **Fase:** 3 — Monetización
- **Estimación:** 2 días
- **Depende de:** T16, T18
- **Estado:** pendiente

## Descripción

Feature premium: la barbería usa su propio dominio (`citas.labarberia.com`) para su página pública. Cierra la Fase 3.

## Subtareas

- [ ] UI en configuración del tenant (gated por plan vía T18): agregar dominio y ver instrucciones de DNS (CNAME).
- [ ] Alta del dominio vía API de Vercel (Domains API) con verificación y SSL automático.
- [ ] Middleware: resolver tenant también por dominio custom; el subdominio sigue funcionando como fallback.
- [ ] Estado del dominio visible (pendiente de DNS / verificado / error) con re-chequeo.
- [ ] Al hacer downgrade de plan, desactivar el dominio custom con aviso previo.

## Criterios de aceptación

- Un tenant premium conecta su dominio siguiendo las instrucciones sin intervención manual del equipo.
- **Criterio de salida de Fase 3:** primer tenant pagando; cobro de depósito de punta a punta en producción.
