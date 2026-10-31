"use client";

import { useRouter } from "next/navigation";
import { DateTimeInput } from "@/components/date-time-input";

/** Selector de fecha que navega solo al elegir un día (sin botón "Ir"). */
export function DateJumpInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  return (
    <DateTimeInput
      type="date"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (!e.target.value) return;
        router.push(`/barber?date=${e.target.value}`);
      }}
      aria-label="Ir a otra fecha"
      className="h-8 rounded-lg border border-input bg-card px-2 text-sm"
    />
  );
}
