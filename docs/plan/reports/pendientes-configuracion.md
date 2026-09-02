# Pendientes de configuración (acciones del dueño del proyecto)

> Fecha: 2026-08-29. Todo el código de las fases 0–2 y la consola de plataforma (T20) está terminado y probado. Lo que sigue **no es código**: son cuentas, credenciales y decisiones que solo tú puedes gestionar. Cada punto indica dónde se configura y qué desbloquea.

## 1. Emails reales (Resend) — desbloquea T12 en producción

Hoy los emails funcionan con el "transporte consola" (se imprimen en el log del servidor). Para envío real:

1. Crea una cuenta en [resend.com](https://resend.com) (gratis hasta 3,000 emails/mes).
2. Genera una API key.
3. (Recomendado) Verifica tu dominio en Resend para no enviar desde `onboarding@resend.dev`.
4. En `.env`:
   ```
   RESEND_API_KEY="re_..."
   EMAIL_FROM="BarberDesk <citas@tudominio.com>"
   ```
No hay que tocar código: al detectar la key, todos los envíos (confirmación, cancelación, reprogramación, aviso al staff, recordatorios) salen por Resend.

## 2. WhatsApp (Meta Cloud API) — desbloquea los recordatorios de T13 por WhatsApp

⚠️ **Empieza esto pronto: la aprobación de Meta tarda semanas.** Mientras tanto los recordatorios salen por email (fallback automático).

1. Crea una app en [Meta for Developers](https://developers.facebook.com) con el producto WhatsApp, asociada a tu Meta Business.
2. Registra/verifica el número emisor y obtén el **Phone Number ID**.
3. Genera un **token permanente** de sistema.
4. Crea una plantilla de mensaje (idioma `es_MX`) con **4 variables** en el cuerpo, en este orden: nombre del negocio, servicio+barbero, fecha/hora, link de la cita. Envíala a aprobación.
5. En `.env`:
   ```
   WHATSAPP_TOKEN="..."
   WHATSAPP_PHONE_ID="..."
   WHATSAPP_TEMPLATE="nombre_de_tu_plantilla"
   ```
6. Activa WhatsApp por barbería: `whatsapp_enabled = true` en la tabla `tenants` (la UI de configuración del tenant está en el backlog).

## 3. Login con Google (opcional)

El login de desarrollo (email libre) cubre las pruebas. Para producción:

1. En [Google Cloud Console](https://console.cloud.google.com) crea credenciales OAuth 2.0 (tipo Web).
2. Redirect URI: `https://tudominio.com/api/auth/callback/google`.
3. En `.env`: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. El botón aparece solo.

Alternativa pendiente de decisión: magic link por email (usa la misma cuenta de Resend; pequeño desarrollo adicional).

## 4. Despliegue a producción

Decisiones y pasos cuando quieras salir de local:

1. **Base de datos**: crear un PostgreSQL gestionado (Neon o Supabase). Poner su URL en `DATABASE_URL` (rol de la app) y `MIGRATE_DATABASE_URL` (rol dueño del esquema; en estos proveedores suele ser el mismo usuario y el RLS con `FORCE` ya lo cubre). Aplicar migraciones: `npm run db:migrate`.
2. **Hosting**: Vercel es el camino directo (el plan lo asume). Importar el proyecto, configurar todas las variables de `.env.example`.
3. **Secretos nuevos para producción** (no reutilizar los de dev):
   - `AUTH_SECRET` (genera uno: `npx auth secret`)
   - `CRON_SECRET` (cualquier cadena aleatoria larga)
   - **Nunca** definir `ALLOW_DEV_LOGIN` en producción.
4. **Cron**: programar `GET /api/cron/reminders` cada 15 min (Vercel Cron u otro scheduler) con header `Authorization: Bearer <CRON_SECRET>`. Ejecuta recordatorios y cierre automático de citas.
5. **Subdominios (T16)**: registrar el dominio, crear DNS wildcard `*.tudominio.com` apuntando al hosting, agregar el dominio wildcard en Vercel, y definir `ROOT_DOMAIN="tudominio.com"` y `APP_URL="https://tudominio.com"`. El código ya lo soporta.
6. **Backups**: activar backups automáticos/PITR en el proveedor de BD.
7. `PLATFORM_ADMIN_EMAILS`: dejar solo tus emails reales de super-admin (o marcar `is_platform_admin` en tu usuario y quitar la variable).

## 5. Decisiones pospuestas (se retoman cuando digas)

| Qué | Tarea | Estado |
|---|---|---|
| Cobro de suscripción a las barberías (Stripe Billing) | T18 | ⏸️ Pospuesta por decisión del 2026-08-29 |
| Depósitos/prepago del cliente final (Mercado Pago/Stripe) | T19 | ⏸️ Pospuesta (depende de T18) |
| Dominio propio por barbería | T21 | ⏸️ Pospuesta (requiere despliegue y plan de pagos) |
| Control de versiones (git) | — | Por decisión se trabaja en carpeta local; di "inicializa git" cuando quieras |

## 6. Validación de negocio (criterios de salida del plan)

- **Piloto real**: 1–2 barberías reales operando su agenda una semana completa (criterio de salida de la Fase 1). Requiere que consigas la(s) barbería(s) piloto.
- **Medir no-shows** del piloto con `/admin/reports` (criterio de la Fase 2).

## Backlog menor detectado durante el desarrollo (código, cuando lo pidas)

- Página de configuración del tenant en el panel (branding/logo, ventana de cancelación, toggles de recordatorios y WhatsApp — hoy editables solo por BD).
- Subida de fotos de barberos a un blob storage (hoy: URL externa).
- Magic link por email como método de login.
- Rate limiting con backend compartido (Upstash) si se despliega con múltiples instancias.
