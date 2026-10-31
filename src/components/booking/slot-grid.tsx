"use client";

import { cn } from "@/lib/utils";

type Slot = { start: string };

const GROUPS = [
  { label: "Mañana", from: 0, to: 12 },
  { label: "Tarde", from: 12, to: 19 },
  { label: "Noche", from: 19, to: 24 },
];

export function SlotGrid({
  slots,
  selected,
  onSelect,
  formatTime,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (start: string) => void;
  formatTime: (start: string) => string;
}) {
  const groups = GROUPS.map((g) => ({
    ...g,
    slots: slots.filter((s) => {
      const hour = Number(formatTime(s.start).slice(0, 2));
      return hour >= g.from && hour < g.to;
    }),
  })).filter((g) => g.slots.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-2">
          <h3 className="eyebrow">{g.label}</h3>
          <div className="grid grid-cols-4 gap-2">
            {g.slots.map((s) => {
              const active = s.start === selected;
              return (
                <button
                  key={s.start}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(s.start)}
                  className={cn(
                    "font-num rounded-lg border py-2.5 text-sm transition-colors",
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "bg-card hover:border-brand/60",
                  )}
                >
                  {formatTime(s.start)}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
