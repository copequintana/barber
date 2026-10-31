"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, MapPin, Store } from "lucide-react";
import { FallbackImage } from "@/components/fallback-image";
import { Notice } from "@/components/notice";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { readableTextOn } from "@/lib/color";

type Result = {
  slug: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  distanceKm: number | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "ok"; results: Result[]; sorted: boolean }
  | { status: "error"; message: string };

function InitialAvatar({ name, color }: { name: string; color: string | null }) {
  return (
    <span
      className="flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-semibold"
      style={{
        backgroundColor: color ?? "var(--primary)",
        color: color ? readableTextOn(color) : "var(--primary-foreground)",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

async function fetchNearby(coords?: GeolocationCoordinates): Promise<LoadState> {
  const params = coords
    ? new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude) })
    : new URLSearchParams();
  try {
    const res = await fetch(`/api/nearby?${params}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return { status: "ok", results: data.results, sorted: Boolean(coords) };
  } catch {
    return { status: "error", message: "No se pudo cargar el directorio. Recarga la página para intentar de nuevo." };
  }
}

function distanceLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function DirectoryList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!navigator.geolocation) {
      void fetchNearby().then(setState);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void fetchNearby(pos.coords).then(setState),
      () => void fetchNearby().then(setState),
      { timeout: 8000 },
    );
  }, []);

  if (state.status === "loading") {
    return (
      <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Buscando barberías">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card">
            <Skeleton className="size-14 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (state.status === "error") {
    return <Notice tone="danger">{state.message}</Notice>;
  }
  if (state.results.length === 0) {
    return (
      <Empty className="rounded-xl border border-dashed bg-card/60">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store />
          </EmptyMedia>
          <EmptyTitle>Todavía no hay barberías aquí</EmptyTitle>
          <EmptyDescription>
            En cuanto una barbería registre su ubicación, aparecerá en esta lista.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!state.sorted ? (
        <Notice tone="warning">
          No pudimos usar tu ubicación, así que están en orden alfabético.
        </Notice>
      ) : null}
      <ul className="flex flex-col gap-3">
        {state.results.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/b/${t.slug}`}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
            >
              {t.logoUrl ? (
                <FallbackImage
                  src={t.logoUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-xl object-cover"
                  fallback={<InitialAvatar name={t.name} color={t.brandColor} />}
                />
              ) : (
                <InitialAvatar name={t.name} color={t.brandColor} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                {t.address ? (
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{t.address}</span>
                  </span>
                ) : null}
              </span>
              {t.distanceKm != null ? (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {distanceLabel(t.distanceKm)}
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
