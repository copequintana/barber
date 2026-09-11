import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/slugs";

/**
 * ResoluciÃ³n de tenant por subdominio (T16).
 *
 * Con ROOT_DOMAIN definido (p. ej. "barberdesk.app"):
 *   la-cueva.barberdesk.app/...  â†’ rewrite interno a /b/la-cueva/...
 *   barberdesk.app/b/la-cueva/.. â†’ redirect 301 al subdominio
 * Sin ROOT_DOMAIN (desarrollo local sin wildcard DNS) no hace nada y la
 * resoluciÃ³n por slug en la ruta sigue funcionando.
 */

export function proxy(request: NextRequest) {
  const root = process.env.ROOT_DOMAIN?.toLowerCase();
  if (!root) return NextResponse.next();

  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  const path = request.nextUrl.pathname;

  // Dominio raÃ­z: los links viejos /b/<slug>/... redirigen al subdominio
  if (host === root || host === `www.${root}`) {
    const m = /^\/b\/([^/]+)(\/.*)?$/.exec(path);
    if (m && SLUG_RE.test(m[1]) && !RESERVED_SLUGS.has(m[1])) {
      const url = new URL(request.url);
      url.host = `${m[1]}.${root}`;
      url.pathname = m[2] ?? "/";
      return NextResponse.redirect(url, 301);
    }
    return NextResponse.next();
  }

  // Subdominio de tenant â†’ rewrite interno a la ruta /b/<slug>
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (
      sub &&
      !sub.includes(".") &&
      SLUG_RE.test(sub) &&
      !RESERVED_SLUGS.has(sub)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/b/${sub}${path === "/" ? "" : path}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Solo pÃ¡ginas: excluye estÃ¡ticos, assets y la API
  matcher: [
    "/((?!_next|api/|favicon.ico|icon.svg|icon.png|logo-512.png|logo-mark.png|manifest.webmanifest).*)",
  ],
};
