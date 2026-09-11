"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";

const NEXT: Record<Mode, Mode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON: Record<Mode, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

const LABEL: Record<Mode, string> = {
  system: "Tema: automático (según tu sistema). Clic para claro.",
  light: "Tema: claro. Clic para oscuro.",
  dark: "Tema: oscuro. Clic para automático.",
};

const noop = () => () => {};

/**
 * Ciclo system → light → dark → system. Antes de montar en el cliente no se
 * conoce la preferencia guardada, así que se asume "system" (evita mismatch
 * de hidratación); el ícono puede ajustarse un frame después del montaje.
 * useSyncExternalStore (snapshot de servidor "false") es la forma correcta
 * de detectar "ya estamos en cliente" sin setState dentro de un efecto.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const current: Mode = (mounted ? (theme as Mode) : "system") ?? "system";
  const Icon = ICON[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[current])}
      title={LABEL[current]}
      aria-label={LABEL[current]}
      className="rounded-md border border-black/15 p-1.5 opacity-70 hover:opacity-100 dark:border-white/20"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
