"use client";

import { useRouter } from "next/navigation";
import { DateTimeInput } from "@/components/date-time-input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
      aria-label="Ir a una fecha"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (!e.target.value) return;
        const params = new URLSearchParams({ view, date: e.target.value });
        if (barberId) params.set("barber", barberId);
        router.push(`/admin/agenda?${params}`);
      }}
      className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
    <NativeSelect
      aria-label="Barbero"
      defaultValue={defaultValue}
      onChange={(e) => {
        const params = new URLSearchParams({
          view: "week",
          date: dateISO,
          barber: e.target.value,
        });
        router.push(`/admin/agenda?${params}`);
      }}
    >
      {barbers.map((b) => (
        <NativeSelectOption key={b.id} value={b.id}>
          {b.displayName}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
