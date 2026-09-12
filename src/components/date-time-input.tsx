"use client";

import type { InputHTMLAttributes } from "react";

/**
 * <input type="date"|"datetime-local"|"time"> que abre el selector nativo al
 * hacer clic en cualquier parte del campo (no solo en el pequeño ícono de
 * calendario/reloj) vía showPicker(). En navegadores sin soporte, el input
 * sigue funcionando normal — solo no se abre solo con cualquier clic.
 */
export function DateTimeInput({
  className = "",
  onClick,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      onClick={(e) => {
        try {
          e.currentTarget.showPicker?.();
        } catch {
          // Picker ya abierto, o el navegador no soporta showPicker(): no
          // pasa nada, el input sigue siendo usable de la forma normal.
        }
        onClick?.(e);
      }}
      className={`cursor-pointer transition-colors hover:border-black/30 dark:hover:border-white/35 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:transition-opacity hover:[&::-webkit-calendar-picker-indicator]:opacity-100 ${className}`}
    />
  );
}
