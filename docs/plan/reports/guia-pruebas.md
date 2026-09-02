# Guía de pruebas manuales por escenarios

> Instructivo paso a paso para probar BarberDesk en local, escenario por escenario. Cada uno indica el objetivo, los pasos y el **resultado esperado**. Están ordenados para que el estado que deja uno sirva al siguiente, pero cada escenario dice qué necesita.

## Preparación (una sola vez)

1. Arranca la base de datos (si el contenedor ya existe basta el `start`):
   ```
   docker start barberdesk-pg
   ```
   (Primera vez: ver el bloque completo en el [README](../../../README.md) — `docker run…`, `npm run db:migrate`, `npm run db:init`, `npm run db:seed`.)
2. Arranca la app: `npm run dev` → http://localhost:3000
3. Datos del seed disponibles:
   - Barbería **la-cueva** (dueño: `dueno@lacueva.test`, barberos Manuel y Ricardo, 3 servicios, abre martes a sábado 10:00–14:00 y 16:00–20:00, zona CDMX).
   - Barbería **el-patron** (dueño: `dueno@elpatron.test`, barbero Andrés).
4. El login de desarrollo acepta **cualquier email** (crea el usuario si no existe). Los emails del sistema se imprimen en la terminal donde corre `npm run dev` con el prefijo `[email:consola]`.

> Suites automáticas equivalentes: `npm run test` (89 tests) y `npm run test:e2e` (flujo completo en navegador). Esta guía es para probarlo tú, a mano.

---

## Escenario 1 — Alta de una barbería nueva (onboarding)

**Objetivo:** de cero a barbería creada.

1. Abre http://localhost:3000 → **Entrar**.
2. Escribe un email nuevo, p. ej. `dueno@mibarberia.test` → Entrar.
3. Como no tienes barberías, te lleva a **Crear barbería**.
4. Nombre: "Mi Barbería de Prueba" — observa que el slug se autogenera (`mi-barberia-de-prueba`). Elige zona horaria y moneda → **Crear barbería**.
5. ✅ **Esperado:** entras al panel admin con contadores en cero. En "Ver página pública ↗" se abre `/b/mi-barberia-de-prueba` con el catálogo vacío.
6. Prueba de validación: repite el alta con el slug `admin` → ✅ debe rechazarlo ("identificador reservado"); con un slug ya usado (`la-cueva`) → ✅ "ya está en uso".

## Escenario 2 — Configurar barberos, servicios y horarios

**Objetivo:** dejar la barbería nueva lista para recibir reservas. (Continúa del escenario 1.)

1. **Barberos** → agrega "Carlos". En su ficha: escribe una bio y guarda.
2. **Servicios** → agrega "Corte" (30 min, precio 200). Entra al servicio y ponle 5 min de buffer → Guardar.
3. Vuelve a la ficha de Carlos → sección **Servicios que realiza**: marca "Corte" y ponle precio propio 250 → Guardar servicios.
4. En la ficha de Carlos → **Horarios y bloqueos**: agrega franja del lunes 10:00–14:00 y usa **Copiar** lunes → martes a viernes.
5. Agrega un **bloqueo** mañana de 12:00 a 13:00 con motivo "comida".
6. ✅ **Esperado:** la página pública ahora muestra "Corte · desde $250" y a Carlos. Nota: un servicio sin barbero asignado **no** aparece en la página pública (el listado admin lo marca "Sin barbero: no visible").

## Escenario 3 — Reserva del cliente final (flujo público)

**Objetivo:** el flujo de 4 pasos, sin cuenta. (Sirve cualquier barbería configurada; con el seed usa `/b/la-cueva`.)

1. En una **ventana de incógnito** (así compruebas que no pide cuenta) abre `/b/la-cueva` → **Reservar cita**.
2. Paso 1: elige "Corte clásico". Paso 2: elige **Cualquier barbero**.
3. Paso 3: la tira de fechas — elige un día abierto (martes a sábado) y un horario. Verifica que los horarios respetan la antelación mínima (hoy no aparecen horas ya pasadas ni la próxima hora).
4. Paso 4: nombre y teléfono; pon también un email de prueba → **Confirmar reserva**.
5. ✅ **Esperado:** llegas a la página de la cita con "¡Cita reservada!", el estado Confirmada, botón "Agregar a mi calendario (.ics)" y las opciones Cambiar horario / Cancelar. **Guarda esta URL** (es el link permanente del cliente).
6. En la terminal del servidor: ✅ aparecen dos `[email:consola]` — la confirmación al cliente y "Nueva reserva" al dueño.
7. Descarga el `.ics` y ábrelo: ✅ evento con servicio, barbería y hora correcta.

## Escenario 4 — Dos clientes compiten por el mismo horario

**Objetivo:** ver la protección anti doble reserva en acción.

1. Abre `/b/la-cueva/reservar` en **dos pestañas** a la vez.
2. En ambas: mismo servicio, mismo **barbero concreto** (p. ej. Manuel), mismo día y **mismo horario**. Llena los datos en las dos (teléfonos distintos).
3. Confirma la pestaña A → ✅ reserva creada.
4. Confirma la pestaña B → ✅ **Esperado:** banner "Ese horario acaba de ocuparse 😞" con botón "Ver horarios disponibles"; al pulsarlo, la lista ya **no** incluye ese horario; eliges otro y confirmas bien.
5. Variante: repite con "Cualquier barbero" en ambas → ✅ **las dos** reservas entran, cada una con un barbero distinto.

## Escenario 5 — El cliente cancela y reprograma desde su link

**Objetivo:** self-service completo con el link de la cita. (Usa la URL guardada del escenario 3.)

1. Abre el link de la cita → **Cambiar horario**.
2. Elige otro día/horario (mismo barbero) → Confirmar nuevo horario.
3. ✅ **Esperado:** "¡Listo! Tu cita quedó en el nuevo horario", el link es **el mismo**, y en la terminal sale el email de reprogramación.
4. Ahora **Cancelar mi cita** → ✅ "Tu cita fue cancelada" + email de cancelación en la terminal.
5. Regresa a reservar: ✅ el horario liberado vuelve a estar disponible.
6. Política de plazo: crea una cita para **dentro de menos de 2 horas** desde la agenda admin (escenario 6) y abre su link → ✅ ya no ofrece cancelar/reprogramar; explica que contactes a la barbería.

## Escenario 6 — Operación diaria en la agenda admin

**Objetivo:** walk-ins, mover, cancelar con motivo y desenlaces.

1. Entra como `dueno@lacueva.test` → **Agenda**. Navega al día de una cita existente: ✅ grilla con columnas por barbero, franjas laborales claras, citas coloreadas y bloqueos con ⛔. Prueba la vista **Semana** (un barbero con selector).
2. **Walk-in:** "+ Nueva cita" → barbero, servicio, ahora mismo (nota que al staff no le aplica la antelación), cliente "Juan Walk-in" con un teléfono → Crear. ✅ aparece en la grilla al instante.
3. Choque: intenta crear otra cita encima de esa → ✅ mensaje "Ese horario choca…", nunca un error feo.
4. Click en una cita → detalle: **Mover** a otra hora u otro barbero → ✅ se refleja en la grilla; si la mueves encima de otra → mensaje de choque y la cita queda donde estaba.
5. **Cancelar** con motivo "cliente avisó" → ✅ en el detalle queda "canceló la barbería: cliente avisó" (y el email sale si el cliente tenía email).
6. En otra cita: **✓ Completada** / **No asistió** → ✅ cambia el color en la grilla.
7. Desde el detalle, click en el nombre del cliente → ✅ ficha con historial, contadores (citas/completadas/no-shows) y notas editables.

## Escenario 7 — Panel del barbero (móvil)

**Objetivo:** el día a día del barbero desde su teléfono.

1. Como admin: ficha de Manuel → **Cuenta de acceso** → vincula `manuel@lacueva.test`.
2. Cierra sesión y entra con `manuel@lacueva.test` → ✅ te lleva a **Mi día** (elige La Cueva si pregunta).
3. Abre las DevTools del navegador en modo móvil (o pruébalo desde el teléfono en `http://IP-de-tu-PC:3000`). Navega al día con citas → ✅ lista cronológica con cliente, servicio, precio y botones **📞 Llamar / WhatsApp**.
4. Marca una cita **✓ Listo** y otra **No vino** → ✅ cambian de chip.
5. **⛔ Bloquear un hueco**: hoy, 30 min, motivo "pausa" → ✅ aparece en su lista y ese horario desaparece de la página pública.
6. Seguridad: como Manuel intenta abrir `/admin` → ✅ rebota a `/barber`. (Y en la BD/tests: no puede tocar citas de Ricardo.)
7. PWA: en Chrome, menú → "Instalar app" → ✅ se instala con el ícono de poste de barbero y abre en `/barber`.

## Escenario 8 — Recordatorios y cierre automático (cron)

**Objetivo:** ver el cron actuar sin esperar 24 horas.

1. Crea desde la agenda admin una cita para **mañana a media mañana** con un cliente que tenga email (usa la ficha del cliente para agregárselo si no tiene).
2. Corre el cron a mano:
   ```
   npm run cron
   ```
3. ✅ **Esperado:** la terminal muestra `Cron OK: {...,"remindersSent":1,...}` y el `[email:consola]` del recordatorio (la cita entra en la ventana de 24 h).
4. Corre `npm run cron` otra vez → ✅ `remindersSent: 0` (idempotente: no duplica).
5. Reprograma esa cita desde su link (escenario 5) y vuelve a correr el cron → ✅ el recordatorio se envía de nuevo con el nuevo horario.
6. Cierre automático: las citas confirmadas cuya hora pasó hace más de 24 h se marcan `completed` en la misma corrida (el conteo sale en `autoCompleted`).

## Escenario 9 — Reportes y export

**Objetivo:** métricas del negocio.

1. Como dueño → **Reportes**. Prueba los atajos (Este mes / Mes pasado / Últimos 30 días) y un rango personalizado que cubra tus pruebas.
2. ✅ **Esperado:** tarjetas (citas, completadas, ingresos, tasa de no-show) con comparativa vs el período anterior; canceladas desglosadas por quién canceló; tabla de **ocupación por barbero** (horas reservadas vs disponibles) y servicios más pedidos.
3. Coteja un número: los "no asistió" que marcaste en los escenarios 6–7 deben cuadrar con la tasa de no-show.
4. **Exportar CSV** → ✅ descarga un CSV que abre bien en Excel (acentos correctos) con una fila por cita del rango.

## Escenario 10 — Aislamiento multi-tenant

**Objetivo:** confirmar que una barbería jamás ve datos de otra.

1. Entra como `dueno@elpatron.test` → panel de El Patrón.
2. ✅ **Esperado:** en Barberos/Servicios/Agenda/Reportes solo hay datos de El Patrón (Andrés; nada de Manuel/Ricardo ni sus citas).
3. Con la sesión de El Patrón, pega en la URL el id de una cita de La Cueva (`/admin/agenda/cita/<id>`; toma un id real de la agenda de La Cueva en otra sesión) → ✅ **404**, aunque el id sea válido: RLS no le entrega la fila.
4. Un mismo usuario en dos barberías: vincula tu email como barbero en una y dueño en otra → ✅ el selector de barberías aparece tras el login y cada rol te lleva a su panel.

## Escenario 11 — Consola de plataforma (super-admin)

**Objetivo:** operación del SaaS y suspensión.

1. Entra como `dueno@lacueva.test` (está en `PLATFORM_ADMIN_EMAILS` del `.env` de dev) y abre `/platform`.
2. ✅ **Esperado:** métricas globales y el listado de todas las barberías con su actividad de 30 días.
3. Entra al detalle de El Patrón → ✅ banner de "solo lectura", equipo, últimas reservas y la **auditoría** ya registró tu acceso (`view_tenant`).
4. **Suspender** El Patrón. En incógnito abre `/b/el-patron/reservar` → ✅ "no está aceptando reservas en línea" (la página pública sigue visible). El panel del dueño muestra el banner de suspensión.
5. **Reactivar** → ✅ el flujo de reserva vuelve. En la auditoría quedan `suspend` y `reactivate`.
6. Control de acceso: con un usuario normal abre `/platform` → ✅ redirige fuera.

## Escenario 12 — Subdominios (opcional, simulando DNS local)

**Objetivo:** probar la resolución por subdominio sin dominio real. `lvh.me` resuelve a 127.0.0.1 públicamente.

1. Detén el dev server y arráncalo con la variable:
   ```powershell
   $env:ROOT_DOMAIN = "lvh.me"; npm run dev
   ```
2. Abre `http://la-cueva.lvh.me:3000` → ✅ la página pública de La Cueva, en la raíz del subdominio.
3. Abre `http://lvh.me:3000/b/la-cueva` → ✅ redirige (301) a `http://la-cueva.lvh.me:3000/`.
4. `http://no-existe.lvh.me:3000` → ✅ 404 de "barbería no encontrada"; `http://admin.lvh.me:3000` → ✅ no se trata como barbería (subdominio reservado).
5. Al terminar, cierra esa terminal (o quita la variable) para volver al modo normal.

---

## Si algo falla

- Revisa la terminal de `npm run dev`: los errores del servidor y los `[email:consola]` salen ahí.
- Estado de la BD: `docker ps` (contenedor `barberdesk-pg` debe estar "Up") y `npm run db:migrate` si cambiaste de rama de trabajo.
- Para volver a un estado limpio de datos de prueba: borra las barberías creadas desde `/platform` no es posible aún (borrado de tenants no está en la consola) — hazlo por SQL o recrea la BD (`docker rm -f barberdesk-pg` y repite la preparación del README).
