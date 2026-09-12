/**
 * Geolocalización (T-UX02): "barberías cerca de mí" sin ningún servicio de
 * pagado — el dueño marca su ubicación en un mapa (Leaflet + OpenStreetMap,
 * sin costo ni API key) y la distancia se calcula aquí mismo con la
 * fórmula de Haversine. Nada de esto llama a ninguna API externa.
 */

const EARTH_RADIUS_KM = 6371;

/** Centro por defecto del mapa cuando aún no hay ubicación guardada ni se
 * pudo leer la del navegador (Ciudad de México, coherente con el resto del
 * proyecto). */
export const DEFAULT_MAP_CENTER = { lat: 19.4326, lng: -99.1332 };

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia en línea recta entre dos puntos, en kilómetros. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
