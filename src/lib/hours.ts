import type { DateTime } from "luxon";
import { minutesToHhmm } from "./time";

export type WeeklyRange = { weekday: number; startMin: number; endMin: number };
export type DayRange = { start: number; end: number };

const SHORT_DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

export function mergeWeek(ranges: WeeklyRange[]): DayRange[][] {
  const week: DayRange[][] = Array.from({ length: 7 }, () => []);
  for (const r of ranges) week[r.weekday]?.push({ start: r.startMin, end: r.endMin });
  return week.map((day) => {
    const merged: DayRange[] = [];
    for (const r of [...day].sort((a, b) => a.start - b.start)) {
      const last = merged[merged.length - 1];
      if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
      else merged.push({ ...r });
    }
    return merged;
  });
}

function hourLabel(minutes: number): string {
  return minutes % 60 === 0 ? String(minutes / 60) : minutesToHhmm(minutes);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function rangesLabel(day: DayRange[]): string {
  return `${joinList(day.map((r) => `${hourLabel(r.start)}–${hourLabel(r.end)}`))} h`;
}

export type HoursLine = { days: string; hours: string };

export function summarizeWeek(week: DayRange[][]): HoursLine[] {
  const lines: { from: number; to: number; key: string }[] = [];
  for (const weekday of MONDAY_FIRST) {
    const day = week[weekday];
    if (day.length === 0) continue;
    const key = rangesLabel(day);
    const last = lines[lines.length - 1];
    const previous = MONDAY_FIRST[MONDAY_FIRST.indexOf(weekday) - 1];
    if (last && last.key === key && last.to === previous) last.to = weekday;
    else lines.push({ from: weekday, to: weekday, key });
  }
  return lines.map(({ from, to, key }) => {
    const span = MONDAY_FIRST.indexOf(to) - MONDAY_FIRST.indexOf(from);
    const days =
      span === 0
        ? SHORT_DAYS[from]
        : span === 1
          ? `${SHORT_DAYS[from]} y ${SHORT_DAYS[to]}`
          : `${SHORT_DAYS[from]} a ${SHORT_DAYS[to]}`;
    return { days: capitalize(days), hours: key };
  });
}

export type OpenStatus = { open: boolean; label: string };

export function openStatus(week: DayRange[][], now: DateTime): OpenStatus | null {
  if (week.every((day) => day.length === 0)) return null;
  const weekday = now.weekday % 7;
  const minute = now.hour * 60 + now.minute;
  const today = week[weekday];

  const current = today.find((r) => r.start <= minute && minute < r.end);
  if (current) return { open: true, label: `Abierto · cierra ${minutesToHhmm(current.end)}` };

  const later = today.find((r) => r.start > minute);
  if (later) return { open: false, label: `Cerrado · abre ${minutesToHhmm(later.start)}` };

  for (let offset = 1; offset <= 7; offset++) {
    const day = week[(weekday + offset) % 7];
    if (day.length === 0) continue;
    const when = offset === 1 ? "mañana" : `el ${SHORT_DAYS[(weekday + offset) % 7]}`;
    return { open: false, label: `Cerrado · abre ${when} ${minutesToHhmm(day[0].start)}` };
  }
  return null;
}

export function shortLocation(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 2 && parts[parts.length - 1].length <= 5) parts.pop();
  return parts.length >= 2 ? parts.slice(-2).join(", ") : (parts[0] ?? null);
}

export function cityName(address: string | null): string | null {
  const location = shortLocation(address);
  if (!location) return null;
  const parts = location.split(",");
  return parts[parts.length - 1].trim();
}
