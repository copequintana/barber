import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  cityName,
  mergeWeek,
  openStatus,
  shortLocation,
  summarizeWeek,
  type WeeklyRange,
} from "@/lib/hours";

const TZ = "America/Mexico_City";
const seedWeek: WeeklyRange[] = [2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, startMin: 600, endMin: 840 },
  { weekday, startMin: 960, endMin: 1200 },
]);

describe("horario de la barbería", () => {
  it("une las franjas de varios barberos", () => {
    const week = mergeWeek([
      { weekday: 1, startMin: 600, endMin: 840 },
      { weekday: 1, startMin: 780, endMin: 900 },
      { weekday: 1, startMin: 960, endMin: 1080 },
    ]);
    expect(week[1]).toEqual([
      { start: 600, end: 900 },
      { start: 960, end: 1080 },
    ]);
  });

  it("resume días seguidos con el mismo horario", () => {
    expect(summarizeWeek(mergeWeek(seedWeek))).toEqual([
      { days: "Mar a sáb", hours: "10–14 y 16–20 h" },
    ]);
  });

  it("separa días con horarios distintos y respeta medias horas", () => {
    const lines = summarizeWeek(
      mergeWeek([
        { weekday: 1, startMin: 570, endMin: 1110 },
        { weekday: 2, startMin: 570, endMin: 1110 },
        { weekday: 6, startMin: 600, endMin: 840 },
        { weekday: 0, startMin: 600, endMin: 780 },
      ]),
    );
    expect(lines).toEqual([
      { days: "Lun y mar", hours: "09:30–18:30 h" },
      { days: "Sáb", hours: "10–14 h" },
      { days: "Dom", hours: "10–13 h" },
    ]);
  });

  it("dice si está abierto y cuándo cierra o abre", () => {
    const week = mergeWeek(seedWeek);
    const at = (iso: string) => openStatus(week, DateTime.fromISO(iso, { zone: TZ }));
    expect(at("2026-10-30T11:00")).toEqual({ open: true, label: "Abierto · cierra 14:00" });
    expect(at("2026-10-30T15:00")).toEqual({ open: false, label: "Cerrado · abre 16:00" });
    expect(at("2026-10-30T21:00")).toEqual({ open: false, label: "Cerrado · abre mañana 10:00" });
    expect(at("2026-10-31T21:00")).toEqual({ open: false, label: "Cerrado · abre el mar 10:00" });
    expect(openStatus(mergeWeek([]), DateTime.now())).toBeNull();
  });
});

describe("ubicación corta", () => {
  it("toma colonia y ciudad, sin el estado", () => {
    const address = "Calle No Reelección 450, Centro, Cd. Obregón, Son.";
    expect(shortLocation(address)).toBe("Centro, Cd. Obregón");
    expect(cityName(address)).toBe("Cd. Obregón");
    expect(shortLocation("Blvd. Kino 1200")).toBe("Blvd. Kino 1200");
    expect(shortLocation(null)).toBeNull();
  });
});
