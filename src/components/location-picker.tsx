"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "@/lib/geo";

// El empaquetador de Next.js rompe las rutas del ícono default de Leaflet
// (busca los PNG donde no están); apuntar al CDN del propio paquete evita
// pelear con eso en vez de intentar re-empaquetar los PNG a mano.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Mapa (Leaflet + OpenStreetMap, sin API key ni costo) para que el dueño
 * marque la ubicación de su barbería arrastrando el pin. Solo se usa desde
 * el loader con ssr:false — Leaflet necesita `window` y truena en SSR.
 */
export function LocationPicker({
  initialLat,
  initialLng,
  onSave,
}: {
  initialLat: number | null;
  initialLng: number | null;
  onSave: (lat: number, lng: number) => Promise<void>;
}) {
  const hasInitial = initialLat != null && initialLng != null;
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    hasInitial ? { lat: initialLat, lng: initialLng } : DEFAULT_MAP_CENTER,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Sin ubicación guardada: centra en la posición actual del navegador si
  // el usuario la comparte (mejor punto de partida que un default fijo).
  useEffect(() => {
    if (hasInitial || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPosition(next);
      mapRef.current?.setView(next, 15);
    });
    // Solo al montar: no se quiere re-centrar si el usuario ya movió el pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave(position.lat, position.lng);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la ubicación",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-64 w-full overflow-hidden rounded-md border border-black/15 dark:border-white/20">
        <MapContainer
          center={position}
          zoom={hasInitial ? 15 : 12}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={position}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPosition({ lat, lng });
              },
            }}
          />
          <ClickToMove onMove={(lat, lng) => setPosition({ lat, lng })} />
        </MapContainer>
      </div>
      <p className="text-xs opacity-60">
        Arrastra el pin (o toca el mapa) hasta la entrada de tu barbería.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar ubicación"}
        </button>
        {saved ? (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Guardado ✓
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
