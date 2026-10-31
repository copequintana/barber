"use client";

/** Se oculta sola al imprimir (print:hidden) — el resto de la página ya
 * queda lista para imprimirse tal cual con Ctrl+P sin este botón de más. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cta-label rounded-lg bg-brand px-6 py-2.5 text-brand-foreground print:hidden"
    >
      Imprimir
    </button>
  );
}
