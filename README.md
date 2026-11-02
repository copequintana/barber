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

## Páginas públicas

- **`/`:** la página para dueños de barbería, con capturas de `public/landing/` y el botón "Pide tu demo". Ese botón abre WhatsApp al número de `SALES_WHATSAPP`. Sin esa variable, la página ofrece "Crea tu barbería" si el registro está abierto.
- **`/directorio`:** el buscador de barberías para clientes. Se llega desde "Buscar una barbería", que está en el encabezado, debajo de los botones principales y en el pie.
- **`/socios`:** redirige a `/`, para que sigan sirviendo los links que ya se compartieron con prospectos.

## Alta de barberías

- **Registro cerrado:** por omisión nadie puede crear su cuenta. `/signup` lleva a pedir la demo y la API de registro responde 400. Con `ALLOW_SIGNUP=true` se vuelve a abrir el autoservicio de `/signup` y `/onboarding`.
- **`/platform/alta`:** después de la demo, un vendedor (`users.is_vendor`) o un administrador da de alta la barbería: nombre, link, zona horaria, moneda y nombre y correo del dueño. Al dueño le llega el correo para crear su contraseña, y si no lo usa se le puede reenviar.
- **Quién ve qué:** cada vendedor ve las barberías que él dio de alta. Los administradores ven todas en `/platform`. Cada alta queda en `platform_audit_logs`.
- **Cuentas locales de prueba:** `plataforma@barberdesk.test` (administrador) y `vendedor@barberdesk.test` (vendedor), con la contraseña de desarrollo del seed.
