"use client";

import { useState } from "react";

/**
 * <img> que si la URL falla (link roto, servicio caído, link de "compartir"
 * de Drive que no es la imagen directa, etc.) muestra `fallback` en vez del
 * ícono de imagen rota del navegador — o nada, si no se pasa `fallback`. Las
 * URLs (logo/portada de tenant) son arbitrarias y elegidas por el dueño, por
 * eso <img> plano en vez de next/image (no se puede preconfigurar el
 * dominio de antemano).
 */
export function FallbackImage({
  src,
  alt,
  className,
  fallback = null,
}: {
  src: string;
  alt: string;
  className: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
