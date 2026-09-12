"use client";

import { useRouter } from "next/navigation";
import { DateTimeInput } from "@/components/date-time-input";

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20";

/**
 * Selector de fecha que navega solo al elegir un día — reemplaza el
 * input + botón "Ir" (pasaba desapercibido, casi invisible sobre el fondo).
 */
export function DateJumpInput({
  defaultValue,
  view,
  barberId,
}: {
  defaultValue: string;
  view: "day" | "week";
  barberId?: string;
}) {
  const router = useRouter();
  return (
    <DateTimeInput
      type="date"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (!e.target.value) return;
        const params = new URLSearchParams({ view, date: e.target.value });
        if (barberId) params.set("barber", barberId);
        router.push(`/admin/agenda?${params}`);
      }}
      className={inputClass}
    />
  );
}

/** Mismo motivo: el selector de barbero de la vista semana navegaba solo
 * con un botón "Ver" igual de discreto. */
export function BarberJumpSelect({
  barbers,
  defaultValue,
  dateISO,
}: {
  barbers: { id: string; displayName: string }[];
  defaultValue?: string;
  dateISO: string;
}) {
  const router = useRouter();
  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => {
        const params = new URLSearchParams({
          view: "week",
          date: dateISO,
          barber: e.target.value,
        });
        router.push(`/admin/agenda?${params}`);
      }}
      className={inputClass}
    >
      {barbers.map((b) => (
        <option key={b.id} value={b.id}>
          {b.displayName}
        </option>
      ))}
    </select>
  );
}
