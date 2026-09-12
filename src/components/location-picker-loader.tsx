"use client";

import dynamic from "next/dynamic";

// next/dynamic con ssr:false solo se puede llamar desde un Client Component
// — de ahí este archivo intermedio: la Settings page (Server Component)
// importa este loader, no LocationPicker directo.
export const LocationPickerLoader = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md border border-black/15 bg-black/5 dark:border-white/20 dark:bg-white/5" />
    ),
  },
);
