import { readableTextOn } from "@/lib/color";
import { formatMoney } from "@/lib/money";
import { THEMES, type ThemeDefinition } from "@/lib/themes";

const SAMPLE = [
  { name: "Corte clásico", price: 180 },
  { name: "Corte + barba", price: 280 },
];

function MiniHero({ theme, tenantName }: { theme: ThemeDefinition; tenantName: string }) {
  const { hero, band } = theme.traits;
  const bandStrip = band ? <div className="h-2 bg-[image:var(--band-pattern)]" /> : null;

  if (hero === "letrero") {
    return (
      <div className="bg-letrero text-letrero-foreground">
        {bandStrip}
        <div className="px-3 py-3">
          <div className="flex flex-col items-center gap-1 border-y-4 border-double border-letrero-accent/70 py-2 text-center">
            <span className="eyebrow text-[0.6rem] text-letrero-accent">Barbería</span>
            <span className="title-md block w-full truncate">{tenantName}</span>
          </div>
        </div>
        {bandStrip}
      </div>
    );
  }
  if (hero === "bloque") {
    return (
      <div className="bg-letrero bg-[image:var(--letrero-pattern)] text-letrero-foreground">
        <div className="flex flex-col gap-1 px-3 py-3">
          <span className="eyebrow text-[0.6rem] text-letrero-accent">Barbería</span>
          <span className="title-md block w-full truncate">{tenantName}</span>
        </div>
        {bandStrip}
      </div>
    );
  }
  if (hero === "centrado") {
    return (
      <div className="flex flex-col items-center gap-1 px-3 pt-4 pb-3 text-center">
        <span className="eyebrow text-[0.6rem]">Barbería</span>
        <span className="title-md block w-full truncate">{tenantName}</span>
        <span className="mt-1 h-px w-10 bg-ornament" />
      </div>
    );
  }
  if (hero === "marco") {
    return (
      <div className="px-3 pt-3">
        <div className="rounded-lg border-4 border-[var(--frame-outer)] p-1">
          <div className="flex flex-col items-center gap-1 rounded-sm border-2 border-[var(--frame-inner)] px-2 py-2 text-center">
            <span className="font-num self-start text-[0.65rem] font-bold text-[var(--frame-outer)]">Nº 1</span>
            <span className="title-sm block w-full truncate">{tenantName}</span>
          </div>
        </div>
      </div>
    );
  }
  if (hero === "neon") {
    return (
      <div className="px-3 pt-4">
        <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-ornament px-2 py-3 text-center shadow-[var(--tube-glow)]">
          <span className="title-md block w-full truncate">{tenantName}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 border-b bg-card px-3 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
        {tenantName.charAt(0).toUpperCase()}
      </span>
      <span className="title-sm block w-full truncate">{tenantName}</span>
    </div>
  );
}

function Preview({
  theme,
  tenantName,
  brandColor,
  currency,
}: {
  theme: ThemeDefinition;
  tenantName: string;
  brandColor: string | null;
  currency: string;
}) {
  const brand = brandColor
    ? ({
        "--brand": brandColor,
        "--brand-foreground": readableTextOn(brandColor),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      data-theme-preview={theme.id}
      style={brand}
      aria-hidden
      className="pointer-events-none flex flex-col overflow-hidden rounded-lg border text-[0.8rem]"
    >
      <MiniHero theme={theme} tenantName={tenantName} />
      <div className="flex flex-col gap-2 px-3 py-3">
        {SAMPLE.map((s) =>
          theme.traits.priceList === "puntos" ? (
            <div key={s.name} className="flex items-baseline gap-1.5">
              <span className="font-medium">{s.name}</span>
              <span className="leader" />
              <span className="font-num font-semibold">{formatMoney(s.price, currency)}</span>
            </div>
          ) : theme.traits.priceList === "lineas" ? (
            <div key={s.name} className="flex items-baseline justify-between border-b pb-1.5">
              <span className="title-sm text-[0.95em]">{s.name}</span>
              <span className="font-num">{formatMoney(s.price, currency)}</span>
            </div>
          ) : (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-lg border bg-card px-2.5 py-1.5 shadow-card"
            >
              <span className="font-medium">{s.name}</span>
              <span className="font-num font-semibold">{formatMoney(s.price, currency)}</span>
            </div>
          ),
        )}
        <span className="cta-label mt-1 flex h-8 items-center justify-center rounded-lg bg-brand text-[0.85em] text-brand-foreground">
          Reservar cita
        </span>
      </div>
    </div>
  );
}

export function ThemePicker({
  current,
  tenantName,
  brandColor,
  currency,
}: {
  current: string;
  tenantName: string;
  brandColor: string | null;
  currency: string;
}) {
  return (
    <fieldset className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <legend className="sr-only">Tema de tu página</legend>
      {THEMES.map((t) => (
        <label
          key={t.id}
          className="flex min-w-0 cursor-pointer flex-col gap-3 rounded-xl border bg-card p-3 transition-colors has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="theme"
            value={t.id}
            defaultChecked={current === t.id}
            className="sr-only"
          />
          <Preview theme={t} tenantName={tenantName} brandColor={brandColor} currency={currency} />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">{t.description}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
