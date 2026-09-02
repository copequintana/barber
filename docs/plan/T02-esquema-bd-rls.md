# T02 — Esquema de BD, RLS y constraint anti-solape

- **Fase:** 0 — Fundaciones
- **Estimación:** 3–4 días
- **Depende de:** T01
- **Estado:** completada

## Descripción

Modelar el esquema completo en Prisma y agregar, vía migraciones SQL manuales, lo que Prisma no expresa: políticas de Row-Level Security por `tenant_id` y el constraint de exclusión que previene la doble reserva. Esta es la pieza más crítica del sistema.

## Subtareas

- [x] Esquema Prisma: `tenants`, `users`, `memberships`, `barbers`, `services`, `barber_services`, `working_hours`, `time_off`, `customers`, `appointments`, `notifications` → [prisma/schema.prisma](../../prisma/schema.prisma).
- [x] Migración SQL: RLS con policy `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid` (deny por defecto) + `FORCE ROW LEVEL SECURITY` → [migración init](../../prisma/migrations/20260829015152_init/migration.sql). *Nota: la app se conecta con rol no-superusuario (`scripts/dev-db-init.sql`) porque Postgres exime a superusuarios de RLS.*
- [x] Migración SQL: `btree_gist` + constraint `appointments_no_overlap` (EXCLUDE, parcial sobre `pending`/`confirmed`) + checks de sanidad en rangos.
- [x] Helper `withTenant(tenantId, fn)` con `set_config(..., true)` local a la transacción → [src/lib/db.ts](../../src/lib/db.ts).
- [x] Seed de desarrollo: tenants `la-cueva` y `el-patron` con barberos, servicios y horarios → `npm run db:seed`.
- [x] Tests de aislamiento (lectura, update, delete, insert cruzado, sin contexto) → [tests/db/tenancy.test.ts](../../tests/db/tenancy.test.ts).
- [x] Test de carrera: 2 reservas concurrentes al mismo slot — exactamente una gana; canceladas liberan horario; citas contiguas no chocan.

## Criterios de aceptación

- Los tests de aislamiento RLS y de carrera pasan en CI.
- `prisma migrate deploy` reproduce el esquema completo (incl. SQL manual) en una BD vacía.
