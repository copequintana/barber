import { DateTime } from "luxon";

/**
 * Convenciones de tiempo del sistema:
 *  - La BD guarda instantes en UTC (timestamptz).
 *  - Los horarios de trabajo son "hora de pared" del tenant: weekday (0=domingo)
 *    + minutos desde medianoche local. Sobreviven a cambios de DST.
 *  - La conversión local↔UTC ocurre SOLO en estos helpers.
 */

export const WEEKDAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** "09:30" → 570. Lanza si el formato es inválido. */
export function hhmmToMinutes(hhmm: string): number {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 570 → "09:30" */
export function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * "2026-09-01T10:00" (datetime-local, hora de pared del tenant) → instante UTC.
 * Devuelve null si la fecha es inválida o no existe en esa zona.
 */
export function localInputToUtc(timezone: string, isoLocal: string): Date | null {
  const dt = DateTime.fromISO(isoLocal, { zone: timezone });
  if (!dt.isValid) return null;
  return dt.toUTC().toJSDate();
}

/** Instante UTC → DateTime en la zona del tenant. */
export function utcToZoned(timezone: string, date: Date): DateTime {
  return DateTime.fromJSDate(date, { zone: "utc" }).setZone(timezone);
}

/** Formato corto local: "mar 1 sep, 10:00" */
export function formatZoned(timezone: string, date: Date): string {
  return utcToZoned(timezone, date)
    .setLocale("es")
    .toFormat("ccc d LLL yyyy, HH:mm");
}

/** ¿Se solapan dos rangos [aStart,aEnd) y [bStart,bEnd)? (en minutos o ms) */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
