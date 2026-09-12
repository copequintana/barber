"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FallbackImage } from "@/components/fallback-image";

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
    return { status: "error", message: "No se pudo cargar el directorio." };
  }
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
    return <p className="text-sm opacity-70">Buscando barberías…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm opacity-70">{state.message}</p>;
  }
  if (state.results.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Todavía no hay barberías con ubicación registrada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!state.sorted ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No pudimos usar tu ubicación, así que están en orden alfabético.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {state.results.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/b/${t.slug}`}
              className="flex items-center gap-3 rounded-lg border border-black/10 p-3 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            >
              {t.logoUrl ? (
                <FallbackImage
                  src={t.logoUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
                />
              ) : (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: t.brandColor ?? "var(--accent)" }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.name}</span>
                  {t.distanceKm != null ? (
                    <span className="shrink-0 text-sm tabular-nums opacity-70">
                      {t.distanceKm < 1
                        ? `${Math.round(t.distanceKm * 1000)} m`
                        : `${t.distanceKm.toFixed(1)} km`}
                    </span>
                  ) : null}
                </span>
                {t.address ? (
                  <span className="block truncate text-sm opacity-70">
                    {t.address}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
