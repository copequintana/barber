"use client";

import { Ban } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { DateTimeInput } from "@/components/date-time-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { blockSlot } from "./actions";

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 480, label: "Todo el día (8 h)" },
];

export function BlockSlotSheet({
  dateISO,
  defaultStart,
}: {
  dateISO: string;
  defaultStart: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="w-full bg-card">
          <Ban /> Bloquear un hueco
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Bloquear un hueco</SheetTitle>
          <SheetDescription>
            Nadie podrá reservar contigo en ese horario.
          </SheetDescription>
        </SheetHeader>
        <form action={blockSlot} className="flex flex-col gap-4 px-4">
          <input type="hidden" name="date" value={dateISO} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startLocal">Desde</Label>
            <DateTimeInput
              id="startLocal"
              name="startLocal"
              type="datetime-local"
              required
              defaultValue={defaultStart}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minutes">Duración</Label>
            <NativeSelect id="minutes" name="minutes" defaultValue={30} className="w-full">
              {DURATIONS.map((d) => (
                <NativeSelectOption key={d.value} value={d.value}>
                  {d.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input id="reason" name="reason" maxLength={120} placeholder="Comida, trámite, cita médica…" />
          </div>
          <SubmitButton size="lg" pendingLabel="Bloqueando…">
            Bloquear
          </SubmitButton>
        </form>
      </SheetContent>
    </Sheet>
  );
}
