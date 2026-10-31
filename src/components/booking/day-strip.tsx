"use client";

import { cn } from "@/lib/utils";

const weekdayFmt = new Intl.DateTimeFormat("es", { weekday: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("es", { month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function noon(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function weekdayOf(iso: string): number {
  return noon(iso).getUTCDay();
}

export function addDays(iso: string, days: number): string {
  const d = noon(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DayStrip({
  days,
  selected,
  isClosed,
  onSelect,
}: {
  days: string[];
  selected: string | null;
  isClosed: (iso: string) => boolean;
  onSelect: (iso: string) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,black_88%,transparent)]">
      <div className="flex w-max gap-2 pr-8">
        {days.map((iso) => {
          const closed = isClosed(iso);
          const active = iso === selected;
          const date = noon(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={closed}
              aria-pressed={active}
              aria-label={`${longFmt.format(date)}${closed ? ", cerrado" : ""}`}
              onClick={() => onSelect(iso)}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-xs transition-colors",
                closed
                  ? "closed-day cursor-not-allowed border-transparent text-muted-foreground"
                  : active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "bg-card hover:border-brand/60",
              )}
            >
              <span className="uppercase tracking-wide opacity-80">
                {weekdayFmt.format(date).replace(".", "")}
              </span>
              <span className="font-num text-xl leading-6 font-semibold">
                {date.getUTCDate()}
              </span>
              <span className="uppercase tracking-wide opacity-80">
                {closed ? "Cerrado" : monthFmt.format(date).replace(".", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
