"use client";

import { useState } from "react";

/**
 * <img> que se oculta a sí misma si la URL falla (link roto, servicio caído,
 * link de "compartir" de Drive que no es la imagen directa, etc.) en vez de
 * mostrar el ícono de imagen rota del navegador. Las URLs (logo/portada de
 * tenant) son arbitrarias y elegidas por el dueño, por eso <img> plano en
 * vez de next/image (no se puede preconfigurar el dominio de antemano).
 */
export function FallbackImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
