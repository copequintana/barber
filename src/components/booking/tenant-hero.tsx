import { MapPin } from "lucide-react";
import { FallbackImage } from "@/components/fallback-image";
import type { HoursLine, OpenStatus } from "@/lib/hours";
import type { ThemeTraits } from "@/lib/themes";
import { cn } from "@/lib/utils";

type Props = {
  traits: ThemeTraits;
  name: string;
  logoUrl: string | null;
  location: string | null;
  city: string | null;
  schedule: HoursLine[];
  status: OpenStatus | null;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function scheduleText(lines: HoursLine[]) {
  return lines.map((l) => `${l.days} · ${l.hours}`).join(" — ");
}

function Band() {
  return <div aria-hidden className="h-3.5 bg-[image:var(--band-pattern)]" />;
}

function Logo({ url, className }: { url: string; className: string }) {
  return <FallbackImage src={url} alt="" className={cn("shrink-0 object-cover", className)} />;
}

export function TenantHero({ traits, name, logoUrl, location, city, schedule, status }: Props) {
  const eyebrow = `Barbería${city ? ` · ${city}` : ""}`;

  if (traits.hero === "letrero") {
    return (
      <header className="bg-letrero text-letrero-foreground sm:overflow-hidden sm:rounded-b-xl">
        {traits.band ? <Band /> : null}
        <div className="px-5 py-6">
          <div className="flex flex-col items-center gap-3 border-y-4 border-double border-letrero-accent/70 py-5 text-center">
            {logoUrl ? <Logo url={logoUrl} className="size-16 rounded-full ring-2 ring-letrero-accent" /> : null}
            <p className="eyebrow text-letrero-accent">{eyebrow}</p>
            <h1 className="title-xl">{name}</h1>
            {schedule.length > 0 ? (
              <p className="font-num text-xs uppercase tracking-widest text-letrero-muted">
                {scheduleText(schedule)}
              </p>
            ) : null}
            {status ? <p className="eyebrow text-letrero-accent">{status.label}</p> : null}
          </div>
        </div>
        {traits.band ? <Band /> : null}
      </header>
    );
  }

  if (traits.hero === "bloque") {
    return (
      <header className="bg-letrero bg-[image:var(--letrero-pattern)] text-letrero-foreground sm:overflow-hidden sm:rounded-b-xl">
        <div className="flex flex-col gap-3 px-5 pt-7 pb-6">
          {logoUrl ? (
            <Logo url={logoUrl} className="size-16 rounded-lg" />
          ) : (
            <span className="title-md flex size-16 items-center justify-center rounded-lg bg-letrero-accent text-letrero">
              {initials(name)}
            </span>
          )}
          <p className="eyebrow text-letrero-accent">{eyebrow}</p>
          <h1 className="title-xl">{name}</h1>
          {location ? (
            <p className="flex items-center gap-1.5 text-sm text-letrero-muted">
              <MapPin className="size-4 shrink-0" /> {location}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status ? (
              <span className="bg-letrero-accent px-2.5 py-0.5 text-xs font-bold tracking-wide text-letrero uppercase rounded-sm">
                {status.label}
              </span>
            ) : null}
            {schedule.map((l) => (
              <span
                key={l.days}
                className="rounded-sm border border-letrero-muted/60 px-2.5 py-0.5 text-xs text-letrero-foreground"
              >
                {l.days} · {l.hours}
              </span>
            ))}
          </div>
        </div>
        {traits.band ? <Band /> : null}
      </header>
    );
  }

  if (traits.hero === "centrado") {
    return (
      <header className="flex flex-col items-center gap-3 px-6 pt-12 pb-9 text-center">
        {logoUrl ? (
          <Logo url={logoUrl} className="size-16 rounded-full ring-1 ring-ornament" />
        ) : (
          <span className="title-sm flex size-16 items-center justify-center rounded-full ring-1 ring-ornament">
            {initials(name)}
          </span>
        )}
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="title-xl">{name}</h1>
        <span aria-hidden className="my-1 h-px w-16 bg-ornament" />
        {schedule.length > 0 ? (
          <p className="text-sm text-muted-foreground">{scheduleText(schedule)}</p>
        ) : null}
        {status ? (
          <p className={cn("text-xs font-medium tracking-wide uppercase", status.open ? "text-success" : "text-muted-foreground")}>
            {status.label}
          </p>
        ) : null}
      </header>
    );
  }

  if (traits.hero === "marco") {
    return (
      <header className="px-5 pt-6">
        <div className="rounded-xl border-[6px] border-[var(--frame-outer)] bg-card p-1.5 shadow-card">
          <div className="flex flex-col items-center gap-3 rounded-md border-2 border-[var(--frame-inner)] px-4 pt-3 pb-5 text-center">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-num text-sm font-bold text-[var(--frame-outer)]">Nº 1</span>
              {status ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    status.open ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {status.label}
                </span>
              ) : null}
            </div>
            {logoUrl ? (
              <Logo url={logoUrl} className="size-24 rounded-full ring-4 ring-[var(--frame-inner)]" />
            ) : (
              <span className="title-lg flex size-24 items-center justify-center rounded-full bg-brand text-brand-foreground ring-4 ring-[var(--frame-inner)]">
                {initials(name)}
              </span>
            )}
            <h1 className="title-xl">{name}</h1>
            {location ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" /> {location}
              </p>
            ) : null}
            {schedule.length > 0 ? (
              <p className="eyebrow">{scheduleText(schedule)}</p>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  if (traits.hero === "neon") {
    return (
      <header className="flex flex-col items-center gap-4 px-5 pt-10 pb-6 text-center">
        <div className="flex w-full flex-col items-center gap-3 rounded-[2rem] border-2 border-ornament px-5 py-8 shadow-[var(--tube-glow)]">
          {logoUrl ? <Logo url={logoUrl} className="size-14 rounded-full ring-2 ring-ornament" /> : null}
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="title-xl">{name}</h1>
          {status ? (
            <p className={cn("font-num text-sm tracking-wide uppercase", status.open ? "text-success" : "text-brand")}>
              {status.label}
            </p>
          ) : null}
        </div>
        {schedule.length > 0 ? (
          <p className="text-sm text-muted-foreground">{scheduleText(schedule)}</p>
        ) : null}
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-3 border-b bg-card px-5 pt-6 pb-5">
      {logoUrl ? (
        <Logo url={logoUrl} className="size-16 rounded-xl shadow-card" />
      ) : (
        <span className="flex size-16 items-center justify-center rounded-xl bg-brand text-xl font-bold text-brand-foreground">
          {initials(name)}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="title-xl">{name}</h1>
        {location ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" /> {location}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {status ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.open ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {status.label}
          </span>
        ) : null}
        {schedule.map((l) => (
          <span key={l.days} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {l.days} · {l.hours}
          </span>
        ))}
      </div>
    </header>
  );
}
