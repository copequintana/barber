# Video promocional BarberDesk

Video vertical de 30 segundos (1080×1920, 30 fps) para redes y WhatsApp.

## Archivos

- `promo.html`: el video completo, animado con HTML. Cada escena y su tiempo están en `SCENES`.
- `capturas/`: las pantallas de la app que salen en el video.
- `render.mjs`: genera el `.mp4` cuadro por cuadro con el navegador y ffmpeg.
- `capturas.mjs`: vuelve a tomar las capturas de la app local, por si cambia el diseño.
- `barberdesk-promo-<dominio>.mp4`: los videos ya generados.

## Cambiar el dominio

El dominio sale en la barra del navegador (escena de la agenda) y en el botón del cierre. No está escrito en el HTML: se pasa al generar.

```
node marketing/video/render.mjs barberdesk.net
```

Se corre desde la raíz del proyecto y deja `marketing/video/barberdesk-promo-barberdesk.net.mp4`. Tarda unos minutos.

Para revisar escenas sueltas sin generar todo, pasa los segundos que quieres ver; deja las imágenes en `marketing/video/preview/`:

```
node marketing/video/render.mjs barberdesk.net preview 18.5,29.9
```

## Requisitos

- `npm install` hecho en el proyecto (usa `playwright-core` y `pg` del proyecto).
- Microsoft Edge instalado.
- ffmpeg en `C:\ffmpeg\bin\ffmpeg.exe`, en el PATH, o en la variable `FFMPEG`.

## Volver a tomar las capturas

Solo hace falta si cambia el diseño de la app. Necesita la base local con los datos de prueba (`npm run db:seed`), el servidor en `http://localhost:3000` y una cita confirmada a futuro en La Cueva (`scripts/dev-make-booking.ts`).

```
node marketing/video/capturas.mjs
```

Cambia temporalmente el estilo de La Cueva para fotografiar los 8 estilos y al final lo deja en Moderno. Solo corre contra la base y el servidor locales.
