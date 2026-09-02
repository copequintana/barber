# BarberDesk

Sistema web de citas para barberías, multi-tenant y multi-barbero.

- **Plan de implementación:** [docs/plan-implementacion.md](docs/plan-implementacion.md)
- **Tareas y estado:** [docs/plan/README.md](docs/plan/README.md)

## Stack

Next.js 16 (App Router, TypeScript) · PostgreSQL 16 · Prisma 7 (driver adapter pg) · Vitest

## Desarrollo local

Requisitos: Node 22+, Docker.

```bash
# 1. Dependencias
npm install

# 2. Base de datos (una sola vez)
docker run -d --name barberdesk-pg \
  -e POSTGRES_USER=barberdesk -e POSTGRES_PASSWORD=barberdesk \
  -e POSTGRES_DB=barberdesk -p 5433:5432 postgres:16
cp .env.example .env
npm run db:migrate   # aplica migraciones (incluye RLS y constraint anti-solape)
npm run db:init      # crea el rol de app sin privilegios (RLS activo)
npm run db:seed      # 2 tenants de ejemplo: la-cueva y el-patron

# 3. Correr
npm run dev          # http://localhost:3000
npm run test         # unitarias + integración (RLS, anti doble reserva, motor de slots)
npm run test:e2e     # Playwright: flujo de reserva completo (desktop y móvil)
```

Si el contenedor ya existe: `docker start barberdesk-pg`.

## Arquitectura (resumen)

- **Multi-tenancy:** BD compartida con `tenant_id` + Row-Level Security. Todo acceso a tablas de negocio pasa por `withTenant()` ([src/lib/db.ts](src/lib/db.ts)); fuera de ese contexto RLS no devuelve filas. La app se conecta con un rol **no** superusuario (los superusuarios ignoran RLS) y las migraciones con el rol dueño (`MIGRATE_DATABASE_URL`).
- **Anti doble reserva:** constraint `EXCLUDE USING gist` sobre `(barber_id, tstzrange(starts_at, ends_at))` en `appointments` — la BD garantiza que no existan dos citas activas solapadas del mismo barbero.
- **Zonas horarias:** todo en UTC (`timestamptz`); los horarios de trabajo se guardan como minutos locales + día de semana y se convierten en los bordes.
