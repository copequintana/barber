"use client";

/** Se oculta sola al imprimir (print:hidden) — el resto de la página ya
 * queda lista para imprimirse tal cual con Ctrl+P sin este botón de más. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-[var(--brand)] px-5 py-2.5 font-medium text-white print:hidden"
    >
      Imprimir
    </button>
  );
}
