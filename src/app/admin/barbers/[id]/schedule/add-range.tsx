"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { DateTimeInput } from "@/components/date-time-input";
import { Button } from "@/components/ui/button";
import { timeFieldClass } from "./field-class";

export function AddRange({
  action,
  weekday,
  dayName,
}: {
  action: (formData: FormData) => Promise<void>;
  weekday: number;
  dayName: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Agregar
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="weekday" value={weekday} />
      <DateTimeInput
        name="start"
        type="time"
        required
        aria-label={`Desde, ${dayName}`}
        defaultValue="10:00"
        className={`${timeFieldClass} w-36`}
      />
      <span className="text-muted-foreground">a</span>
      <DateTimeInput
        name="end"
        type="time"
        required
        aria-label={`Hasta, ${dayName}`}
        defaultValue="14:00"
        className={`${timeFieldClass} w-36`}
      />
      <SubmitButton size="sm" pendingLabel="Agregando…">
        Agregar
      </SubmitButton>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
    </form>
  );
}
