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
      className="rounded border border-black/15 bg-transparent px-1.5 py-0.5 text-xs dark:border-white/20"
    />
  );
}
