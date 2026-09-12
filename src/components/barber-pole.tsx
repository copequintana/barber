/**
 * Poste de barbería animado — franjas diagonales con puro CSS (ver la
 * animación en globals.css), sin imágenes ni librerías. Decorativo: oculto
 * a lectores de pantalla.
 */
export function BarberPole({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`barber-pole rounded-full border-2 border-black/15 shadow-inner dark:border-white/20 ${className}`}
    />
  );
}
